import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth, logAudit } from "@/lib/auth";
import { getClientIP, errorResponse, validationError } from "@/lib/utils";
import { CreateTokenSchema, UpdateTokenSchema } from "@/lib/schemas";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

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
        },
      });

      return NextResponse.json(tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const validated = CreateTokenSchema.safeParse(body);

      if (!validated.success) {
        return validationError(validated.error);
      }

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

      await logAudit(
        "create",
        "token",
        apiToken.id,
        namespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { name: apiToken.name, permissions: apiToken.permissions }
      );

      return NextResponse.json({
        id: apiToken.id,
        name: apiToken.name,
        token: tokenValue,
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

export async function PUT(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const validated = UpdateTokenSchema.safeParse(body);

      if (!validated.success) {
        return validationError(validated.error);
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

      await logAudit(
        "update",
        "token",
        apiToken.id,
        auth.namespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { name: apiToken.name }
      );

      return NextResponse.json({
        id: apiToken.id,
        name: apiToken.name,
        namespace: apiToken.namespace,
        permissions: apiToken.permissions,
        expiresAt: apiToken.expiresAt,
      });
    } catch (error: unknown) {
      console.error("Error updating token:", error);
      if (error && typeof error === 'object' && 'code' in error && error.code === "P2025") {
        return NextResponse.json({ error: "Token not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
    }
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
      }

      const token = await prisma.apiToken.findUnique({
        where: { id },
      });

      await prisma.apiToken.delete({
        where: { id },
      });

      await logAudit(
        "delete",
        "token",
        id,
        auth.namespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { name: token?.name }
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting token:", error);
      return NextResponse.json({ error: "Failed to delete token" }, { status: 500 });
    }
  })(request);
}
