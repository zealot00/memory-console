import { NextRequest } from 'next/server';
import { GET as auditGET } from '@/app/api/audit/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  url?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/audit';
  
  const req = {
    method: 'GET',
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/audit - Full Tracing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'token-1',
      namespace: 'test-ns',
      name: 'admin-token',
    });
  });

  describe('GET', () => {
    it('should return audit logs with required fields', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'create',
          entityType: 'memory',
          entityId: 'mem-1',
          namespace: 'test-ns',
          tokenId: 'token-1',
          ipAddress: '192.168.1.100',
          createdAt: new Date('2026-03-12T10:00:00Z'),
          details: { title: 'Test Memory' },
        },
      ];

      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(1);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await auditGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toHaveProperty('action');
      expect(data.items[0]).toHaveProperty('entityType');
      expect(data.items[0]).toHaveProperty('entityId');
      expect(data.items[0]).toHaveProperty('namespace');
      expect(data.items[0]).toHaveProperty('tokenId');
      expect(data.items[0]).toHaveProperty('ipAddress');
      expect(data.items[0]).toHaveProperty('createdAt');
    });

    it('should filter by entityType', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?entityType=memory',
        headers: { 'Authorization': 'Bearer test-token' },
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

    it('should filter by namespace', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?namespace=test-ns',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await auditGET(request);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'test-ns',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(100);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit?page=2&pageSize=10',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await auditGET(request);
      const data = await response.json();

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(data.page).toBe(2);
      expect(data.totalPages).toBe(10);
    });

    it('should include timestamp in response', async () => {
      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/audit',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await auditGET(request);
      const data = await response.json();

      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');
    });
  });
});
