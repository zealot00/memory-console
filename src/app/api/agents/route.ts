import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIP, errorResponse, validationError } from '@/lib/utils';
import { CreateAgentSchema, UpdateAgentSchema } from '@/lib/schemas';

function getAuthToken(request: NextRequest) {
  return request.headers.get('Authorization')?.replace('Bearer ', '');
}

async function validateTokenWithNamespace(token: string) {
  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (apiToken) return apiToken;
  
  const devToken = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
  if (devToken && token === devToken) {
    return { id: 'dev', name: 'dev-token', namespace: 'default' };
  }
  return null;
}

function getTokenNamespace(apiToken: { namespace?: string } | null): string {
  return apiToken?.namespace || 'default';
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateTokenWithNamespace(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const statsOnly = searchParams.get('stats') === 'true';

  const namespace = getTokenNamespace(apiToken);
  
  const where: Record<string, unknown> = { namespace };
  if (status) where.status = status;

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

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateTokenWithNamespace(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const validated = CreateAgentSchema.safeParse(body);

  if (!validated.success) {
    return validationError(validated.error);
  }

  const { name, displayName, capabilities, metadata } = body;
  const namespace = getTokenNamespace(apiToken);

  const existing = await prisma.agent.findUnique({ where: { name_namespace: { name, namespace } } });
  if (existing) {
    const agent = await prisma.agent.update({
      where: { name_namespace: { name, namespace } },
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
        ipAddress: getClientIP(request),
      },
    });

    return NextResponse.json(agent);
  }

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

  await prisma.auditLog.create({
    data: {
      action: 'agent_register',
      entityType: 'Agent',
      entityId: agent.id,
      details: { name, displayName },
      tokenId: apiToken.id,
      ipAddress: getClientIP(request),
    },
  });

  return NextResponse.json(agent);
}

export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateTokenWithNamespace(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const validated = UpdateAgentSchema.safeParse(body);

  if (!validated.success) {
    return validationError(validated.error);
  }

  const { agentId, name, status, capabilities, metadata } = body;

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (capabilities) updateData.capabilities = capabilities;
  if (metadata) updateData.metadata = metadata;
  if (status === 'online') updateData.lastSeen = new Date();

  const namespace = getTokenNamespace(apiToken);
  const where = agentId 
    ? { id: agentId, namespace } 
    : { name_namespace: { name: name!, namespace } };

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
      ipAddress: getClientIP(request),
    },
  });

  return NextResponse.json(agent);
}

export async function DELETE(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiToken = await validateTokenWithNamespace(token);
  if (!apiToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const name = searchParams.get('name');

  if (!agentId && !name) {
    return NextResponse.json({ error: 'Missing required field: agentId or name' }, { status: 400 });
  }

  const namespace = getTokenNamespace(apiToken);
  const where = agentId 
    ? { id: agentId, namespace } 
    : { name_namespace: { name: name!, namespace } };

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
      ipAddress: getClientIP(request),
    },
  });

  return NextResponse.json({ success: true, agent });
}
