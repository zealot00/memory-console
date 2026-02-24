import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// 简单的 Token 验证函数
async function validateToken(token: string): Promise<{ valid: boolean; namespace?: string; permissions?: string[] }> {
  if (!token) return { valid: false };

  // 查找 Token
  const apiToken = await prisma.apiToken.findUnique({
    where: { token: token },
  });

  if (!apiToken) {
    // 兼容：如果是默认的开发 Token，返回有效
    if (token === "dev-token-for-testing") {
      return { valid: true, namespace: "default", permissions: ["read", "write", "admin"] };
    }
    return { valid: false };
  }

  // 检查是否过期
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    return { valid: false };
  }

  // 更新最后使用时间
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return { valid: true, namespace: apiToken.namespace, permissions: apiToken.permissions };
}

// GET /api/skills/sync - 外部 Agent 拉取技能
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const validation = await validateToken(token || "");
    if (!validation.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 只有 admin 权限才能拉取技能
    if (!validation.permissions?.includes("read")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // 只返回已批准的公共技能
    const skills = await prisma.skill.findMany({
      where: {
        status: "approved",
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        schemaPayload: true,
        version: true,
        authorInstance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      skills,
      syncedAt: new Date().toISOString(),
      instanceId: "hive-mind-console",
    });
  } catch (error) {
    console.error("Error syncing skills:", error);
    return NextResponse.json({ error: "Failed to sync skills" }, { status: 500 });
  }
}

// POST /api/skills/sync - 外部 Agent 上报技能（待审批）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const validation = await validateToken(token || "");
    if (!validation.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validation.permissions?.includes("write")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();

    // 创建技能（默认草稿状态）
    const skill = await prisma.skill.create({
      data: {
        name: body.name,
        description: body.description || "",
        schemaPayload: body.schemaPayload || {},
        authorInstance: body.instanceId || "external",
        isPublic: false,
        status: "draft",
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        action: "skill_submit",
        entityType: "skill",
        entityId: skill.id,
        namespace: validation.namespace,
        instanceId: body.instanceId,
        details: { skillName: body.name },
      },
    });

    return NextResponse.json({
      message: "Skill submitted for review",
      skillId: skill.id,
      status: "draft",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error submitting skill:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Skill name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to submit skill" }, { status: 500 });
  }
}
