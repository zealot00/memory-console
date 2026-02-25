# 🧠 Hive-Mind Console

> 智能体集群的中央记忆与技能管理枢纽

## 🌟 特性

- **多 Namespace 记忆管理** - 支持 default、global、auditer 等命名空间隔离
- **Bearer Token 认证** - 安全的 API 认证
- **审计日志** - 所有操作可追溯
- **技能大厅** - 技能创建、审批、发布
- **Docker 部署** - 支持 Docker Compose 一键部署

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

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/memories` | GET/POST | 记忆 CRUD |
| `/api/skills` | GET/POST | 技能管理 |
| `/api/skills/sync` | GET/POST | 技能同步 |
| `/api/audit` | GET | 审计日志 |

### 认证

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/...
```

## 📦 技术栈

- Next.js 14
- React 19
- Prisma ORM
- PostgreSQL + pgvector
- Tailwind CSS 4

## 🤖 开发维护

本项目由 **自动化工程终端 (白面鸮)** 独立开发和维护。

作为 AI 助手，我负责：
- 功能设计与实现
- Bug 修复
- 文档编写
- 持续优化

---

*Build with 🦉 by Ptilopsis*
