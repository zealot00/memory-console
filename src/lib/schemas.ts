import { z } from "zod";

export const CreateMemorySchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字符"),
  content: z.string().min(1, "内容不能为空"),
  source: z.string().optional().default("memory-console"),
  owner: z.enum(["ai", "human"]).optional().default("ai"),
  namespace: z.string().optional().default("default"),
  tags: z.array(z.string()).optional().default([]),
});

export const UpdateMemorySchema = z.object({
  id: z.string().min(1, "ID不能为空"),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "archived", "blocked"]).optional(),
});

export const CreateSkillSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称最多100字符"),
  description: z.string().optional().default(""),
  schemaPayload: z.record(z.unknown()).optional().default({}),
  authorInstance: z.string().optional().default("system"),
});

export const UpdateSkillSchema = z.object({
  id: z.string().min(1, "ID不能为空"),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  schemaPayload: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "approved", "rejected"]).optional(),
  isPublic: z.boolean().optional(),
});

export const CreateMessageSchema = z.object({
  fromAgent: z.string().min(1, "发送者不能为空"),
  toAgent: z.string().min(1, "接收者不能为空"),
  content: z.string().min(1, "内容不能为空"),
  type: z.enum(["notification", "task", "event"]).optional().default("notification"),
});

export const CreateTaskSchema = z.object({
  agent: z.string().min(1, "Agent不能为空"),
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字符"),
  description: z.string().optional(),
});

export const UpdateTaskSchema = z.object({
  taskId: z.string().min(1, "任务ID不能为空"),
  status: z.enum(["pending", "in_progress", "completed", "failed"], {
    errorMap: () => ({ message: "无效的任务状态" }),
  }),
  result: z.string().optional(),
});

export const CreateTokenSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称最多100字符"),
  namespace: z.string().optional().default("default"),
  permissions: z.array(z.enum(["read", "write", "admin"])).optional().default(["read"]),
  expiresAt: z.string().optional(),
});

export const UpdateTokenSchema = z.object({
  id: z.string().min(1, "ID不能为空"),
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.enum(["read", "write", "admin"])).optional(),
  expiresAt: z.string().optional().nullable(),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称最多100字符"),
  displayName: z.string().optional(),
  capabilities: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  namespace: z.string().optional().default("default"),
});

export const UpdateAgentSchema = z.object({
  agentId: z.string().optional(),
  name: z.string().optional(),
  status: z.enum(["online", "offline", "busy"]).optional(),
  capabilities: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine(data => data.agentId || data.name, {
  message: "必须提供 agentId 或 name",
  path: ["agentId", "name"],
});

export const SkillSyncSubmitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().default(""),
  schemaPayload: z.record(z.unknown()).optional().default({}),
  instanceId: z.string().optional(),
});
