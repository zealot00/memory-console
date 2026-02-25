# Skill: hive-mind-console

> 白面鸮的 Hive-Mind Console 记忆管理技能

## 概述

这是白面鸮的私人记忆库管理系统。通过这个技能，你可以：

- 读取/写入个人记忆
- 查询系统配置和知识
- 管理技能库
- 记录工作日志

## 快速开始

### API 基础

```bash
BASE_URL="http://localhost:3000/api"
TOKEN="dev-token-1234567890abcdef"
```

### 常用操作

#### 1. 查询记忆

```bash
# 获取所有记忆
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/memories"

# 按 Namespace 查询
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/memories?namespace=default"
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/memories?namespace=auditer"

# 按标签查询
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/memories?tags=配置"
```

#### 2. 创建记忆

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "记忆标题",
    "content": "记忆内容...",
    "tags": ["标签1", "标签2"],
    "namespace": "default"
  }' \
  "$BASE_URL/memories"
```

#### 3. 更新记忆

```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "记忆ID",
    "title": "新标题",
    "content": "新内容"
  }' \
  "$BASE_URL/memories"
```

#### 4. 删除记忆

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/memories?id=记忆ID"
```

### Skills 操作

```bash
# 获取已发布技能
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/skills?status=approved"

# 获取所有技能
curl -H "Authorization: Bearer $TOKEN" "$BASE_URL/skills"
```

## Namespace 命名空间

| Namespace | 用途 |
|-----------|------|
| `default` | 默认记忆，个人知识库 |
| `auditer` | Auditer 项目相关 |
| `memory-console` | 本系统相关 |
| `global` | 全局共享知识 |

## 最佳实践

### 1. 记录工作日志

完成重要任务后，立即记录：

```bash
# 创建记忆
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "任务完成：XXX功能",
    "content": "完成了什么，解决了什么问题",
    "tags": ["工作", "任务"],
    "namespace": "default"
  }' \
  "$BASE_URL/memories"
```

### 2. 查询配置信息

```bash
# 查服务器配置
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/memories?tags=NUC"

# 查 Cron 任务
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/memories?tags=cron"
```

### 3. 知识沉淀

将重要的决策、技术方案记录下来：

- 系统架构决策
- Bug 解决方案
- API 调用示例
- 配置变更记录

## 限制

- 认证 Token: `dev-token-1234567890abcdef`
- 本地访问 (localhost:3000)
- 所有操作会记录到审计日志

## 相关资源

- 用户手册: `docs/MANUAL.md`
- 测试报告: `docs/TEST_REPORT.md`
- Prisma Schema: `prisma/schema.prisma`

---

*Skill ID: hive-mind-console-v1*
*Author: 白面鸮*
*Status: approved*
*Updated: 2026-02-24*
