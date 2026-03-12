import { NextRequest } from 'next/server';
import { GET as streamGET } from '@/app/api/messages/stream/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  url?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/messages/stream?agent=main';
  
  const req = {
    method: 'GET',
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/messages/stream - SSE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'token-1',
      namespace: 'test-ns',
    });
  });

  describe('GET', () => {
    it('should require authorization', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/messages/stream?agent=main',
      });

      const response = await streamGET(request);

      expect(response.status).toBe(401);
    });

    it('should require agent parameter', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/messages/stream',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await streamGET(request);

      expect(response.status).toBe(400);
    });

    it('should accept valid token and agent', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/messages/stream?agent=main',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await streamGET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
    });
  });
});
