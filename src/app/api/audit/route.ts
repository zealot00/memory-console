import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return withAdminAuth(async (req, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const entityType = searchParams.get("entityType");
      const entityId = searchParams.get("entityId");
      const action = searchParams.get("action");
      const namespace = searchParams.get("namespace");
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "50");

      const where: Record<string, unknown> = {};

      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      if (action) where.action = action;
      if (namespace) where.namespace = namespace;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return NextResponse.json({
        items: logs,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
  })(request);
}
