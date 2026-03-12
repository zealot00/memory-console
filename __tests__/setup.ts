// 测试环境设置
import { PrismaClient } from '@prisma/client';

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
    groupBy: jest.fn(),
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
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  agent: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
} as any;

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

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

jest.mock('@/lib/sse', () => ({
  broadcastToAgent: jest.fn(),
  addSSEClient: jest.fn(),
  removeSSEClient: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
  errorResponse: jest.fn().mockImplementation((message: string, status: number) => {
    return { json: () => ({ error: message }), status };
  }),
  successResponse: jest.fn().mockImplementation((data: unknown, status = 200) => {
    return { json: () => data, status };
  }),
  handleApiError: jest.fn().mockImplementation((error: unknown, message = 'Internal Server Error') => {
    return { json: () => ({ error: message }), status: 500 };
  }),
  validationError: jest.fn().mockImplementation((error: any) => {
    const firstError = error?.errors?.[0];
    const message = firstError ? `${firstError.path?.join('.')}: ${firstError.message}` : 'Validation failed';
    return { json: () => ({ error: message }), status: 400 };
  }),
}));

// 设置测试环境变量
process.env.API_TOKEN = 'test-token-1234567890abcdef';
process.env.NEXT_PUBLIC_API_TOKEN = 'test-token-1234567890abcdef';
process.env.NODE_ENV = 'test';

afterEach(() => {
  jest.clearAllMocks();
});

export { mockPrisma };
