# 向量搜索功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现真正的基于向量相似度的语义搜索功能，支持 OpenAI Embedding API 生成向量，使用 pgvector 进行相似度查询。

**Architecture:** 
1. Memory model 添加 embedding 字段存储向量
2. 创建记忆时自动调用 OpenAI API 生成 embedding
3. 搜索时使用 pgvector 的余弦相似度 (`<=>`) 进行查询
4. 支持混合搜索：向量相似度 + 关键词匹配

**Tech Stack:**
- Prisma + pgvector
- OpenAI API (text-embedding-3-small)
- 环境变量: `OPENAI_API_KEY`

---

## Task 1: 更新 Prisma Schema 添加 embedding 字段

**Files:**
- Modify: `prisma/schema.prisma:15-31` (Memory model)

**Step 1: 添加 embedding 字段到 Memory model**

```prisma
model Memory {
  id          String   @id @default(cuid())
  title       String
  content     String   @db.Text
  source      String   @default("memory-console")
  owner       String   @default("ai")
  status      String   @default("active")
  namespace   String   @default("default")
  tags        String[] @default([])
  embedding   Float[]  @default([])  // 新增：向量字段
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([namespace])
  @@index([owner])
  @@index([status])
  @@index([createdAt])
}
```

**Step 2: 运行 Prisma generate**

```bash
npx prisma generate
```

**Step 3: 提交**

```bash
git add prisma/schema.prisma
git commit -m "feat: add embedding field to Memory model"
```

---

## Task 2: 创建 Embedding 服务模块

**Files:**
- Create: `src/lib/embedding.ts`

**Step 1: 创建 embedding 服务**

```typescript
// src/lib/embedding.ts
import { z } from 'zod';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
});

function getEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    throw new Error(`Missing required environment variable: ${error}`);
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { OPENAI_API_KEY } = getEnv();
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.substring(0, 8000), // 截断超长文本
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Step 2: 提交**

```bash
git add src/lib/embedding.ts
git commit -m "feat: add embedding service module"
```

---

## Task 3: 更新创建记忆 API 自动生成 embedding

**Files:**
- Modify: `src/app/api/memories/route.ts`

**Step 1: 导入 embedding 服务**

在文件顶部添加：
```typescript
import { generateEmbedding } from '@/lib/embedding';
```

**Step 2: 修改 POST 方法创建记忆时生成 embedding**

找到 `// POST /api/memories` 中的创建逻辑，在 `prisma.memory.create` 前添加：

```typescript
// 生成 embedding
const textToEmbed = `${title} ${content} ${tags.join(' ')}`;
let embedding: number[] = [];
try {
  embedding = await generateEmbedding(textToEmbed);
} catch (error) {
  console.error('Failed to generate embedding:', error);
  // 继续创建记忆，不强制要求 embedding
}

const memory = await prisma.memory.create({
  data: {
    title,
    content,
    source: source || 'memory-console',
    owner: owner || 'ai',
    namespace: searchNamespace,
    tags: tags || [],
    embedding, // 存储向量
  },
});
```

**Step 3: 提交**

```bash
git add src/app/api/memories/route.ts
git commit -m "feat: auto-generate embedding when creating memory"
```

---

## Task 4: 实现向量搜索 API

**Files:**
- Modify: `src/app/api/memories/search/route.ts`

**Step 1: 更新搜索路由使用向量相似度**

重写 `POST` 方法：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withReadAuth, logAudit } from "@/lib/auth";
import { generateEmbedding, cosineSimilarity } from "@/lib/embedding";
import { getClientIP } from "@/lib/utils";

const MAX_SEARCH_RESULTS = 20;

export async function POST(request: NextRequest) {
  return withReadAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const { query, namespace, limit = MAX_SEARCH_RESULTS, minScore = 0.1 } = body;

      if (!query || typeof query !== "string") {
        return NextResponse.json(
          { error: "Search query is required" },
          { status: 400 }
        );
      }

      const searchNamespace = namespace || auth.namespace;

      // 生成查询向量
      let queryEmbedding: number[];
      try {
        queryEmbedding = await generateEmbedding(query);
      } catch (error) {
        console.error('Failed to generate query embedding:', error);
        return NextResponse.json(
          { error: "Failed to generate search embedding" },
          { status: 500 }
        );
      }

      // 获取该 namespace 下的所有记忆
      const memories = await prisma.memory.findMany({
        where: {
          namespace: searchNamespace,
          status: "active",
        },
        take: 100,
      });

      // 计算相似度并排序
      const results = memories
        .map(memory => ({
          ...memory,
          score: memory.embedding?.length 
            ? cosineSimilarity(queryEmbedding, memory.embedding)
            : 0,
        }))
        .filter(r => r.score >= Number(minScore))
        .sort((a, b) => b.score - a.score)
        .slice(0, Number(limit));

      await logAudit(
        "search",
        "memory",
        undefined,
        searchNamespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { query, resultsCount: results.length }
      );

      return NextResponse.json({
        items: results.map(r => ({
          id: r.id,
          title: r.title,
          content: r.content,
          namespace: r.namespace,
          tags: r.tags,
          score: r.score,
        })),
        total: results.length,
        query,
      });
    } catch (error) {
      console.error("Error searching memories:", error);
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }
  })(request);
}
```

**Step 2: 提交**

```bash
git add src/app/api/memories/search/route.ts
git commit -m "feat: implement vector-based semantic search"
```

---

## Task 5: 添加环境变量配置

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`

**Step 1: 更新 .env.example**

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memory_console

# API Token
API_TOKEN=your-secure-token-here

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...
```

**Step 2: 更新 docker-compose.yml 添加环境变量**

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - API_TOKEN=${API_TOKEN:-dev-token-1234567890abcdef}
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/memory_console
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}  # 新增
```

**Step 3: 提交**

```bash
git add .env.example docker-compose.yml
git commit -m "feat: add OPENAI_API_KEY environment variable"
```

---

## Task 6: 编写向量搜索测试

**Files:**
- Modify: `__tests__/api/memories-search.test.ts`

**Step 1: 添加向量搜索测试**

```typescript
describe('vector search', () => {
  it('should use cosine similarity for ranking', async () => {
    const mockMemories = [
      { id: 'mem-1', title: 'AI Machine Learning', content: 'Content', tags: [], embedding: [0.9, 0.1, 0.2] },
      { id: 'mem-2', title: 'Cooking Recipes', content: 'Content', tags: [], embedding: [0.1, 0.9, 0.3] },
    ];

    (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue(mockMemories);

    const request = createMockRequest({
      method: 'POST',
      body: { query: 'artificial intelligence', namespace: 'test-ns' },
    });

    const response = await searchPOST(request);
    const data = await response.json();

    expect(data.items[0].score).toBeGreaterThan(data.items[1].score);
  });
});
```

**Step 2: 提交**

```bash
git add __tests__/api/memories-search.test.ts
git commit -m "test: add vector search tests"
```

---

## Task 7: 更新文档

**Files:**
- Modify: `README.md`
- Modify: `docs/user-manual.md`

**Step 1: 更新 README.md**

在特性列表中添加：
```markdown
- **向量搜索** - 基于 OpenAI Embedding + pgvector 的语义搜索
```

**Step 2: 更新 user-manual.md**

在搜索 API 部分说明使用了向量相似度。

**Step 3: 提交**

```bash
git add README.md docs/user-manual.md
git commit -m "docs: update documentation for vector search"
```

---

## 总结

完成所有任务后，提交最终合并：

```bash
git commit --allow-empty -m "feat: complete vector search implementation"
git push
```

**预期结果：**
- Memory 创建时自动生成 embedding 向量
- 搜索 API 使用余弦相似度进行语义匹配
- 支持环境变量配置 OpenAI API Key
- 所有测试通过
