import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

// 投票
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
  const { collaborationId, agent, targetAgent, reason } = body;

  if (!collaborationId || !agent || !targetAgent) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: collaborationId } });
  if (!task || task.agent !== 'collaboration') {
    return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 });
  }

  const taskData = JSON.parse(task.description || '{}');
  const proposals = taskData.proposals || [];

  // 更新提案投票
  for (const p of proposals) {
    if (p.agent === targetAgent) {
      p.votes = (p.votes || 0) + 1;
      p.voters = p.voters || [];
      p.voters.push({ agent, reason, timestamp: new Date().toISOString() });
    }
  }

  // 广播投票消息
  await prisma.message.create({
    data: {
      fromAgent: agent,
      toAgent: 'main', // 协调者
      content: `投票给 [${targetAgent}]: ${reason || '支持'}`,
      type: 'vote',
      metadata: JSON.stringify({ collaborationId, targetAgent }),
    },
  });

  return NextResponse.json({ success: true, proposals });
}
