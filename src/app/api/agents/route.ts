import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取认证 Token
function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

// 验证 Token
async function validateToken(token: string) {
  return prisma.apiToken.findUnique({ where: { token } });
}

// GET /api/agents - 获取 Agent 列表
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
  const status = searchParams.get('status');
  const namespace = searchParams.get('namespace');
  const statsOnly = searchParams.get('stats') === 'true';

  let where: any = {};
  if (status) where.status = status;
  if (namespace) where.namespace = namespace;

  // 统计信息
  if (statsOnly) {
    const total = await prisma.agent.count({ where });
    const online = await prisma.agent.count({ where: { ...where, status: 'online' } });
    const offline = await prisma.agent.count({ where: { ...where, status: 'offline' } });
    const busy = await prisma.agent.count({ where: { ...where, status: 'busy' } });

    return NextResponse.json({
      overall: { total, online, offline, busy },
    });
  }

  const agents = await prisma.agent.findMany({
    where,
    orderBy: { lastSeen: 'desc' },
    take: 50,
  });

  return NextResponse.json({ agents });
}

// POST /api/agents - 注册新 Agent
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
  const { name, displayName, capabilities, metadata, namespace = 'default' } = body;

  if (!name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
  }

  // 检查是否已存在
  const existing = await prisma.agent.findUnique({ where: { name } });
  if (existing) {
    // 更新现有 Agent 的状态
    const agent = await prisma.agent.update({
      where: { name },
      data: {
        displayName: displayName || existing.displayName,
        capabilities: capabilities || existing.capabilities,
        metadata: metadata || existing.metadata,
        status: 'online',
        lastSeen: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'agent_update',
        entityType: 'Agent',
        entityId: agent.id,
        details: { name, action: 'heartbeat' },
        tokenId: apiToken.id,
      },
    });

    return NextResponse.json(agent);
  }

  // 创建新 Agent
  const agent = await prisma.agent.create({
    data: {
      name,
      displayName,
      capabilities: capabilities || {},
      metadata: metadata || {},
      namespace,
      status: 'online',
    },
  });

  // 记录审计日志
  await prisma.auditLog.create({
    data: {
      action: 'agent_register',
      entityType: 'Agent',
      entityId: agent.id,
      details: { name, displayName },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(agent);
}

// PATCH /api/agents - 更新 Agent 状态
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
  const { agentId, name, status, capabilities, metadata } = body;

  if (!agentId && !name) {
    return NextResponse.json({ error: 'Missing required field: agentId or name' }, { status: 400 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (capabilities) updateData.capabilities = capabilities;
  if (metadata) updateData.metadata = metadata;
  if (status === 'online') updateData.lastSeen = new Date();

  const where = agentId ? { id: agentId } : { name: name! };

  const agent = await prisma.agent.update({
    where,
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: 'agent_update',
      entityType: 'Agent',
      entityId: agent.id,
      details: { status, capabilities },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json(agent);
}

// DELETE /api/agents - 删除 Agent
export async function DELETE(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateToken(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const name = searchParams.get('name');

  if (!agentId && !name) {
    return NextResponse.json({ error: 'Missing required field: agentId or name' }, { status: 400 });
  }

  const where = agentId ? { id: agentId } : { name: name! };

  const agent = await prisma.agent.delete({
    where,
  });

  await prisma.auditLog.create({
    data: {
      action: 'agent_delete',
      entityType: 'Agent',
      entityId: agent.id,
      details: { name: agent.name },
      tokenId: apiToken.id,
    },
  });

  return NextResponse.json({ success: true, agent });
}
