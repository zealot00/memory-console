import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIP, errorResponse } from '@/lib/utils';
import { CreateTaskSchema, UpdateTaskSchema } from '@/lib/schemas';

function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

async function validateToken(token: string) {
  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (apiToken) return apiToken;
  
  const devToken = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
  if (devToken && token === devToken) {
    return { id: 'dev', name: 'dev-token' };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const validated = CreateTaskSchema.safeParse(body);

  if (!validated.success) {
    return errorResponse(validated.error.errors[0].message, 400);
  }

  const { agent, title, description } = body;

  const task = await prisma.task.create({
    data: { agent, title, description, status: 'pending' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'task_create',
      entityType: 'Task',
      entityId: task.id,
      details: { agent, title },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(task);
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const statsOnly = searchParams.get('stats') === 'true';

  const where = agent ? { agent } : {};

  if (statsOnly) {
    const total = await prisma.task.count({ where });
    const pending = await prisma.task.count({ where: { ...where, status: 'pending' } });
    const inProgress = await prisma.task.count({ where: { ...where, status: 'in_progress' } });
    const completed = await prisma.task.count({ where: { ...where, status: 'completed' } });
    const failed = await prisma.task.count({ where: { ...where, status: 'failed' } });

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

export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const validated = UpdateTaskSchema.safeParse(body);

  if (!validated.success) {
    return errorResponse(validated.error.errors[0].message, 400);
  }

  const { taskId, status, result } = body;

  const updateData: Record<string, unknown> = { status };
  if (result) updateData.result = result;
  if (status === 'completed') updateData.completedAt = new Date();

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'task_update',
      entityType: 'Task',
      entityId: task.id,
      details: { status, result: result?.substring(0, 100) },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(task);
}
