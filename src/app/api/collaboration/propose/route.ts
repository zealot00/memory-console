import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

// 提交提案
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
  const { collaborationId, agent, proposal, evidence } = body;

  if (!collaborationId || !agent || !proposal) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: collaborationId } });
  if (!task || task.agent !== 'collaboration') {
    return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 });
  }

  const taskData = JSON.parse(task.description || '{}');
  const proposals = taskData.proposals || [];

  proposals.push({
    agent,
    proposal,
    evidence: evidence || '',
    timestamp: new Date().toISOString(),
    votes: 0,
  });

  const updatedTask = await prisma.task.update({
    where: { id: collaborationId },
    data: {
      description: JSON.stringify({
        ...taskData,
        proposals,
        phase: 'discussion',
      }),
    },
  });

  // 广播提案
  const participants = taskData.participants || [];
  for (const participant of participants) {
    if (participant !== agent) {
      await prisma.message.create({
        data: {
          fromAgent: agent,
          toAgent: participant,
          content: `新提案 [${agent}]: ${proposal}`,
          type: 'proposal',
          metadata: JSON.stringify({ collaborationId, evidence }),
        },
      });
    }
  }

  return NextResponse.json({ success: true, totalProposals: proposals.length });
}
