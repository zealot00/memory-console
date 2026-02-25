import { NextRequest } from 'next/server';
import { GET as tokensGET, POST as tokensPOST, PUT as tokensPUT, DELETE as tokensDELETE } from '@/app/api/tokens/route';
import { mockPrisma } from '../setup';

// Mock request helper
function createMockRequest(options: {
  method: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/tokens';
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

describe('API: /api/tokens', () => {
  describe('GET', () => {
    it('should return tokens list', async () => {
      const mockTokens = [
        { id: '1', name: 'dev-token', namespace: 'default', permissions: ['read', 'write'] },
        { id: '2', name: 'admin-token', namespace: 'default', permissions: ['admin'] },
      ];

      (mockPrisma.apiToken.findMany as jest.Mock).mockResolvedValue(mockTokens);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tokens',
        headers: { 'Authorization': 'Bearer admin-token' },
      });

      const response = await tokensGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });

    it('should filter by namespace', async () => {
      (mockPrisma.apiToken.findMany as jest.Mock).mockResolvedValue([]);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/tokens?namespace=custom',
        headers: { 'Authorization': 'Bearer admin-token' },
      });

      await tokensGET(request);

      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'custom',
          }),
        })
      );
    });
  });

  describe('POST', () => {
    it('should create a new token', async () => {
      const newToken = {
        id: 'new-id',
        name: 'test-token',
        token: 'hashed-token-value',
        namespace: 'default',
        permissions: ['read'],
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.apiToken.create as jest.Mock).mockResolvedValue(newToken);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: {
          name: 'test-token',
          permissions: ['read'],
        },
      });

      const response = await tokensPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('test-token');
      expect(data.token).toBeDefined(); // Token should be returned once
    });

    it('should create token with custom namespace', async () => {
      const newToken = {
        id: 'new-id',
        name: 'custom-ns-token',
        token: 'token-value',
        namespace: 'custom-ns',
        permissions: ['read', 'write'],
      };

      (mockPrisma.apiToken.create as jest.Mock).mockResolvedValue(newToken);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: {
          name: 'custom-ns-token',
          namespace: 'custom-ns',
          permissions: ['read', 'write'],
        },
      });

      await tokensPOST(request);

      expect(mockPrisma.apiToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'custom-ns-token',
            namespace: 'custom-ns',
          }),
        })
      );
    });

    it('should create token with expiration', async () => {
      const expiresAt = new Date('2025-12-31');
      const newToken = {
        id: 'new-id',
        name: 'temp-token',
        token: 'token-value',
        namespace: 'default',
        expiresAt,
      };

      (mockPrisma.apiToken.create as jest.Mock).mockResolvedValue(newToken);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: {
          name: 'temp-token',
          expiresAt: '2025-12-31',
        },
      });

      const response = await tokensPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(new Date(data.expiresAt).getFullYear()).toBe(2025);
    });
  });

  describe('PUT', () => {
    it('should update a token', async () => {
      const updatedToken = {
        id: '1',
        name: 'updated-token',
        namespace: 'default',
        permissions: ['read', 'write', 'admin'],
        expiresAt: null,
      };

      (mockPrisma.apiToken.update as jest.Mock).mockResolvedValue(updatedToken);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: {
          id: '1',
          permissions: ['read', 'write', 'admin'],
        },
      });

      const response = await tokensPUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.permissions).toContain('admin');
    });

    it('should return 400 when id is missing', async () => {
      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: {
          name: 'no-id-token',
        },
      });

      const response = await tokensPUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID required');
    });

    it('should return 404 when token not found', async () => {
      const error = { code: 'P2025' };
      (mockPrisma.apiToken.update as jest.Mock).mockRejectedValue(error);

      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer admin-token' },
        body: {
          id: 'nonexistent',
          name: 'update',
        },
      });

      const response = await tokensPUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Token not found');
    });
  });

  describe('DELETE', () => {
    it('should delete a token', async () => {
      const tokenToDelete = {
        id: '1',
        name: 'to-delete',
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue(tokenToDelete);
      (mockPrisma.apiToken.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/tokens?id=1',
        headers: { 'Authorization': 'Bearer admin-token' },
      });

      const response = await tokensDELETE(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.apiToken.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return 400 when id is missing', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/tokens',
        headers: { 'Authorization': 'Bearer admin-token' },
      });

      const response = await tokensDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID required');
    });
  });
});
