import { NextRequest } from 'next/server';
import { GET as messagesGET, POST as messagesPOST } from '@/app/api/messages/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  method: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/messages';
  
  const req = {
    method: options.method,
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/messages - Namespace Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'token-1',
      namespace: 'test-ns',
    });
  });

  describe('POST', () => {
    it('should create message with namespace from token', async () => {
      const newMessage = {
        id: 'msg-1',
        fromAgent: 'main',
        toAgent: 'auditer',
        content: 'Test',
        namespace: 'test-ns',
      };

      (mockPrisma.message.create as jest.Mock).mockResolvedValue(newMessage);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/messages',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          fromAgent: 'main',
          toAgent: 'auditer',
          content: 'Test',
        },
      });

      await messagesPOST(request);

      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            namespace: 'test-ns',
          }),
        })
      );
    });
  });

  describe('GET', () => {
    it('should filter messages by namespace from token', async () => {
      const mockMessages = [
        { id: 'msg-1', fromAgent: 'main', toAgent: 'auditer', namespace: 'test-ns' },
      ];

      (mockPrisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/messages?agent=auditer',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await messagesGET(request);

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'test-ns',
          }),
        })
      );
    });
  });
});
