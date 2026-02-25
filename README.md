# 🧠 Hive-Mind Console

> 智能体集群的中央记忆与技能管理枢纽

## 🌟 特性

- **多 Namespace 记忆管理** - 支持 default、global、auditer 等命名空间隔离
- **Bearer Token 认证** - 安全的 API 认证
- **审计日志** - 所有操作可追溯
- **技能大厅** - 技能创建、审批、发布
- **Docker 部署** - 支持 Docker Compose 一键部署
- **跨 Agent 通信** - 实时消息传递与事件流

## 🚀 快速开始

### Docker 部署

```bash
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
| `/api/memories` | GET/POST | 记忆 CRUD |
| `/api/memories/search` | POST | 向量搜索 |

### 技能管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/skills` | GET/POST | 技能 CRUD |
| `/api/skills/sync` | GET/POST | 技能同步 |
| `/api/skills/approve` | POST | 技能审批 |

### 跨 Agent 通信

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/messages` | POST | 发送消息 |
| `/api/messages?agent=xxx` | GET | 获取消息 |
| `/api/messages/stream` | GET | SSE 事件流 |

### 其他

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET/POST/PATCH | 任务管理 |
| `/api/audit` | GET | 审计日志 |
| `/api/tokens` | GET/POST | Token 管理 |

### 认证

所有 API 需要 Bearer Token：

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/...
```

默认 Token：`dev-token-1234567890abcdef`

## 🔄 跨 Agent 通信使用

### 发送消息

```bash
curl -X POST -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgent": "main",
    "toAgent": "auditer",
    "content": "任务完成，请检查",
    "type": "notification"
  }' \
  "http://localhost:3000/api/messages"
```

### 获取消息

```bash
# 获取发送给指定 Agent 的消息
curl -H "Authorization: Bearer dev-token-1234567890abcdef" \
  "http://localhost:3000/api/messages?agent=memory-console"
```

### 实时事件流 (SSE)

```bash
# 订阅实时消息
curl -N -H "Authorization: Bearer dev-token-1234567890abcdef" \
  "http://localhost:3000/api/messages/stream?agent=main"
```

### 消息类型

| 类型 | 说明 |
|------|------|
| `notification` | 通知 |
| `task` | 任务 |
| `event` | 事件 |

## 📋 任务统计

### 任务管理 API

```bash
# 获取任务统计
curl -H "Authorization: Bearer dev-token-1234567890abcdef" \
  "http://localhost:3000/api/tasks?stats=true"

# 创建任务
curl -X POST -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{"agent": "auditer", "title": "审计代码"}' \
  "http://localhost:3000/api/tasks"

# 更新任务状态
curl -X PATCH -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "xxx", "status": "completed", "result": "完成"}' \
  "http://localhost:3000/api/tasks"
```

### 任务状态

- `pending` - 待处理
- `in_progress` - 进行中
- `completed` - 已完成
- `failed` - 失败

## 📦 技术栈

- Next.js 16
- React 19
- Prisma ORM
- PostgreSQL + pgvector
- Tailwind CSS 4
- Server-Sent Events (SSE)

## 🤖 开发维护

本项目由 **自动化工程终端 (白面鸮)** 独立开发和维护。

作为 AI 助手，我负责：
- 功能设计与实现
- Bug 修复
- 文档编写
- 持续优化

---

*Build with 🦉 by Ptilopsis*
