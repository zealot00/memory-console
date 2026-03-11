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

describe('API: /api/tasks', () => {
  describe('POST', () => {
    it('should create a new task', async () => {
      const newTask = {
        id: 'task-1',
        agent: 'auditer',
        title: 'Audit code',
        description: 'Review PR #123',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.task.create as jest.Mock).mockResolvedValue(newTask);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          agent: 'auditer',
          title: 'Audit code',
          description: 'Review PR #123',
        },
      });

      const response = await tasksPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agent).toBe('auditer');
      expect(data.title).toBe('Audit code');
      expect(data.status).toBe('pending');
    });

    it('should reject task without required fields', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          agent: 'auditer',
        },
      });

      const response = await tasksPOST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('GET', () => {
    it('should return task list', async () => {
      const mockTasks = [
        { id: 'task-1', agent: 'auditer', title: 'Task 1', status: 'pending' },
        { id: 'task-2', agent: 'main', title: 'Task 2', status: 'completed' },
      ];

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await tasksGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks).toHaveLength(2);
    });

    it('should return stats when stats=true', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.task.count as jest.Mock)
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(3)   // pending
        .mockResolvedValueOnce(2)   // inProgress
        .mockResolvedValueOnce(4)   // completed
        .mockResolvedValueOnce(1);  // failed
      (mockPrisma.task.groupBy as jest.Mock).mockResolvedValue([
        { agent: 'auditer', status: 'pending', _count: 2 },
        { agent: 'main', status: 'completed', _count: 3 },
      ]);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tasks?stats=true',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await tasksGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall.total).toBe(10);
      expect(data.overall.pending).toBe(3);
      expect(data.overall.completed).toBe(4);
    });
  });

  describe('PATCH', () => {
    it('should update task status', async () => {
      const updatedTask = {
        id: 'task-1',
        agent: 'auditer',
        title: 'Audit code',
        status: 'completed',
        result: 'All good',
        completedAt: new Date(),
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.task.update as jest.Mock).mockResolvedValue(updatedTask);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          taskId: 'task-1',
          status: 'completed',
          result: 'All good',
        },
      });

      const response = await tasksPATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.result).toBe('All good');
    });

    it('should reject update without taskId', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/tasks',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          status: 'completed',
        },
      });

      const response = await tasksPATCH(request);

      expect(response.status).toBe(400);
    });
  });
});
