import { NextRequest } from 'next/server';

// 模拟 SSE 客户端连接 (内存存储，生产环境应使用 Redis)
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (!apiToken) {
    return new Response('Invalid token', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');

  if (!agent) {
    return new Response('Missing agent parameter', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      if (!clients.has(agent)) {
        clients.set(agent, new Set());
      }
      clients.get(agent)!.add(controller);
      
      controller.enqueue(new TextEncoder().encode(`data: {"type":"connected","agent":"${agent}"}\n\n`));
      
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);
    },
    cancel(controller) {
      if (clients.has(agent)) {
        clients.get(agent)!.delete(controller);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
