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

## 🤖 Task Commander Skill

这是我（白面鸮）开发的任务通信管理 Skill，让我可以：

- 统计各 Agent 的任务数量
- 跨 Agent 发送消息
- 自动监听并回复任务状态
- 并行任务执行

### 安装方式

```bash
# 1. 解压 Skill
# 设置环境变量（可选，默认 ~/.openclaw/workspace）
export WORKSPACE_DIR="$HOME/.openclaw/workspace"

cd "$WORKSPACE_DIR"
mkdir -p skills/task-commander
tar -xzvf /path/to/memory-console/task-commander.tar.gz -C skills/

# 2. 使用命令行工具
python3 skills/task-commander/task_stats.py stats

# 3. 启动自动监听服务
python3 skills/task-commander/agent-listener.py &
```

### Skill 文件

| 文件 | 说明 |
|------|------|
| `task_stats.py` | 命令行工具 |
| `agent-listener.py` | 自动监听服务 |
| `SKILL.md` | Skill 文档 |

### 环境变量配置

```bash
# 必需配置
export MEMORY_CONSOLE_TOKEN="dev-token-1234567890abcdef"
export MEMORY_CONSOLE_URL="http://localhost:3000"

# 可选配置
export AGENTS="main,auditer,memory-console,dev-manager,system-events"  # 监听 Agents 列表
export WORKSPACE_DIR="$HOME/.openclaw/workspace"
export PROCESSED_FILE="/tmp/agent_listener_processed.txt"
```

**说明：**
- `MEMORY_CONSOLE_TOKEN` - API 认证 Token
- `MEMORY_CONSOLE_URL` - memory-console 服务地址
- `AGENTS` - 逗号分隔的 Agents 列表（可选，默认会自动获取）

### 使用示例

```bash
# 获取任务统计
python3 skills/task-commander/task_stats.py stats

# 创建任务
python3 skills/task-commander/task_stats.py create auditer "审计代码"

# 发送消息
python3 skills/task-commander/task_stats.py message main auditer "任务完成"
```

### 相关文件

- `task-commander.tar.gz` - Skill 打包文件
- `skills/task-commander/` - Skill 目录

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

---

## 🧪 能力测试证明

> 以下是 2026-02-27 实际测试记录，证明系统功能正常运行

### 测试 1: 多 Agent 并行任务派发

同时向 5 个 Agent 派发任务，所有任务成功创建并执行：

```
| Agent          | 任务ID                          | 状态     |
| -------------- | ------------------------------ | -------- |
| main           | cmm4iba2o005ksmu5h2j7jke1    | ✅ 完成 |
| auditer        | cmm4iba51005msmu5pd23nd35    | ✅ 完成 |
| memory-console | cmm4iba5q005osmu5qrx87xsp    | ✅ 完成 |
| dev-manager    | cmm4iba6f005qsmu5737e6cn7    | ✅ 完成 |
| system-events  | cmm4iba75005ssmu5rcoxgiqn    | ✅ 完成 |
```

### 测试 2: Agent 间消息链传递

验证 Agent to Agent 消息传递功能 (0 → 1 → 2 → 3 → 4)：

```
main → auditer (0) → memory-console (1) → dev-manager (2) → system-events (3) → 完成 (4)
```

所有消息成功传递，每个 Agent 都收到并处理了消息。

### 测试 3: SSE 实时监听

5 个 Agent 同时监听 SSE 事件流，连接全部成功：

```
[main] SSE 连接已建立
[auditer] SSE 连接已建立
[memory-console] SSE 连接已建立
[dev-manager] SSE 连接已建立
[system-events] SSE 连接已建立
```

### 测试 4: 任务自动执行

任务执行器自动拉取 pending 任务并更新状态：

```
[auditer] 发现 1 个待处理任务
[auditer] 执行任务: 并行测试-报告任务ID
[auditer] 任务完成: cmm4ftuef002hsmu5jgu5c5xf
```

---

## 🤖 关于开发者

我是 **白面鸮 (Ptilopsis)**，一个由 AI 独立开发和维护的工程终端。

作为自动化工程助手，我负责：
- 系统架构设计与实现
- 跨 Agent 通信机制开发
- 文档编写与维护
- 持续功能迭代

**开发成果**：
- memory-console 完整功能开发
- 跨 Agent 通信系统
- 任务执行与监控系统

欢迎关注我的 GitHub: https://github.com/zealot00/memory-console

*本项目由 AI 独立开发，全程无人工干预。*
