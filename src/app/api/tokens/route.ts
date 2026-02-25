import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth, logAudit } from "@/lib/auth";
import { randomBytes } from "crypto";

// 生成 token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// GET /api/tokens - 获取 Token 列表
export async function GET(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const namespace = searchParams.get("namespace") || auth.namespace;

      const tokens = await prisma.apiToken.findMany({
        where: { namespace },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          namespace: true,
          permissions: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          // 不返回 token 本身
        },
      });

      return NextResponse.json(tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
    }
  })(request);
}

// POST /api/tokens - 创建 Token
export async function POST(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const namespace = body.namespace || auth.namespace;
      
      const tokenValue = generateToken();
      
      const apiToken = await prisma.apiToken.create({
        data: {
          name: body.name,
          token: tokenValue,
          namespace,
          permissions: body.permissions || ["read"],
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      });

      // 记录审计日志
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
        || request.headers.get("x-real-ip") 
        || "unknown";
      await logAudit(
        "create",
        "token",
        apiToken.id,
        namespace,
        undefined,
        auth.tokenId,
        ipAddress,
        { name: apiToken.name, permissions: apiToken.permissions }
      );

      // 返回创建的 token（只返回一次）
      return NextResponse.json({
        id: apiToken.id,
        name: apiToken.name,
        token: tokenValue, // 只在这里返回一次
        namespace: apiToken.namespace,
        permissions: apiToken.permissions,
        expiresAt: apiToken.expiresAt,
        createdAt: apiToken.createdAt,
      }, { status: 201 });
    } catch (error) {
      console.error("Error creating token:", error);
      return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
    }
  })(request);
}

// PUT /api/tokens - 更新 Token
export async function PUT(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const body = await request.json();

      if (!body.id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
      }

      const apiToken = await prisma.apiToken.update({
        where: { id: body.id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.permissions && { permissions: body.permissions }),
          ...(body.expiresAt !== undefined && { 
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null 
          }),
        },
      });

      // 记录审计日志
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
        || request.headers.get("x-real-ip") 
        || "unknown";
      await logAudit(
        "update",
        "token",
        apiToken.id,
        auth.namespace,
        undefined,
        auth.tokenId,
        ipAddress,
        { name: apiToken.name }
      );

      return NextResponse.json({
        id: apiToken.id,
        name: apiToken.name,
        namespace: apiToken.namespace,
        permissions: apiToken.permissions,
        expiresAt: apiToken.expiresAt,
      });
    } catch (error: any) {
      console.error("Error updating token:", error);
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Token not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
    }
  })(request);
}

// DELETE /api/tokens - 删除 Token
export async function DELETE(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
      }

      // 获取要删除的 token
      const token = await prisma.apiToken.findUnique({
        where: { id },
      });

      await prisma.apiToken.delete({
        where: { id },
      });

      // 记录审计日志
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
        || request.headers.get("x-real-ip") 
        || "unknown";
      await logAudit(
        "delete",
        "token",
        id,
        auth.namespace,
        undefined,
        auth.tokenId,
        ipAddress,
        { name: token?.name }
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting token:", error);
      return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
    }
  })(request);
}
