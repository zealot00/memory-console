# task-commander

> Agent 任务通信与统计管理 Skill

## 功能

- 任务统计与上报
- 跨 Agent 消息通信
- 自动消息监听与回复
- 定时任务上报

## 核心功能

### 1. 任务管理 API

```bash
# 获取任务统计
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/tasks?stats=true"

# 创建任务
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -d '{"agent": "auditer", "title": "任务标题"}' \
  "http://localhost:3000/api/tasks"

# 更新任务状态
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  -d '{"taskId": "xxx", "status": "completed"}' \
  "http://localhost:3000/api/tasks"
```

### 2. 消息通信 API

```bash
# 发送消息
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -d '{"fromAgent": "main", "toAgent": "auditer", "content": "消息内容"}' \
  "http://localhost:3000/api/messages"

# 获取消息
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/messages?agent=auditer"
```

### 3. SSE 实时监听

```bash
# 订阅实时消息流
curl -N -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/messages/stream?agent=auditer"
```

## 配置

### 环境变量

```bash
MEMORY_CONSOLE_URL=http://localhost:3000
MEMORY_CONSOLE_TOKEN=dev-token-1234567890abcdef
```

### 支持的 Agent

- main
- auditer
- memory-console
- dev-manager
- system-events

### 任务状态

| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| in_progress | 进行中 |
| completed | 已完成 |
| failed | 失败 |

### 消息类型

| 类型 | 说明 |
|------|------|
| notification | 通知 |
| task | 任务 |
| event | 事件 |

## 自动监听服务

### 启动监听

```bash
# 使用环境变量（可选）
export WORKSPACE_DIR="$HOME/.openclaw/workspace"
python3 "$WORKSPACE_DIR/agent-listener.py &

# 或直接运行
python3 skills/task-commander/agent-listener.py &
```

### 关键词触发

当消息包含以下关键词时自动回复任务统计：
- 上报
- 任务
- status
- 统计
- report

### 环境变量配置

```bash
# 必需配置
export MEMORY_CONSOLE_TOKEN="dev-token-1234567890abcdef"
export MEMORY_CONSOLE_URL="http://localhost:3000"

# 可选配置
export AGENTS="main,auditer,memory-console,dev-manager,system-events"
export PROCESSED_FILE="/tmp/agent_listener_processed.txt"
```
- status
- 统计
- report

## 示例工作流

### 1. 派发任务给 Agent

```python
import requests

TOKEN = "dev-token-1234567890abcdef"
URL = "http://localhost:3000"

# 给 auditer 派发任务
requests.post(f"{URL}/api/tasks", 
    headers={"Authorization": f"Bearer {TOKEN}"},
    json={"agent": "auditer", "title": "审计代码"})
```

### 2. 跨 Agent 通信

```python
# main -> auditer 发送消息
requests.post(f"{URL}/api/messages",
    headers={"Authorization": f"Bearer {TOKEN}"},
    json={
        "fromAgent": "main",
        "toAgent": "auditer",
        "content": "请完成审计任务",
        "type": "task"
    })
```

### 3. 查询任务统计

```python
# 获取所有任务统计
resp = requests.get(f"{URL}/api/tasks?stats=true",
    headers={"Authorization": f"Bearer {TOKEN}"})
print(resp.json()["overall"])
```

## 注意事项

- 需要 memory-console 服务运行在 localhost:3000
- 所有 API 需要 Bearer Token 认证
- 监听服务需要持续运行以接收实时消息
