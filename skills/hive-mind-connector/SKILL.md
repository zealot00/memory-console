# Skill: Hive-Mind Connector

## 概述

这是一个用于连接和使用 Hive-Mind Console (memory-console) 的技能，帮助 AI 代理管理和查询记忆与技能。

## 前置条件

- memory-console 服务运行在 `localhost:3000`
- 拥有 API Token: `dev-token-1234567890abcdef`

## 基础 API

### 1. 查询记忆

```bash
# 查询所有记忆（带 namespace 过滤）
curl -s "http://localhost:3000/api/memories?namespace=default" \
  -H "Authorization: Bearer dev-token-1234567890abcdef"
```

### 2. 添加记忆

```bash
curl -s -X POST "http://localhost:3000/api/memories" \
  -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "记忆标题",
    "content": "记忆内容...",
    "tags": ["标签1", "标签2"],
    "namespace": "default",
    "status": "active"
  }'
```

### 3. 查询技能

```bash
# 获取所有已发布技能
curl -s "http://localhost:3000/api/skills" \
  -H "Authorization: Bearer dev-token-1234567890abcdef"
```

### 4. 添加技能

```bash
curl -s -X POST "http://localhost:3000/api/skills" \
  -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "skill-name",
    "description": "技能描述",
    "schema_payload": {"key": "value"},
    "version": "1.0.0",
    "status": "draft"
  }'
```

### 5. 同步技能

```bash
# 拉取所有已发布技能
curl -s "http://localhost:3000/api/skills/sync" \
  -H "Authorization: Bearer dev-token-1234567890abcdef"
```

## 常用场景

### 场景1：记录重要决策

```bash
# 当博士做出重要决定时
curl -s -X POST "http://localhost:3000/api/memories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "决策：XXX",
    "content": "决策内容...",
    "tags": ["决策", "重要"],
    "namespace": "default",
    "status": "active"
  }'
```

### 场景2：查询特定主题

```bash
# 查询所有带 "配置" 标签的记忆
curl -s "http://localhost:3000/api/memories?tags=配置" \
  -H "Authorization: Bearer $TOKEN"
```

### 场景3：更新记忆

```bash
# 更新记忆状态
curl -s -X PUT "http://localhost:3000/api/memories/:id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "archived"}'
```

## Namespace 规则

- `default`: 我的个人记忆
- `auditer`: Auditer 项目相关
- `memory-console`: memory-console 项目相关
- `global`: 全局共享知识

## 注意事项

1. **隐私保护**: 不要在记忆内容中暴露敏感信息（密码、密钥、绝对路径等）
2. **认证**: 所有 API 必须带 Bearer Token
3. **审计**: 所有操作都会自动记录到 auditLog
4. **本地**: 当前仅支持 localhost 访问

## 快速参考

```bash
# 常用变量
TOKEN="dev-token-1234567890abcdef"
BASE_URL="http://localhost:3000"

# 查询
curl -s "$BASE_URL/api/memories" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE_URL/api/skills" -H "Authorization: Bearer $TOKEN"

# 创建
curl -s -X POST "$BASE_URL/api/memories" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"","content":"","tags":[],"namespace":"default"}'
```
