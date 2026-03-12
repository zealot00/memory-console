import { NextRequest } from 'next/server';
import { GET as tasksGET, POST as tasksPOST, PATCH as tasksPATCH } from '@/app/api/tasks/route';
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

describe('API: /api/tasks - Namespace Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'token-1',
      namespace: 'test-ns',
    });
  });

  describe('GET', () => {
    it('should filter tasks by namespace from token', async () => {
      const mockTasks = [
        { id: 'task-1', agent: 'auditer', title: 'Task 1', namespace: 'test-ns' },
      ];

      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await tasksGET(request);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'test-ns',
          }),
        })
      );
    });
  });

  describe('POST', () => {
    it('should create task with namespace from token', async () => {
      const newTask = {
        id: 'task-1',
        agent: 'auditer',
        title: 'Test Task',
        namespace: 'test-ns',
        status: 'pending',
      };

      (mockPrisma.task.create as jest.Mock).mockResolvedValue(newTask);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          agent: 'auditer',
          title: 'Test Task',
        },
      });

      await tasksPOST(request);

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namespace: 'test-ns',
          }),
        })
      );
    });
  });
});
