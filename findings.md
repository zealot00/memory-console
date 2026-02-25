# Findings - 开发调研记录

## 项目现状分析

### 1. 技术栈确认
- **前端**: Next.js 16 + React 19 + Tailwind CSS 4
- **后端**: Next.js API Routes + Prisma ORM
- **数据库**: PostgreSQL 16 + pgvector
- **部署**: Docker Compose

### 2. Prisma Schema 结构
```prisma
model Memory {
  id, title, content, source, owner, status, namespace, tags, createdAt, updatedAt
}

model Skill {
  id, name, description, schemaPayload, version, authorInstance, isPublic, status
}

model AuditLog {
  id, action, entityType, entityId, namespace, instanceId, ipAddress, tokenId, details
}

model ApiToken {
  id, name, token, namespace, permissions, expiresAt, lastUsedAt
}
```

### 3. 现有 API 路由
- `/api/memories` - 记忆 CRUD (GET/POST/PUT/DELETE)
- `/api/skills` - 技能 CRUD
- `/api/skills/sync` - 技能同步
- `/api/tokens` - Token 管理
- `/api/audit` - 审计日志

### 4. 前端页面
- 单页应用，已实现记忆列表、搜索、添加、编辑、删除
- UI 使用 Tailwind，界面美观

### 5. 待解决问题
- Token 鉴权中间件未实现
- Namespace 前端切换未实现
- 审计日志未自动记录

---

## 产品需求要点

1. **Namespace 隔离**: 物理表结构上杜绝数据越权
2. **Token 鉴权**: 所有 API 必须携带 Bearer Token
3. **审计留痕**: 核心操作记录到 AuditLog
4. **技能分发**: /api/skills/sync 供其他节点拉取
