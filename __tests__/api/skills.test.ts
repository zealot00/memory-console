import { NextRequest } from 'next/server';
import { GET as skillsGET, POST as skillsPOST, PUT as skillsPUT, DELETE as skillsDELETE } from '@/app/api/skills/route';
import { mockPrisma } from '../setup';

// Mock request helper
function createMockRequest(options: {
  method: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/skills';
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

describe('API: /api/skills', () => {
  describe('GET', () => {
    it('should return skills list', async () => {
      const mockSkills = [
        { id: '1', name: 'test-skill', description: 'Test', status: 'approved', isPublic: true },
        { id: '2', name: 'another-skill', description: 'Another', status: 'draft', isPublic: false },
      ];

      (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue(mockSkills);
      (mockPrisma.skill.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/skills',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await skillsGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
    });

    it('should filter by status', async () => {
      (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.skill.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/skills?status=approved',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await skillsGET(request);

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'approved',
          }),
        })
      );
    });

    it('should filter by public status', async () => {
      (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.skill.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/skills?public=true',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      await skillsGET(request);

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
          }),
        })
      );
    });
  });

  describe('POST', () => {
    it('should create a new skill', async () => {
      const newSkill = {
        id: 'new-id',
        name: 'new-skill',
        description: 'New skill description',
        schemaPayload: {},
        version: 1,
        authorInstance: 'system',
        isPublic: false,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.skill.create as jest.Mock).mockResolvedValue(newSkill);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          name: 'new-skill',
          description: 'New skill description',
        },
      });

      const response = await skillsPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('new-skill');
      expect(data.status).toBe('draft');
    });

    it('should create skill with custom fields', async () => {
      const newSkill = {
        id: 'new-id',
        name: 'custom-skill',
        description: 'Custom',
        schemaPayload: { input: { type: 'object' } },
        authorInstance: 'custom-instance',
        isPublic: true,
        status: 'approved',
      };

      (mockPrisma.skill.create as jest.Mock).mockResolvedValue(newSkill);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          name: 'custom-skill',
          description: 'Custom',
          schemaPayload: { input: { type: 'object' } },
          authorInstance: 'custom-instance',
        },
      });

      await skillsPOST(request);

      expect(mockPrisma.skill.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'custom-skill',
            authorInstance: 'custom-instance',
          }),
        })
      );
    });
  });

  describe('PUT', () => {
    it('should update an existing skill', async () => {
      const oldSkill = { id: '1', name: 'old-name', status: 'draft' };
      const updatedSkill = {
        id: '1',
        name: 'updated-name',
        description: 'Updated',
        status: 'approved',
        version: 2,
      };

      (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(oldSkill);
      (mockPrisma.skill.update as jest.Mock).mockResolvedValue(updatedSkill);
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          id: '1',
          name: 'updated-name',
          status: 'approved',
        },
      });

      const response = await skillsPUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('updated-name');
    });

    it('should return 400 when id is missing', async () => {
      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          name: 'no-id-skill',
        },
      });

      const response = await skillsPUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID required');
    });

    it('should handle update errors', async () => {
      const error = { code: 'P2025' };
      (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.skill.update as jest.Mock).mockRejectedValue(error);

      const request = createMockRequest({
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test-token' },
        body: {
          id: 'nonexistent',
          name: 'update',
        },
      });

      const response = await skillsPUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('should delete a skill', async () => {
      const skillToDelete = {
        id: '1',
        name: 'to-delete',
      };

      (mockPrisma.skill.findUnique as jest.Mock).mockResolvedValue(skillToDelete);
      (mockPrisma.skill.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/skills?id=1',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await skillsDELETE(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.skill.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return 400 when id is missing', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/skills',
        headers: { 'Authorization': 'Bearer test-token' },
      });

      const response = await skillsDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID required');
    });
  });
});
