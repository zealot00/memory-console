# Skill: Memory Query

查询 memory-console 外置记忆服务的命令行工具。

## 概述

用于 AI Agent 查询 memory-console 数据库中的记忆记录。支持关键词搜索。

## 前置条件

- memory-console 服务运行在 `localhost:3000`
- API Token: `dev-token-1234567890abcdef`
- Python 3 环境

## 使用方式

```bash
python3 skills/memory-query/query.py "搜索关键词"
```

## 示例

```bash
# 查询人设相关记忆
python3 skills/memory-query/query.py "人设"

# 查询白面鸮相关记忆
python3 skills/memory-query/query.py "白面鸮"

# 查询任务相关记忆
python3 skills/memory-query/query.py "任务"
```

## 输出格式

```
== 记忆标题 ==
记忆内容...

== 记忆标题 2 ==
记忆内容 2...
```

## 集成到 AI Agent

AI Agent 可以通过 exec 工具调用此脚本：

```
exec: python3 /path/to/memory-console/skills/memory-query/query.py "关键词"
```

## 注意事项

1. 仅支持精确关键词匹配（大小写不敏感）
2. 搜索 title 和 content 字段
3. 返回所有匹配的记录
