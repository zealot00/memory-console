import { NextRequest } from 'next/server';
import { POST as batchPOST } from '@/app/api/memories/batch/route';

function createMockRequest(options: {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): NextRequest {
  const req = {
    method: 'POST',
    url: 'http://localhost:3000/api/memories/batch',
    headers: new Headers(options.headers || {}),
    nextUrl: new URL('http://localhost:3000/api/memories/batch'),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

jest.mock('@/lib/auth', () => ({
  withWriteAuth: (handler: any) => async (req: any) => {
    return handler(req, { namespace: 'test-ns', permissions: ['write'], tokenId: 'test-token' });
  },
  logAudit: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    memory: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('API: /api/memories/batch - Full Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('batch delete', () => {
    it('should delete multiple memories', async () => {
      (prisma.memory.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      const request = createMockRequest({
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          operation: 'delete',
          ids: ['mem-1', 'mem-2', 'mem-3'],
        },
      });

      const response = await batchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.operation).toBe('delete');
      expect(data.processed).toBe(3);
    });
  });

  describe('batch archive', () => {
    it('should archive multiple memories', async () => {
      (prisma.memory.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const request = createMockRequest({
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          operation: 'archive',
          ids: ['mem-1', 'mem-2'],
        },
      });

      const response = await batchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.operation).toBe('archive');
    });
  });

  describe('validation', () => {
    it('should require operation parameter', async () => {
      const request = createMockRequest({
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          ids: ['mem-1'],
        },
      });

      const response = await batchPOST(request);

      expect(response.status).toBe(400);
    });

    it('should limit batch size to 50', async () => {
      const request = createMockRequest({
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          operation: 'delete',
          ids: Array(51).fill('id'),
        },
      });

      const response = await batchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('50');
    });
  });
});
