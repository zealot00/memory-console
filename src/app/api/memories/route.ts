import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withReadAuth, withWriteAuth, logAudit } from "@/lib/auth";
import { getClientIP, errorResponse, validationError } from "@/lib/utils";
import { generateEmbedding } from "@/lib/embedding";
import { CreateMemorySchema, UpdateMemorySchema } from "@/lib/schemas";

// GET /api/memories - 获取所有记忆（支持分页和过滤）
export async function GET(request: NextRequest) {
  return withReadAuth(async (req, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const namespace = searchParams.get("namespace") || auth.namespace;
      const owner = searchParams.get("owner");
      const status = searchParams.get("status") || "active";
      const search = searchParams.get("search");
      const tags = searchParams.get("tags")?.split(",").filter(Boolean);
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");

      const where: any = {
        namespace,
        status,
      };

      if (owner) where.owner = owner;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ];
      }
      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      const [memories, total] = await Promise.all([
        prisma.memory.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.memory.count({ where }),
      ]);

      // 记录审计日志
      await logAudit(
        "read",
        "memory",
        undefined,
        namespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { count: total, filters: { owner, status, search } }
      );

      return NextResponse.json({
        items: memories,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error fetching memories:", error);
      return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
    }
  })(request);
}

// POST /api/memories - 添加记忆
export async function POST(request: NextRequest) {
  return withWriteAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const validated = CreateMemorySchema.safeParse(body);
      
      if (!validated.success) {
        return validationError(validated.error);
      }
      
      const namespace = body.namespace || auth.namespace;
      
      // 生成 embedding
      let embedding: number[] = [];
      try {
        const textToEmbed = `${body.title} ${body.content} ${(body.tags || []).join(' ')}`;
        embedding = await generateEmbedding(textToEmbed);
      } catch (error) {
        console.error('Failed to generate embedding:', error);
      }
      
      const memory = await prisma.memory.create({
        data: {
          title: body.title,
          content: body.content,
          source: body.source || "memory-console",
          owner: body.owner || "ai",
          status: "active",
          namespace,
          tags: body.tags || [],
          embedding,
        },
      });

      // 记录审计日志
      await logAudit(
        "create",
        "memory",
        memory.id,
        namespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { title: memory.title }
      );

      return NextResponse.json(memory, { status: 201 });
    } catch (error) {
      console.error("Error creating memory:", error);
      return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
    }
  })(request);
}

// PUT /api/memories - 批量更新或单个更新
export async function PUT(request: NextRequest) {
  return withWriteAuth(async (req, auth) => {
    try {
      const body = await request.json();
      const validated = UpdateMemorySchema.safeParse(body);

      if (!validated.success) {
        return validationError(validated.error);
      }

      if (body.id) {
        // 单个更新
        const memory = await prisma.memory.update({
          where: { id: body.id },
          data: {
            ...(body.title && { title: body.title }),
            ...(body.content && { content: body.content }),
            ...(body.tags && { tags: body.tags }),
            ...(body.status && { status: body.status }),
          },
        });

        // 记录审计日志
        await logAudit(
          "update",
          "memory",
          memory.id,
          memory.namespace,
          undefined,
          auth.tokenId,
          getClientIP(request),
          { updatedFields: Object.keys(body).filter(k => k !== "id") }
        );

        return NextResponse.json(memory);
      }

      return NextResponse.json({ error: "ID required" }, { status: 400 });
    } catch (error) {
      console.error("Error updating memory:", error);
      return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
    }
  })(request);
}

// DELETE /api/memories - 删除记忆
export async function DELETE(request: NextRequest) {
  return withWriteAuth(async (req, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
      }

      // 获取要删除的记忆用于日志
      const memory = await prisma.memory.findUnique({
        where: { id },
      });

      await prisma.memory.delete({
        where: { id },
      });

      // 记录审计日志
      await logAudit(
        "delete",
        "memory",
        id,
        memory?.namespace,
        undefined,
        auth.tokenId,
        getClientIP(request),
        { title: memory?.title }
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting memory:", error);
      return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
    }
  })(request);
}
