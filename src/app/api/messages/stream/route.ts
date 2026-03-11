import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addSSEClient, removeSSEClient } from '@/lib/sse';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const apiToken = await prisma.apiToken.findUnique({ where: { token } });
  if (!apiToken) {
    // 兼容：从环境变量读取 dev token
    const devToken = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
    if (!devToken || token !== devToken) {
      return new Response('Invalid token', { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent');

  if (!agent) {
    return new Response('Missing agent parameter', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(agent, controller);
      
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
      removeSSEClient(agent, controller);
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
