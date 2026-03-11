import { NextRequest } from 'next/server';
import { GET as memoriesGET, POST as memoriesPOST, PUT as memoriesPUT, DELETE as memoriesDELETE } from '@/app/api/memories/route';
import { mockPrisma } from '../setup';

// Mock request helper
function createMockRequest(options: {
  method: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/memories';
  const headers = new Headers(options.headers || {});
  
  // 模拟 request 对象
  const req = {
    method: options.method,
    url,
    headers,
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/memories', () => {
  describe('GET', () => {
    it('should return memories list with pagination', async () => {
      const mockMemories = [
        { id: '1', title: 'Test Memory', content: 'Content', namespace: 'default', status: 'active' },
        { id: '2', title: 'Test Memory 2', content: 'Content 2', namespace: 'default', status: 'active' },
      ];

      (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue(mockMemories);
      (mockPrisma.memory.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories?page=1&pageSize=20',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await memoriesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.page).toBe(1);
    });

    it('should filter memories by namespace', async () => {
      (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.memory.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories?namespace=custom',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await memoriesGET(request);

      expect(mockPrisma.memory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'custom',
          }),
        })
      );
    });

    it('should search memories by keyword', async () => {
      (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.memory.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories?search=test',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await memoriesGET(request);

      expect(mockPrisma.memory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('POST', () => {
    it('should create a new memory', async () => {
      const newMemory = {
        id: 'new-id',
        title: 'New Memory',
        content: 'New Content',
        namespace: 'default',
        status: 'active',
        owner: 'ai',
        source: 'memory-console',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.memory.create as jest.Mock).mockResolvedValue(newMemory);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          title: 'New Memory',
          content: 'New Content',
        },
      });

      const response = await memoriesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Memory');
      expect(mockPrisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Memory',
            content: 'New Content',
          }),
        })
      );
    });

    it('should create memory with custom namespace', async () => {
      const newMemory = {
        id: 'new-id',
        title: 'Custom NS Memory',
        content: 'Content',
        namespace: 'custom-ns',
        status: 'active',
      };

      (mockPrisma.memory.create as jest.Mock).mockResolvedValue(newMemory);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          title: 'Custom NS Memory',
          content: 'Content',
          namespace: 'custom-ns',
        },
      });

      await memoriesPOST(request);

      expect(mockPrisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namespace: 'custom-ns',
          }),
        })
      );
    });
  });

  describe('PUT', () => {
    it('should update an existing memory', async () => {
      const updatedMemory = {
        id: '1',
        title: 'Updated Title',
        content: 'Updated Content',
        namespace: 'default',
      };

      (mockPrisma.memory.update as jest.Mock).mockResolvedValue(updatedMemory);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/memories',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          id: '1',
          title: 'Updated Title',
          content: 'Updated Content',
        },
      });

      const response = await memoriesPUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
    });

    it('should return 400 when id is missing', async () => {
      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          title: 'No ID Update',
        },
      });

      const response = await memoriesPUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('should delete a memory', async () => {
      const memoryToDelete = {
        id: '1',
        title: 'To Delete',
        namespace: 'default',
      };

      (mockPrisma.memory.findUnique as jest.Mock).mockResolvedValue(memoryToDelete);
      (mockPrisma.memory.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/memories?id=1',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await memoriesDELETE(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.memory.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return 400 when id is missing', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/memories',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await memoriesDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID required');
    });
  });
});
