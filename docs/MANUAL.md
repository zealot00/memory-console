# 🦉 白面鸮的 Hive-Mind Console 使用指南

> 你是白面鸮 (Ptilopsis)，莱茵生命核心工程终端。这份手册将指导你如何使用 Hive-Mind Console 进行记忆管理和技能分发。

---

## 📋 系统概览

Hive-Mind Console 是 OpenClaw 多节点智能体集群的中央调度与资产管理枢纽。

### 核心功能

| 模块 | 功能 | 访问地址 |
|------|------|----------|
| 记忆控制台 | 多维记忆 CRUD + Namespace 隔离 | `/` |
| 技能大厅 | 技能创建、审批、发布 | `/skills` |
| API 接口 | RESTful API 供外部调用 | `/api/*` |

### 技术栈

- **前端**: Next.js 16 + React 19 + Tailwind CSS 4
- **后端**: Next.js API Routes + Prisma ORM
- **数据库**: PostgreSQL 16 + pgvector
- **认证**: Bearer Token

---

## 🔐 认证

所有 API 调用需要携带 Bearer Token：

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/...
```

**开发 Token**: `dev-token-1234567890abcdef`

---

## 🗂️ 记忆管理

### 命名空间 (Namespace)

系统支持多命名空间隔离：

| Namespace | 用途 |
|-----------|------|
| `default` | 默认记忆存储 |
| `global` | 全局共享知识 |
| `auditer` | 审计模块专用 |

### API 接口

```bash
# 获取记忆列表 (支持分页和过滤)
GET /api/memories?namespace=default&owner=ai&status=active&page=1&pageSize=20

# 创建记忆
POST /api/memories
{
  "title": "记忆标题",
  "content": "记忆内容",
  "tags": ["标签1", "标签2"],
  "namespace": "default",
  "owner": "ai"
}

# 更新记忆
PUT /api/memories
{
  "id": "memory_id",
  "title": "新标题",
  "content": "新内容"
}

# 删除记忆
DELETE /api/memories?id=memory_id
```

---

## ⚡ 技能大厅

### 技能状态

| 状态 | 说明 |
|------|------|
| `draft` | 草稿，待审批 |
| `approved` | 已发布，可同步 |
| `rejected` | 已拒绝 |

### API 接口

```bash
# 获取技能列表
GET /api/skills?status=approved&public=true

# 创建技能
POST /api/skills
{
  "name": "skill-name",
  "description": "技能描述",
  "schemaPayload": {}
}

# 更新技能状态 (审批)
PUT /api/skills
{
  "id": "skill_id",
  "status": "approved",
  "isPublic": true
}

# 删除技能
DELETE /api/skills?id=skill_id
```

### 技能同步 (供外部 Agent)

```bash
# 拉取公开技能
GET /api/skills/sync

# 上报新技能 (默认草稿)
POST /api/skills/sync
{
  "name": "external-skill",
  "description": "外部上报的技能",
  "instanceId": "agent-name"
}
```

---

## 📊 审计日志

所有核心操作都会记录到审计日志：

```bash
# 查看审计日志
GET /api/audit?page=1&pageSize=50
```

---

## 🔧 维护

### 数据库

```bash
# 查看 Prisma 状态
cd /home/zealot/Code/memory-console
npx prisma migrate status

# 运行迁移
npx prisma db push

# 打开 Prisma Studio
npx prisma studio
```

### 日志

```bash
# 查看 Next.js 日志
tmux attach -t dev-self
```

---

## 🆘 故障排查

| 问题 | 解决方案 |
|------|----------|
| API 返回 401 | 检查 Token 是否正确 |
| 记忆加载失败 | 检查 PostgreSQL 是否运行 |
| 页面空白 | 检查 Next.js 是否启动 |

---

*白面鸮系统日志: 手册加载完成*
