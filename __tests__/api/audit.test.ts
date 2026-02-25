import { NextRequest } from 'next/server';
import { GET as auditGET } from '@/app/api/audit/route';
import { mockPrisma } from '../setup';

// Mock request helper
function createMockRequest(options: {
  url?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/audit';
  const headers = new Headers(options.headers || {});
  
  const req = {
    method: 'GET',
    url,
    headers,
    nextUrl: new URL(url),
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/audit', () => {
  describe('GET', () => {
    it('should return audit logs list', async () => {
      const mockLogs = [
        { id: '1', action: 'create', entityType: 'memory', entityId: 'mem-1', namespace: 'default' },
        { id: '2', action: 'read', entityType: 'skill', entityId: 'skill-1', namespace: 'default' },
      ];

      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(2);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit',
      });

      const response = await auditGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by entity type', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?entityType=memory',
      });

      await auditGET(request);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'memory',
          }),
        })
      );
    });

    it('should filter by action', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?action=delete',
      });

      await auditGET(request);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'delete',
          }),
        })
      );
    });

    it('should filter by namespace', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?namespace=custom-ns',
      });

      await auditGET(request);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'custom-ns',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(100);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?page=2&pageSize=10',
      });

      const response = await auditGET(request);
      const data = await response.json();

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page-1) * pageSize = (2-1) * 10 = 10
          take: 10,
        })
      );
      expect(data.page).toBe(2);
      expect(data.totalPages).toBe(10);
    });

    it('should return logs sorted by createdAt descending', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit',
      });

      await auditGET(request);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should combine multiple filters', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?entityType=memory&action=create&namespace=default',
      });

      await auditGET(request);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'memory',
            action: 'create',
            namespace: 'default',
          }),
        })
      );
    });
  });
});
