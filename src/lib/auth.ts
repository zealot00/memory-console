import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Token 验证函数
export async function verifyToken(token: string): Promise<{ valid: boolean; namespace?: string; permissions?: string[]; tokenId?: string }> {
  if (!token || !token.startsWith("Bearer ")) {
    return { valid: false };
  }

  const tokenValue = token.slice(7); // 移除 "Bearer " 前缀

  // 查找 token (实际应该 hash 后比较，这里简化处理)
  const apiToken = await prisma.apiToken.findUnique({
    where: { token: tokenValue },
  });

  if (!apiToken) {
    return { valid: false };
  }

  // 检查是否过期
  if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
    return { valid: false };
  }

  // 更新最后使用时间
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    namespace: apiToken.namespace,
    permissions: apiToken.permissions,
    tokenId: apiToken.id,
  };
}

// 审计日志记录函数
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string | undefined,
  namespace: string | undefined,
  instanceId: string | undefined,
  tokenId: string | undefined,
  ipAddress: string,
  details: Record<string, any> = {}
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        namespace,
        instanceId,
        tokenId,
        ipAddress,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

// 认证中间件包装器
export function withAuth(
  handler: (request: NextRequest, auth: { namespace: string; permissions: string[]; tokenId: string; instanceId?: string }) => Promise<NextResponse>,
  requiredPermissions: string[] = []
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    // 获取 IP 地址
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";

    // 获取 Authorization Header
    const authHeader = request.headers.get("authorization");
    
    // 如果没有 token，允许通过但记录为匿名访问（可选策略）
    // 根据产品文档，应该拒绝所有匿名请求
    if (!authHeader) {
      // 对于某些公开端点，可以放行
      const publicPaths = ["/api/skills/sync"]; // 技能同步可以公开（需要额外验证）
      const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
      
      if (!isPublicPath) {
        return NextResponse.json(
          { error: "Unauthorized: Bearer token required" },
          { status: 401 }
        );
      }
    }

    // 验证 token
    const authResult = await verifyToken(authHeader || "");
    
    if (!authResult.valid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }

    // 检查权限
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some(
        perm => authResult.permissions?.includes(perm)
      );
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: "Forbidden: Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // 获取 instanceId (可选从 header 获取)
    const instanceId = request.headers.get("x-instance-id") || "unknown";

    // 调用处理函数
    return handler(request, {
      namespace: authResult.namespace || "default",
      permissions: authResult.permissions || [],
      tokenId: authResult.tokenId || "",
      instanceId,
    });
  };
}

// 便捷函数：创建需要写权限的处理器
export function withWriteAuth(handler: (request: NextRequest, auth: { namespace: string; permissions: string[]; tokenId: string }) => Promise<NextResponse>) {
  return withAuth(handler, ["write", "admin"]);
}

// 便捷函数：创建需要读权限的处理器
export function withReadAuth(handler: (request: NextRequest, auth: { namespace: string; permissions: string[]; tokenId: string }) => Promise<NextResponse>) {
  return withAuth(handler, ["read", "write", "admin"]);
}

// 便捷函数：创建需要 admin 权限的处理器
export function withAdminAuth(handler: (request: NextRequest, auth: { namespace: string; permissions: string[]; tokenId: string }) => Promise<NextResponse>) {
  return withAuth(handler, ["admin"]);
}
