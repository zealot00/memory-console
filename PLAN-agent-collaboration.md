# Agent 协作对话能力开发计划

## 目标
实现 Agent 之间的分工→讨论→整合 完整协作能力

## 架构设计

### 角色权重 (main 特殊权限)
- **main (白面鸮)**: 协调者，有最终决策权，可发起协作讨论
- **auditer**: 技术评审，代码质量评估
- **memory-console**: 记忆管理，数据支持
- **dev-manager**: 任务规划，进度管理
- **system-events**: 系统监控，异常检测

### 协作流程

```
1. 分工阶段 (Division)
   main 派发任务 → 各 Agent 接收任务
   
2. 讨论阶段 (Discussion)
   Agent 之间交换观点 → 讨论方案优劣
   
3. 整合阶段 (Integration)
   main 汇总意见 → 形成最终方案
```

## 实现计划

### Phase 1: 消息类型扩展
- 添加 `discussion` 消息类型
- 添加 `proposal` 提案类型
- 添加 `vote` 投票类型

### Phase 2: 对话任务 API
- POST /api/collaboration/create - 创建协作任务
- GET /api/collaboration/{id} - 获取协作状态
- POST /api/collaboration/{id}/propose - 提交提案
- POST /api/collaboration/{id}/discuss - 参与讨论

### Phase 3: 自动执行
- 监听讨论消息
- 汇总提案
- 生成最终方案

## 时间预估
- Phase 1: 30分钟
- Phase 2: 1小时
- Phase 3: 30分钟
- 总计: ~2小时

