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
  const headers = new Headers(options.headers || {});
  
  const req = {
    method: options.method,
    url,
    headers,
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/messages', () => {
  describe('POST', () => {
    it('should create a new message', async () => {
      const newMessage = {
        id: 'msg-1',
        fromAgent: 'main',
        toAgent: 'auditer',
        content: 'Test message',
        type: 'notification',
        status: 'unread',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.message.create as jest.Mock).mockResolvedValue(newMessage);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/messages',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          fromAgent: 'main',
          toAgent: 'auditer',
          content: 'Test message',
        },
      });

      const response = await messagesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fromAgent).toBe('main');
      expect(data.toAgent).toBe('auditer');
    });

    it('should reject message with missing required fields', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/messages',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          fromAgent: 'main',
        },
      });

      const response = await messagesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/messages',
        body: {
          fromAgent: 'main',
          toAgent: 'auditer',
          content: 'Test',
        },
      });

      const response = await messagesPOST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('GET', () => {
    it('should return messages for specific agent', async () => {
      const mockMessages = [
        { id: 'msg-1', fromAgent: 'main', toAgent: 'auditer', content: 'Hello' },
        { id: 'msg-2', fromAgent: 'system', toAgent: 'auditer', content: 'Welcome' },
      ];

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/messages?agent=auditer',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await messagesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should reject unauthenticated request', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/messages?agent=auditer',
      });

      const response = await messagesGET(request);

      expect(response.status).toBe(401);
    });
  });
});
