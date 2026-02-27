import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

// 创建协作任务
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
  const { title, description, participants, initiator } = body;

  if (!title || !initiator) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 创建协作任务
  const collaboration = await prisma.task.create({
    data: {
      agent: 'collaboration',
      title,
      description: JSON.stringify({
        description,
        participants: participants || [],
        initiator,
        phase: 'division', // division|discussion|integration
        proposals: [],
        status: 'in_progress'
      }),
      status: 'pending',
    },
  });

  // 向所有参与者发送消息
  const participantsList = participants || ['auditer', 'memory-console', 'dev-manager', 'system-events'];
  for (const agent of participantsList) {
    await prisma.message.create({
      data: {
        fromAgent: initiator,
        toAgent: agent,
        content: `协作任务: ${title}. ${description || ''}`,
        type: 'task',
      },
    });
  }

  return NextResponse.json({
    id: collaboration.id,
    title: collaboration.title,
    phase: 'division',
    participants: participantsList,
  });
}

// 获取协作任务状态
export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  }

  // 返回所有协作任务
  const tasks = await prisma.task.findMany({
    where: { agent: 'collaboration' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ tasks });
}
