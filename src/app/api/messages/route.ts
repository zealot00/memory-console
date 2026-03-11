import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastToAgent } from '@/lib/sse';
import { CreateMessageSchema } from '@/lib/schemas';

function getAuthHeaders(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
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
  const token = getAuthHeaders(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const validated = CreateMessageSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.errors[0].message },
      { status: 400 }
    );
  }

  const { fromAgent, toAgent, content, type = 'notification' } = body;

  const message = await prisma.message.create({
    data: {
      fromAgent,
      toAgent,
      content,
      type,
      status: 'unread',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'message_send',
      entityType: 'Message',
      entityId: message.id,
      details: { fromAgent, toAgent, type },
      tokenId: apiToken.id,
    },
  });

  broadcastToAgent(toAgent, {
    type: 'message',
    data: message,
  });

  return NextResponse.json(message);
}

export async function GET(request: NextRequest) {
  const token = getAuthHeaders(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const since = searchParams.get('since');
  const feed = searchParams.get('feed') === 'true';

  const where: Record<string, unknown> = {};

  if (feed && since) {
    where.createdAt = { gte: new Date(since) };
  } else if (agent) {
    where.toAgent = agent;
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: feed ? 50 : 20,
  });

  return NextResponse.json({
    messages,
    total: messages.length,
  });
}

export async function PATCH(request: NextRequest) {
  const token = getAuthHeaders(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const { messageIds, agent, markAs } = body;

  if (messageIds && Array.isArray(messageIds)) {
    const updated = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
      },
      data: {
        status: markAs || 'read',
      },
    });

    return NextResponse.json({
      success: true,
      updated: updated.count,
    });
  }

  if (agent) {
    const updated = await prisma.message.updateMany({
      where: {
        toAgent: agent,
        status: 'unread',
      },
      data: {
        status: markAs || 'read',
      },
    });

    return NextResponse.json({
      success: true,
      updated: updated.count,
    });
  }

  return NextResponse.json(
    { error: 'messageIds or agent is required' },
    { status: 400 }
  );
}
