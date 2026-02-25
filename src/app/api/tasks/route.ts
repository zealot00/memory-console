import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

// 创建任务
export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const { agent, title, description } = body;

  if (!agent || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: { agent, title, description, status: 'pending' },
  });

  // 记录审计日志
  await prisma.auditLog.create({
    data: {
      action: 'task_create',
      resource: 'task',
      resourceId: task.id,
      entityType: 'Task',
      details: { agent, title },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(task);
}

// 获取任务统计
export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const statsOnly = searchParams.get('stats') === 'true';

  let where = {};
  if (agent) where = { agent };

  if (statsOnly) {
    // 返回统计信息
    const total = await prisma.task.count({ where });
    const pending = await prisma.task.count({ where: { ...where, status: 'pending' } });
    const inProgress = await prisma.task.count({ where: { ...where, status: 'in_progress' } });
    const completed = await prisma.task.count({ where: { ...where, status: 'completed' } });
    const failed = await prisma.task.count({ where: { ...where, status: 'failed' } });

    // 按 Agent 分组统计
    const byAgent = await prisma.task.groupBy({
      by: ['agent', 'status'],
      _count: true,
    });

    return NextResponse.json({
      overall: { total, pending, inProgress, completed, failed },
      byAgent,
    });
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ tasks });
}

// 更新任务状态
export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const { taskId, status, result } = body;

  if (!taskId || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const updateData: any = { status };
  if (result) updateData.result = result;
  if (status === 'completed') updateData.completedAt = new Date();

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'task_update',
      resource: 'task',
      resourceId: task.id,
      entityType: 'Task',
      details: { status, result: result?.substring(0, 100) },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(task);
}
