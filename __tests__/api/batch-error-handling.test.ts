import { NextRequest } from 'next/server';
import { POST as batchPOST } from '@/app/api/memories/batch/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  method: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/memories/batch';
  
  const req = {
    method: options.method,
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/memories/batch - Error Handling', () => {
  const mockAuth = { namespace: 'test-ns', permissions: ['write'], tokenId: 'token-1' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(require('@/lib/auth'), 'withWriteAuth').mockImplementation((handler: any) => async (req: any) => {
      return handler(req, mockAuth);
    });
  });

  describe('batch update', () => {
    it('should handle individual update failures gracefully', async () => {
      const error = { code: 'P2025', message: 'Record not found' };
      
      (mockPrisma.memory.update as jest.Mock)
        .mockResolvedValueOnce({ id: 'mem-1' })
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ id: 'mem-3' });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories/batch',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          operation: 'update',
          ids: ['mem-1', 'mem-2', 'mem-3'],
          data: { title: 'Updated Title' },
        },
      });

      const response = await batchPOST(request);
      
      expect(response.status).not.toBe(500);
    });

    it('should succeed when all records exist', async () => {
      (mockPrisma.memory.update as jest.Mock)
        .mockResolvedValue({ id: 'mem-1', title: 'Updated' })
        .mockResolvedValue({ id: 'mem-2', title: 'Updated' });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories/batch',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          operation: 'update',
          ids: ['mem-1', 'mem-2'],
          data: { title: 'Updated Title' },
        },
      });

      const response = await batchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(2);
    });
  });
});
