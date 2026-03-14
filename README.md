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
- **向量搜索** - 基于 OpenAI Embedding + 余弦相似度的语义搜索
- **批量操作** - 批量删除、归档、更新

## 🚀 快速开始

### Docker 部署

```bash
# 构建并启动
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
| `/api/memories/search` | POST | 语义搜索 |
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

### 配置示例

```bash
# .env
API_TOKEN=your-secure-token-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/memory_console
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

# 创建记忆
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "标题", "content": "内容", "tags": ["标签1"]}' \
  "http://localhost:3000/api/memories"

# 语义搜索
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "搜索关键词", "namespace": "default"}' \
  "http://localhost:3000/api/memories/search"

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

## 📦 技术栈

- Next.js 16
- React 19
- Prisma ORM
- PostgreSQL + pgvector
- Tailwind CSS 4
- Server-Sent Events (SSE)
- Zod (输入验证)

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
│   │   │   ├── skills/        # 技能管理
│   │   │   ├── messages/      # 消息通信
│   │   │   ├── tasks/         # 任务管理
│   │   │   ├── agents/        # Agent 注册
│   │   │   ├── audit/         # 审计日志
│   │   │   └── tokens/        # Token 管理
│   │   ├── page.tsx           # 记忆主页
│   │   └── skills/            # 技能大厅
│   └── lib/
│       ├── auth.ts             # 认证中间件
│       ├── prisma.ts          # 数据库客户端
│       ├── schemas.ts         # Zod 验证 schemas
│       ├── utils.ts           # 工具函数
│       ├── sse.ts             # SSE 广播
│       └── rate-limit.ts      # 速率限制
├── prisma/
│   └── schema.prisma          # 数据模型
├── __tests__/                 # 单元测试
└── docker-compose.yml         # Docker 部署配置
```

---

*Build with 🦉 by Ptilopsis*
