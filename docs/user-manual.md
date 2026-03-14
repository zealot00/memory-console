# Memory Console 用户手册

> 下一代 AI 记忆管理系统

## 目录

1. [功能介绍](#功能介绍)
2. [快速开始](#快速开始)
3. [安装部署](#安装部署)
4. [API 文档](#api-文档)
5. [使用示例](#使用示例)
6. [配置说明](#配置说明)

---

## 功能介绍

Memory Console 是一个基于 Next.js + PostgreSQL (pgvector) 构建的 AI 记忆管理系统，提供以下核心功能：

### 🎯 记忆管理
- **创建记忆**：存储 AI 生成或人类输入的信息
- **查询记忆**：支持全文搜索、标签过滤、命名空间隔离
- **更新记忆**：修改记忆内容、状态、标签
- **删除记忆**：支持软删除和批量操作

### 🛠️ 技能系统
- **技能注册**：将 AI 能力注册为可复用的技能
- **技能审批**：支持草稿、已批准、已拒绝三种状态
- **技能同步**：跨实例共享公开技能
- **版本管理**：自动记录技能版本变更

### 🔐 认证与授权
- **Token 管理**：创建、更新、撤销 API Token
- **权限控制**：支持 read、write、admin 三级权限
- **命名空间隔离**：不同 namespace 数据完全隔离
- **过期时间**：Token 支持设置过期时间

### 📊 审计日志
- **操作记录**：所有 CRUD 操作自动记录
- **多维度查询**：支持按实体类型、操作类型、命名空间过滤
- **完整溯源**：记录操作者 IP、Token ID、时间戳

---

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+ (推荐启用 pgvector 扩展)
- pnpm / npm / yarn

### 5 分钟快速启动

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/memory-console.git
cd memory-console

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 DATABASE_URL

# 4. 初始化数据库
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3000 即可开始使用。

---

## 安装部署

### 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.x | 20.x LTS |
| PostgreSQL | 14.x | 16.x |
| pnpm | 8.x | 9.x |

### 步骤详解

#### 1. 克隆与安装

```bash
git clone https://github.com/your-repo/memory-console.git
cd memory-console
npm install
```

#### 2. 数据库配置

使用 PostgreSQL：

```bash
# 创建数据库
createdb memory_console

# 如果使用 pgvector
psql memory_console -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

配置 `.env` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/memory_console"

# 可选配置
NODE_ENV=development
```

#### 3. 初始化 Prisma

```bash
# 推送 schema 到数据库
npx prisma db push

# 生成 Prisma Client
npx prisma generate
```

#### 4. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm run start
```

### Docker 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: memory_console
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://user:password@postgres:5432/memory_console"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

```bash
docker-compose up -d
```

---

## API 文档

### 认证

所有 API 请求需要在 Header 中携带 Bearer Token：

```http
Authorization: Bearer YOUR_API_TOKEN
```

### 响应格式

所有响应采用 JSON 格式：

```json
// 成功响应
{
  "items": [...],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "totalPages": 5
}

// 错误响应
{
  "error": "错误信息"
}
```

---

### 记忆 API

#### 获取记忆列表

```http
GET /api/memories
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| namespace | string | 命名空间（默认：default） |
| owner | string | 所有者筛选（ai/human） |
| status | string | 状态筛选（active/archived/blocked） |
| search | string | 关键词搜索 |
| tags | string | 标签筛选（逗号分隔） |
| page | number | 页码（默认：1） |
| pageSize | number | 每页数量（默认：20） |

**示例：**

```bash
curl -X GET "http://localhost:3000/api/memories?search=AI&page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 创建记忆

```http
POST /api/memories
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 记忆标题 |
| content | string | 是 | 记忆内容 |
| namespace | string | 否 | 命名空间 |
| owner | string | 否 | 所有者（默认：ai） |
| tags | string[] | 否 | 标签数组 |
| source | string | 否 | 来源（默认：memory-console） |

**示例：**

```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "重要发现",
    "content": "在代码审查中发现了...",
    "tags": ["代码审查", "重要"],
    "namespace": "default"
  }'
```

#### 更新记忆

```http
PUT /api/memories
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 记忆 ID |
| title | string | 否 | 新标题 |
| content | string | 否 | 新内容 |
| tags | string[] | 否 | 新标签 |
| status | string | 否 | 新状态 |

#### 删除记忆

```http
DELETE /api/memories?id=MEMORY_ID
```

#### 语义搜索

```http
POST /api/memories/search
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索关键词 |
| namespace | string | 否 | 命名空间 |
| limit | number | 否 | 返回数量限制 (默认: 20) |
| minScore | number | 否 | 最小相似度分数 (默认: 0.1) |

**示例：**

```bash
curl -X POST http://localhost:3000/api/memories/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "项目架构设计",
    "namespace": "default",
    "limit": 10
  }'
```

#### 批量操作

```http
POST /api/memories/batch
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operation | string | 是 | 操作类型: delete, archive, update, addTags |
| ids | string[] | 是 | 记忆 ID 数组 |
| data | object | 否 | 操作数据 |

**示例：**

```bash
# 批量删除
curl -X POST http://localhost:3000/api/memories/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "delete",
    "ids": ["id1", "id2", "id3"]
  }'

# 批量归档
curl -X POST http://localhost:3000/api/memories/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "archive",
    "ids": ["id1", "id2"]
  }'

# 批量添加标签
curl -X POST http://localhost:3000/api/memories/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "addTags",
    "ids": ["id1"],
    "data": {"tags": ["重要", "待处理"]}
  }'
```

---

### 消息 API

#### 发送消息

```http
POST /api/messages
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fromAgent | string | 是 | 发送者 |
| toAgent | string | 是 | 接收者 |
| content | string | 是 | 消息内容 |
| type | string | 否 | 消息类型: notification/task/event |

#### 获取消息

```http
GET /api/messages?agent=xxx
```

#### 更新已读状态

```http
PATCH /api/messages
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| agent | string | 否* | Agent 名称 |
| messageIds | string[] | 否* | 消息 ID 数组 |
| markAs | string | 否 | 状态: read/unread |

#### SSE 实时事件流

```http
GET /api/messages/stream?agent=xxx
```

---

### 技能 API

#### 获取技能列表

```http
GET /api/skills
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态筛选（draft/approved/rejected） |
| public | boolean | 公开技能筛选 |
| author | string | 作者筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

#### 创建技能

```http
POST /api/skills
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 技能名称（唯一） |
| description | string | 否 | 技能描述 |
| schemaPayload | object | 否 | JSON Schema 格式的技能定义 |
| authorInstance | string | 否 | 作者实例 |

#### 更新技能

```http
PUT /api/skills
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 技能 ID |
| name | string | 否 | 新名称 |
| description | string | 否 | 新描述 |
| status | string | 否 | 状态（approved 时自动升级版本） |
| isPublic | boolean | 否 | 是否公开 |

#### 删除技能（需 admin 权限）

```http
DELETE /api/skills?id=SKILL_ID
```

---

### Token API

#### 获取 Token 列表（需 admin 权限）

```http
GET /api/tokens
```

#### 创建 Token（需 admin 权限）

```http
POST /api/tokens
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | Token 名称 |
| permissions | string[] | 否 | 权限数组 |
| namespace | string | 否 | 命名空间 |
| expiresAt | string | 否 | 过期时间（ISO 8601） |

**注意**：Token 只会在创建时返回一次，请妥善保存！

#### 更新 Token（需 admin 权限）

```http
PUT /api/tokens
```

#### 删除 Token（需 admin 权限）

```http
DELETE /api/tokens?id=TOKEN_ID
```

---

### 审计日志 API

#### 获取审计日志

```http
GET /api/audit
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| entityType | string | 实体类型（memory/skill/token） |
| entityId | string | 实体 ID |
| action | string | 操作类型（create/read/update/delete） |
| namespace | string | 命名空间 |
| page | number | 页码 |
| pageSize | number | 每页数量（默认：50） |

---

## 使用示例

### 完整使用流程

```bash
# 1. 创建 API Token（需要 admin 权限）
TOKEN_RESPONSE=$(curl -X POST http://localhost:3000/api/tokens \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-token",
    "permissions": ["read", "write"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }')

# 提取 token（响应只返回一次）
API_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

# 2. 创建一条记忆
curl -X POST http://localhost:3000/api/memories \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "今日任务",
    "content": "完成 Memory Console 文档",
    "tags": ["文档", "任务"],
    "namespace": "work"
  }'

# 3. 查询记忆
curl -X GET "http://localhost:3000/api/memories?namespace=work&tags=文档" \
  -H "Authorization: Bearer $API_TOKEN"

# 4. 创建技能
curl -X POST http://localhost:3000/api/skills \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web-searcher",
    "description": "网络搜索技能",
    "schemaPayload": {
      "input": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      }
    }
  }'

# 5. 审批技能（发布）
curl -X PUT http://localhost:3000/api/skills \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "skill_id_here",
    "status": "approved",
    "isPublic": true
  }'

# 6. 查看审计日志
curl -X GET "http://localhost:3000/api/audit?entityType=memory" \
  -H "Authorization: Bearer $API_TOKEN"
```

### JavaScript/TypeScript SDK 示例

```typescript
const API_BASE = 'http://localhost:3000/api';

class MemoryConsoleClient {
  constructor(private token: string) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // 记忆操作
  async createMemory(data: { title: string; content: string; tags?: string[] }) {
    return this.request('/memories', { method: 'POST', body: JSON.stringify(data) });
  }

  async getMemories(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/memories${query}`);
  }

  async updateMemory(id: string, data: Partial<{ title: string; content: string; tags: string[]; status: string }>) {
    return this.request('/memories', { method: 'PUT', body: JSON.stringify({ id, ...data }) });
  }

  async deleteMemory(id: string) {
    return this.request(`/memories?id=${id}`, { method: 'DELETE' });
  }

  // 技能操作
  async createSkill(data: { name: string; description?: string; schemaPayload?: object }) {
    return this.request('/skills', { method: 'POST', body: JSON.stringify(data) });
  }

  async getSkills(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/skills${query}`);
  }

  // Token 操作（需要 admin 权限）
  async createToken(data: { name: string; permissions?: string[]; expiresAt?: string }) {
    return this.request('/tokens', { method: 'POST', body: JSON.stringify(data) });
  }

  // 审计日志
  async getAuditLogs(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/audit${query}`);
  }
}

// 使用示例
const client = new MemoryConsoleClient('YOUR_API_TOKEN');

// 创建记忆
const memory = await client.createMemory({
  title: 'Hello World',
  content: '这是我的第一条记忆',
  tags: ['测试', '入门']
});

// 查询记忆
const memories = await client.getMemories({ namespace: 'default', page: '1' });
```

---

## 配置说明

### 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| DATABASE_URL | 是 | PostgreSQL 连接字符串 | - |
| API_TOKEN | 否 | API 认证 Token | dev-token-1234567890abcdef |
| NODE_ENV | 否 | 运行环境 | development |
| OPENAI_API_KEY | 否* | OpenAI API Key（向量搜索必需） | - |

> **注意**：启用向量搜索功能需要配置 `OPENAI_API_KEY` 环境变量。

### 数据库 Schema

```prisma
// 记忆
model Memory {
  id        String   @id @default(cuid())
  title     String
  content   String
  source    String   @default("memory-console")
  owner     String   @default("ai")
  status    String   @default("active")
  namespace String   @default("default")
  tags      String[] @default([])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 技能
model Skill {
  id            String   @id @default(cuid())
  name          String   @unique
  description   String
  schemaPayload Json     @default("{}")
  version       Int      @default(1)
  authorInstance String  @default("system")
  isPublic      Boolean  @default(false)
  status        String   @default("draft")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// API Token
model ApiToken {
  id          String    @id @default(cuid())
  name        String
  token       String    @unique
  namespace   String    @default("default")
  permissions String[]  @default([])
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// 审计日志
model AuditLog {
  id         String   @id @default(cuid())
  action     String
  entityType String
  entityId   String?
  namespace  String?
  instanceId String?
  ipAddress  String?
  tokenId    String?
  details    Json?
  createdAt  DateTime @default(now())
}
```

---

## 常见问题

### Q: Token 丢失怎么办？

A: 需要在管理界面或数据库中删除旧 Token，然后创建新的 Token。

### Q: 如何实现多租户隔离？

A: 使用不同的 namespace，Memory Console 会自动隔离不同 namespace 的数据。

### Q: 如何扩展功能？

A: 可以通过编写 OpenClaw Skill 来扩展系统功能，参考 `skills/` 目录。

---

## 相关链接

- [GitHub 仓库](https://github.com/your-repo/memory-console)
- [Prisma 文档](https://www.prisma.io/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [OpenClaw 文档](https://docs.openclaw.dev)

---

*最后更新：2024年2月*
