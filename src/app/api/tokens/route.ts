import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

// 生成 Token Hash
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 生成随机 Token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// GET /api/tokens - 获取 Token 列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get("namespace");

    const where: any = {};
    if (namespace) where.namespace = namespace;

    const tokens = await prisma.apiToken.findMany({
      where,
      select: {
        id: true,
        name: true,
        namespace: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        // 不返回 token 值
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
  }
}

// POST /api/tokens - 创建 Token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    const apiToken = await prisma.apiToken.create({
      data: {
        name: body.name,
        token: tokenHash,
        namespace: body.namespace || "default",
        permissions: body.permissions || ["read"],
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    // 返回原始 Token（只显示一次）
    return NextResponse.json({
      id: apiToken.id,
      name: apiToken.name,
      token: rawToken, // 只在创建时返回
      namespace: apiToken.namespace,
      permissions: apiToken.permissions,
      expiresAt: apiToken.expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating token:", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}

// DELETE /api/tokens - 删除 Token
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.apiToken.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting token:", error);
    return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
  }
}
