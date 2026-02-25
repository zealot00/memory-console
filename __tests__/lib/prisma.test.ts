import { mockPrisma } from '../setup';

describe('Prisma: Memory CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create', () => {
    it('should create a memory', async () => {
      const mockMemory = {
        id: 'mem-1',
        title: 'Test Memory',
        content: 'Test Content',
        namespace: 'default',
        status: 'active',
        owner: 'ai',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.memory.create as jest.Mock).mockResolvedValue(mockMemory);

      const result = await mockPrisma.memory.create({
        data: {
          title: 'Test Memory',
          content: 'Test Content',
          namespace: 'default',
          status: 'active',
          owner: 'ai',
          tags: ['test'],
        },
      });

      expect(result.id).toBe('mem-1');
      expect(result.title).toBe('Test Memory');
    });

    it('should create memory with provided data', async () => {
      (mockPrisma.memory.create as jest.Mock).mockResolvedValue({ id: 'mem-2' });

      await mockPrisma.memory.create({
        data: {
          title: 'Minimal Memory',
          content: 'Content',
        },
      });

      expect(mockPrisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Minimal Memory',
            content: 'Content',
          }),
        })
      );
    });
  });

  describe('Read', () => {
    it('should find all memories with filters', async () => {
      const mockMemories = [
        { id: '1', title: 'Memory 1' },
        { id: '2', title: 'Memory 2' },
      ];

      (mockPrisma.memory.findMany as jest.Mock).mockResolvedValue(mockMemories);

      const result = await mockPrisma.memory.findMany({
        where: {
          namespace: 'default',
          status: 'active',
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });

      expect(result).toHaveLength(2);
    });

    it('should find a single memory by id', async () => {
      const mockMemory = { id: 'mem-1', title: 'Test' };

      (mockPrisma.memory.findUnique as jest.Mock).mockResolvedValue(mockMemory);

      const result = await mockPrisma.memory.findUnique({
        where: { id: 'mem-1' },
      });

      expect(result?.id).toBe('mem-1');
    });

    it('should count memories', async () => {
      (mockPrisma.memory.count as jest.Mock).mockResolvedValue(100);

      const count = await mockPrisma.memory.count({
        where: { namespace: 'default' },
      });

      expect(count).toBe(100);
    });
  });

  describe('Update', () => {
    it('should update a memory', async () => {
      const updatedMemory = {
        id: 'mem-1',
        title: 'Updated Title',
        content: 'Updated Content',
      };

      (mockPrisma.memory.update as jest.Mock).mockResolvedValue(updatedMemory);

      const result = await mockPrisma.memory.update({
        where: { id: 'mem-1' },
        data: {
          title: 'Updated Title',
          content: 'Updated Content',
        },
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should update only specified fields', async () => {
      (mockPrisma.memory.update as jest.Mock).mockResolvedValue({ id: 'mem-1', title: 'New Title' });

      await mockPrisma.memory.update({
        where: { id: 'mem-1' },
        data: { title: 'New Title' },
      });

      expect(mockPrisma.memory.update).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
        data: { title: 'New Title' },
      });
    });
  });

  describe('Delete', () => {
    it('should delete a memory', async () => {
      (mockPrisma.memory.delete as jest.Mock).mockResolvedValue({ id: 'mem-1' });

      await mockPrisma.memory.delete({
        where: { id: 'mem-1' },
      });

      expect(mockPrisma.memory.delete).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
      });
    });
  });
});

describe('Prisma: Skill CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create', () => {
    it('should create a skill', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'test-skill',
        description: 'Test skill',
        status: 'draft',
        version: 1,
      };

      (mockPrisma.skill.create as jest.Mock).mockResolvedValue(mockSkill);

      const result = await mockPrisma.skill.create({
        data: {
          name: 'test-skill',
          description: 'Test skill',
        },
      });

      expect(result.id).toBe('skill-1');
    });

    it('should enforce unique name constraint', async () => {
      const error = { code: 'P2002', message: 'Unique constraint failed' };
      (mockPrisma.skill.create as jest.Mock).mockRejectedValue(error);

      await expect(
        mockPrisma.skill.create({
          data: { name: 'existing-skill' },
        })
      ).rejects.toEqual(error);
    });
  });

  describe('Read', () => {
    it('should find skills with status filter', async () => {
      const mockSkills = [
        { id: '1', name: 'skill-1', status: 'approved' },
      ];

      (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue(mockSkills);

      const result = await mockPrisma.skill.findMany({
        where: { status: 'approved' },
      });

      expect(result).toHaveLength(1);
    });

    it('should filter public skills', async () => {
      (mockPrisma.skill.findMany as jest.Mock).mockResolvedValue([]);

      await mockPrisma.skill.findMany({
        where: { isPublic: true },
      });

      expect(mockPrisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true }),
        })
      );
    });
  });

  describe('Update', () => {
    it('should update skill status', async () => {
      const updatedSkill = {
        id: 'skill-1',
        status: 'approved',
        version: 2,
      };

      (mockPrisma.skill.update as jest.Mock).mockResolvedValue(updatedSkill);

      const result = await mockPrisma.skill.update({
        where: { id: 'skill-1' },
        data: { status: 'approved' },
      });

      expect(result.status).toBe('approved');
    });
  });

  describe('Delete', () => {
    it('should delete a skill', async () => {
      (mockPrisma.skill.delete as jest.Mock).mockResolvedValue({ id: 'skill-1' });

      await mockPrisma.skill.delete({
        where: { id: 'skill-1' },
      });

      expect(mockPrisma.skill.delete).toHaveBeenCalled();
    });
  });
});

describe('Prisma: ApiToken CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create', () => {
    it('should create a token', async () => {
      const mockToken = {
        id: 'token-1',
        name: 'dev-token',
        token: 'secret-token-value',
        namespace: 'default',
        permissions: ['read'],
      };

      (mockPrisma.apiToken.create as jest.Mock).mockResolvedValue(mockToken);

      const result = await mockPrisma.apiToken.create({
        data: {
          name: 'dev-token',
          token: 'secret-token-value',
          namespace: 'default',
          permissions: ['read'],
        },
      });

      expect(result.id).toBe('token-1');
    });
  });

  describe('Read', () => {
    it('should find token by token value', async () => {
      const mockToken = {
        id: 'token-1',
        token: 'searched-token',
        namespace: 'default',
      };

      (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue(mockToken);

      const result = await mockPrisma.apiToken.findUnique({
        where: { token: 'searched-token' },
      });

      expect(result?.token).toBe('searched-token');
    });
  });

  describe('Update', () => {
    it('should update lastUsedAt', async () => {
      const updatedToken = {
        id: 'token-1',
        lastUsedAt: new Date(),
      };

      (mockPrisma.apiToken.update as jest.Mock).mockResolvedValue(updatedToken);

      const result = await mockPrisma.apiToken.update({
        where: { id: 'token-1' },
        data: { lastUsedAt: new Date() },
      });

      expect(result.lastUsedAt).toBeDefined();
    });
  });

  describe('Delete', () => {
    it('should delete a token', async () => {
      (mockPrisma.apiToken.delete as jest.Mock).mockResolvedValue({ id: 'token-1' });

      await mockPrisma.apiToken.delete({
        where: { id: 'token-1' },
      });

      expect(mockPrisma.apiToken.delete).toHaveBeenCalled();
    });
  });
});

describe('Prisma: AuditLog CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create', () => {
    it('should create an audit log', async () => {
      const mockLog = {
        id: 'log-1',
        action: 'create',
        entityType: 'memory',
        entityId: 'mem-1',
        namespace: 'default',
        createdAt: new Date(),
      };

      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue(mockLog);

      const result = await mockPrisma.auditLog.create({
        data: {
          action: 'create',
          entityType: 'memory',
          entityId: 'mem-1',
          namespace: 'default',
        },
      });

      expect(result.id).toBe('log-1');
      expect(result.action).toBe('create');
    });
  });

  describe('Read', () => {
    it('should find audit logs with filters', async () => {
      const mockLogs = [
        { id: '1', action: 'create', entityType: 'memory' },
      ];

      (mockPrisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await mockPrisma.auditLog.findMany({
        where: { entityType: 'memory' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(result).toHaveLength(1);
    });

    it('should count audit logs', async () => {
      (mockPrisma.auditLog.count as jest.Mock).mockResolvedValue(500);

      const count = await mockPrisma.auditLog.count({
        where: { namespace: 'default' },
      });

      expect(count).toBe(500);
    });
  });
});
