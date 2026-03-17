# 🧠 Hive-Mind Console

> 智能体集群的中央记忆与技能管理枢纽

## 🌟 特性

- **多 Namespace 记忆管理** - 支持命名空间隔离
- **Bearer Token 认证** - 安全的 API 认证
- **审计日志** - 所有操作可追溯
- **技能大厅** - 技能创建、审批、发布
- **Docker 部署** - 支持 Docker Compose 一键部署
- **跨 Agent 通信** - 实时消息传递与事件流 (SSE)
- **语义搜索** - 支持相似度匹配搜索
- **向量搜索** - 基于 pgvector + Embedding 的语义搜索
- **混合搜索** - 融合关键词与向量搜索的最优结果
- **批量操作** - 批量删除、归档、更新

## 🚀 快速开始

### Docker 部署

```bash
# 构建并启动（包含 Ollama 向量服务）
docker-compose build
docker-compose up -d
```

访问 http://localhost:3000

### 本地开发

```bash
npm install
npm run dev
```

## 📡 API

### 记忆管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/memories` | GET/POST/PUT/DELETE | 记忆 CRUD |
| `/api/memories/search` | POST | 语义搜索（支持三种模式） |
| `/api/memories/batch` | POST | 批量操作 |

### 技能管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/skills` | GET/POST/PUT/DELETE | 技能 CRUD |
| `/api/skills/sync` | GET/POST | 技能同步 |

### 跨 Agent 通信

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/messages` | POST | 发送消息 |
| `/api/messages` | GET | 获取消息 |
| `/api/messages` | PATCH | 更新已读状态 |
| `/api/messages/stream` | GET | SSE 事件流 |

### Agent 与任务

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agents` | GET/POST/PATCH/DELETE | Agent 注册管理 |
| `/api/tasks` | GET/POST/PATCH | 任务管理 |

### 系统

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/audit` | GET | 审计日志 |
| `/api/tokens` | GET/POST/PUT/DELETE | Token 管理 |

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_TOKEN` | API 认证 Token | dev-token-1234567890abcdef |
| `DATABASE_URL` | PostgreSQL 连接字符串 | postgresql://postgres:postgres@localhost:5432/memory_console |
| `NODE_ENV` | 运行环境 | development |
| `OPENAI_API_KEY` | OpenAI API Key（用于 embedding） | - |
| `OLLAMA_HOST` | Ollama 服务地址 | http://ollama:11434 |
| `OLLAMA_MODEL` | Ollama embedding 模型 | bge-m3 |

### 配置示例

```bash
# .env - 使用 OpenAI embedding
API_TOKEN=your-secure-token-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/memory_console
OPENAI_API_KEY=sk-...

# .env - 使用本地 Ollama
API_TOKEN=your-secure-token-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/memory_console
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=bge-m3
```

## 🔐 认证

所有 API 需要 Bearer Token：

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/...
```

默认 Token：`dev-token-1234567890abcdef` (可通过环境变量 API_TOKEN 修改)

## 📖 API 详细使用

### 记忆管理

```bash
# 获取记忆列表
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/memories?namespace=default"

# 创建记忆（自动生成 embedding）
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "标题", "content": "内容", "tags": ["标签1"]}' \
  "http://localhost:3000/api/memories"
```

### 语义搜索（三种模式）

#### 1. 向量搜索（默认）

```bash
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "搜索关键词",
    "namespace": "default",
    "mode": "vector",
    "limit": 20,
    "minScore": 0.1
  }' \
  "http://localhost:3000/api/memories/search"
```

#### 2. 关键词搜索

```bash
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "搜索关键词",
    "namespace": "default",
    "mode": "keyword"
  }' \
  "http://localhost:3000/api/memories/search"
```

#### 3. 混合搜索

```bash
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "搜索关键词",
    "namespace": "default",
    "mode": "hybrid",
    "keywordWeight": 0.3,
    "vectorWeight": 0.7
  }' \
  "http://localhost:3000/api/memories/search"
```

**搜索参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `query` | string | 搜索关键词（必填） |
| `namespace` | string | 命名空间，默认使用 token 对应的 namespace |
| `mode` | string | 搜索模式：`keyword` / `vector` / `hybrid` |
| `limit` | number | 返回结果数量，默认 20 |
| `minScore` | number | 最小相似度分数，默认 0.1 |
| `keywordWeight` | number | 关键词权重（hybrid 模式） |
| `vectorWeight` | number | 向量权重（hybrid 模式） |

### 批量操作

```bash
# 批量删除
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"operation": "delete", "ids": ["id1", "id2"]}' \
  "http://localhost:3000/api/memories/batch"

# 批量归档
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"operation": "archive", "ids": ["id1", "id2"]}' \
  "http://localhost:3000/api/memories/batch"
```

### 跨 Agent 通信

```bash
# 发送消息
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgent": "main",
    "toAgent": "auditer",
    "content": "任务完成，请检查",
    "type": "notification"
  }' \
  "http://localhost:3000/api/messages"

# 获取消息
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/messages?agent=auditer"

# 标记消息为已读
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"agent": "auditer", "markAs": "read"}' \
  "http://localhost:3000/api/messages"

# SSE 实时事件流
curl -N -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/messages/stream?agent=main"
```

### 消息类型

| 类型 | 说明 |
|------|------|
| `notification` | 通知 |
| `task` | 任务 |
| `event` | 事件 |

### 任务管理

```bash
# 获取任务统计
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/tasks?stats=true"

# 创建任务
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"agent": "auditer", "title": "审计代码"}' \
  "http://localhost:3000/api/tasks"

# 更新任务状态
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "xxx", "status": "completed", "result": "完成"}' \
  "http://localhost:3000/api/tasks"
```

### 任务状态

- `pending` - 待处理
- `in_progress` - 进行中
- `completed` - 已完成
- `failed` - 失败

## 🤖 Task Commander Skill

任务通信管理 Skill，支持：
- 统计各 Agent 的任务数量
- 跨 Agent 发送消息
- 自动监听并回复任务状态

### 环境变量配置

```bash
# 必需配置
export MEMORY_CONSOLE_TOKEN="dev-token-1234567890abcdef"
export MEMORY_CONSOLE_URL="http://localhost:3000"

# 可选配置
export AGENTS="main,auditer,memory-console,dev-manager,system-events"
```

### 使用示例

```bash
# 获取任务统计
python3 skills/task-commander/task_stats.py stats

# 创建任务
python3 skills/task-commander/task_stats.py create auditer "审计代码"

# 发送消息
python3 skills/task-commander/task_stats.py message main auditer "任务完成"
```

## 🛠️ 配套工具

### Memory Query Skill

查询 memory-console 记忆的命令行工具。

```bash
# 使用
python3 skills/memory-query/query.py "搜索关键词"

# 环境变量
export MEMORY_CONSOLE_URL=http://localhost:3000
export MEMORY_CONSOLE_TOKEN=your-token-here
```

## 🔍 向量搜索技术细节

### Embedding 生成

系统支持两种 Embedding 提供商：

1. **OpenAI** (默认)
   - 模型：`text-embedding-3-small`
   - 维度：1536
   - 环境变量：`OPENAI_API_KEY`

2. **Ollama** (本地部署)
   - 推荐模型：`bge-m3` (多语言支持)
   - 环境变量：`OLLAMA_HOST`, `OLLAMA_MODEL`
   - 自动检测：设置 `OLLAMA_HOST` 后自动启用

### 搜索算法

- **向量搜索**：使用 pgvector 的余弦距离 (`<=>`) 进行相似度匹配
- **关键词搜索**：PostgreSQL `ILIKE` 全文匹配
- **混合搜索**：加权融合向量分数和关键词分数

```sql
-- 混合搜索 SQL 示例
SELECT 
  id, title, content,
  (embedding <=> $query_vector) AS vectorScore,
  CASE 
    WHEN title ILIKE $keyword OR content ILIKE $keyword THEN 1.0
    ELSE 0.0
  END AS keywordScore
FROM "Memory"
WHERE namespace = $ns AND status = 'active'
ORDER BY vectorScore * 0.7 + keywordScore * 0.3
```

### Fallback 机制

当 pgvector 查询失败时（如向量索引未创建），系统会自动降级到内存计算模式，确保服务可用性。

## 📦 技术栈

- Next.js 16
- React 19
- Prisma ORM
- PostgreSQL + pgvector
- Tailwind CSS 4
- Server-Sent Events (SSE)
- Zod (输入验证)
- Ollama (本地 embedding)
- OpenAI API (可选)

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行测试并查看覆盖率
npm run test:coverage

# 运行 lint
npm run lint
```

## 📁 项目结构

```
memory-console/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── memories/      # 记忆管理
│   │   │   │   ├── route.ts  # CRUD 操作
│   │   │   │   └── search/   # 搜索 API
│   │   │   ├── skills/       # 技能管理
│   │   │   ├── messages/     # 消息通信
│   │   │   ├── tasks/       # 任务管理
│   │   │   ├── agents/      # Agent 注册
│   │   │   ├── audit/       # 审计日志
│   │   │   └── tokens/      # Token 管理
│   │   ├── page.tsx         # 记忆主页
│   │   └── skills/          # 技能大厅
│   └── lib/
│       ├── auth.ts          # 认证中间件
│       ├── prisma.ts        # 数据库客户端
│       ├── embedding.ts     # Embedding 生成服务
│       ├── schemas.ts       # Zod 验证 schemas
│       ├── utils.ts         # 工具函数
│       ├── sse.ts           # SSE 广播
│       └── rate-limit.ts    # 速率限制
├── prisma/
│   └── schema.prisma        # 数据模型
├── __tests__/               # 单元测试
├── docker-compose.yml       # Docker 部署配置
└── skills/                  # 配套 CLI 工具
```

## 📖 更多文档

- [部署指南](./docs/DEPLOYMENT.md)
- [用户手册](./docs/user-manual.md)
- [测试报告](./docs/TEST_REPORT.md)

---

*Build with 🦉 by Ptilopsis*
