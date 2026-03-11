import { NextRequest } from 'next/server';
import { GET as agentsGET, POST as agentsPOST, PATCH as agentsPATCH, DELETE as agentsDELETE } from '@/app/api/agents/route';
import { mockPrisma } from '../setup';

function createMockRequest(options: {
  method: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/agents';
  
  const req = {
    method: options.method,
    url,
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
    json: async () => options.body || {},
  } as unknown as NextRequest;

  return req;
}

describe('API: /api/agents', () => {
  describe('GET', () => {
    it('should return agent list', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'main', status: 'online' },
        { id: 'agent-2', name: 'auditer', status: 'offline' },
      ];

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/agents',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await agentsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agents).toHaveLength(2);
    });

    it('should return stats when stats=true', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.agent.count as jest.Mock)
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(5)   // online
        .mockResolvedValueOnce(3)   // offline
        .mockResolvedValueOnce(2);  // busy

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/agents?stats=true',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await agentsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overall.total).toBe(10);
      expect(data.overall.online).toBe(5);
      expect(data.overall.offline).toBe(3);
    });
  });

  describe('POST', () => {
    it('should register a new agent', async () => {
      const newAgent = {
        id: 'agent-1',
        name: 'new-agent',
        displayName: 'New Agent',
        status: 'online',
        namespace: 'default',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.agent.create as jest.Mock).mockResolvedValue(newAgent);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/agents',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          name: 'new-agent',
          displayName: 'New Agent',
        },
      });

      const response = await agentsPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('new-agent');
      expect(data.status).toBe('online');
    });

    it('should update existing agent on re-registration', async () => {
      const existingAgent = {
        id: 'agent-1',
        name: 'main',
        displayName: 'Main Agent',
        status: 'online',
      };

      const updatedAgent = {
        ...existingAgent,
        lastSeen: new Date(),
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(existingAgent);
      (mockPrisma.agent.update as jest.Mock).mockResolvedValue(updatedAgent);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/agents',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          name: 'main',
        },
      });

      const response = await agentsPOST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.agent.update).toHaveBeenCalled();
    });

    it('should reject agent without name', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/agents',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          displayName: 'No Name Agent',
        },
      });

      const response = await agentsPOST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH', () => {
    it('should update agent status', async () => {
      const updatedAgent = {
        id: 'agent-1',
        name: 'main',
        status: 'busy',
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.agent.update as jest.Mock).mockResolvedValue(updatedAgent);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/agents',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          agentId: 'agent-1',
          status: 'busy',
        },
      });

      const response = await agentsPATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('busy');
    });
  });

  describe('DELETE', () => {
    it('should delete an agent', async () => {
      const agentToDelete = {
        id: 'agent-1',
        name: 'main',
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });
      (mockPrisma.agent.delete as jest.Mock).mockResolvedValue(agentToDelete);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/agents?agentId=agent-1',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await agentsDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should require agentId or name', async () => {
      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({ id: 'token-1' });

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/agents',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await agentsDELETE(request);

      expect(response.status).toBe(400);
    });
  });
});
