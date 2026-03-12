import { NextRequest } from 'next/server';
import { GET as tasksGET } from '@/app/api/tasks/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  method: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/tasks';
  
  const req = {
    method: options.method,
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/tasks - Stats GroupBy Namespace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'token-1',
      namespace: 'test-ns',
    });
  });

  describe('GET stats', () => {
    it('should filter groupBy by namespace', async () => {
      (mockPrisma.task.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.task.groupBy as jest.Mock).mockResolvedValue([
        { agent: 'auditer', status: 'pending', _count: 5 },
        { agent: 'main', status: 'completed', _count: 5 },
      ]);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tasks?stats=true',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await tasksGET(request);

      expect(mockPrisma.task.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['agent', 'status'],
          where: expect.objectContaining({
            namespace: 'test-ns',
          }),
        })
      );
    });
  });
});
