import { NextRequest } from 'next/server';
import { POST as searchPOST } from '@/app/api/memories/search/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  method: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/memories/search';
  
  const req = {
    method: options.method,
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

jest.mock('@/lib/auth', () => ({
  withReadAuth: (handler: any) => async (req: any) => {
    return handler(req, { namespace: 'test-ns', permissions: ['read'], tokenId: 'test-token' });
  },
  logAudit: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/embedding', () => ({
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  cosineSimilarity: jest.fn().mockReturnValue(0.8),
}));

describe('API: /api/memories/search - Semantic Search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should search memories with query', async () => {
      const mockMemories = [
        { id: 'mem-1', title: 'Test Memory', content: 'Content here', tags: ['test'], namespace: 'test-ns' },
      ];

      (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue(mockMemories);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories/search',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          query: 'test',
          namespace: 'test-ns',
        },
      });

      const response = await searchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe('test');
    });

    it('should require query parameter', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories/search',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {},
      });

      const response = await searchPOST(request);

      expect(response.status).toBe(400);
    });

    it('should filter by namespace from token', async () => {
      (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories/search',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          query: 'test',
        },
      });

      await searchPOST(request);

      expect(mockPrisma.memory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'test-ns',
            status: 'active',
          }),
        })
      );
    });
  });
});
