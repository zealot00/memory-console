import { PrismaClient } from '@prisma/client';

describe('Prisma Tests', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should connect to database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  test('should have required tables', async () => {
    // Check that we can query the database
    const count = await prisma.memory.count();
    expect(typeof count).toBe('number');
  });
});
