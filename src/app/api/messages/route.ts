import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 获取认证头
function getAuthHeaders(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}

// 发送消息
export async function POST(request: NextRequest) {
  const token = getAuthHeaders(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 验证 token
  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const { fromAgent, toAgent, content, type = 'notification' } = body;

  if (!fromAgent || !toAgent || !content) {
    return NextResponse.json(
      { error: 'Missing required fields: fromAgent, toAgent, content' },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      fromAgent,
      toAgent,
      content,
      type,
      status: 'unread',
    },
  });

  // 记录到审计日志
  await prisma.auditLog.create({
    data: {
      action: 'message_send',
      resource: 'message',
      resourceId: message.id,
      entityType: 'Message',
      details: { fromAgent, toAgent, type },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(message);
}

// 获取消息 / 事件流
export async function GET(request: NextRequest) {
  const token = getAuthHeaders(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');
  const since = searchParams.get('since');
  const feed = searchParams.get('feed') === 'true';

  let where: any = {};

  if (feed && since) {
    // 事件流：获取指定时间后的消息
    where.createdAt = { gte: new Date(since) };
  } else if (agent) {
    // 获取发送给特定 Agent 的消息
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

// 导出广播函数供其他模块使用
export { broadcastToAgent };
