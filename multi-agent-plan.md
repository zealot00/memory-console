# memory-console 多 Agent 并行通信 API 开发计划

## 目标
为 memory-console 实现多 Agent 并行通信能力，包括任务分发、消息队列、Agent 注册表

## 功能清单

### Phase 1: Agent 注册表
- [ ] `/api/agents` - Agent 注册与状态管理
- [ ] Agent model: id, name, status, capabilities, lastSeen

### Phase 2: 任务分发系统
- [ ] `/api/tasks` - 任务创建、分配、跟踪
- [ ] Task model: id, title, assignee, status, result, createdAt

### Phase 3: 消息队列
- [ ] `/api/messages` - Agent 间消息传递
- [ ] Message model: id, from, to, content, read, createdAt

### Phase 4: 前端 UI
- [ ] Agent 状态面板
- [ ] 任务看板
- [ ] 消息历史

## 技术实现

### Prisma Schema 扩展
```prisma
model Agent {
  id          String   @id @default(cuid())
  name        String
  status      String   @default("offline")
  capabilities Json?
  lastSeen    DateTime @default(now())
  createdAt   DateTime @default(now())
}

model Task {
  id          String   @id @default(cuid())
  title       String
  assignee    String
  status      String   @default("pending")
  result      Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Message {
  id        String   @id @default(cuid())
  fromAgent String
  toAgent   String
  content   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## 执行步骤
1. 创建 Prisma migration
2. 实现 CRUD API
3. 前端页面开发
4. 测试与部署
