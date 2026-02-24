import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/skills - 获取技能列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const isPublic = searchParams.get("public");
    const author = searchParams.get("author");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where: any = {};

    if (status) where.status = status;
    if (isPublic !== null) where.isPublic = isPublic === "true";
    if (author) where.authorInstance = author;

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.skill.count({ where }),
    ]);

    return NextResponse.json({
      items: skills,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
  }
}

// POST /api/skills - 创建技能
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const skill = await prisma.skill.create({
      data: {
        name: body.name,
        description: body.description || "",
        schemaPayload: body.schemaPayload || {},
        version: 1,
        authorInstance: body.authorInstance || "system",
        isPublic: false,
        status: "draft",
      },
    });

    return NextResponse.json(skill, { status: 201 });
  } catch (error: any) {
    console.error("Error creating skill:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Skill name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}

// PUT /api/skills - 更新技能
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const skill = await prisma.skill.update({
      where: { id: body.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description && { description: body.description }),
        ...(body.schemaPayload && { schemaPayload: body.schemaPayload }),
        ...(body.status && { status: body.status }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
        ...(body.status === "approved" && { version: { increment: 1 } }),
      },
    });

    return NextResponse.json(skill);
  } catch (error: any) {
    console.error("Error updating skill:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }
}

// DELETE /api/skills - 删除技能
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.skill.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 });
  }
}
