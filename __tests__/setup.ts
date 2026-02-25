// 测试环境设置
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  memory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  skill: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  apiToken: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
} as any;

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock auth module
jest.mock('@/lib/auth', () => ({
  withReadAuth: (handler: any) => async (req: any) => {
    return handler(req, { namespace: 'default', permissions: ['read', 'write', 'admin'], tokenId: 'test-token' });
  },
  withWriteAuth: (handler: any) => async (req: any) => {
    return handler(req, { namespace: 'default', permissions: ['write', 'admin'], tokenId: 'test-token' });
  },
  withAdminAuth: (handler: any) => async (req: any) => {
    return handler(req, { namespace: 'default', permissions: ['admin'], tokenId: 'test-token' });
  },
  logAudit: jest.fn().mockResolvedValue({}),
}));

// 全局清理
afterEach(() => {
  jest.clearAllMocks();
});

export { mockPrisma };
