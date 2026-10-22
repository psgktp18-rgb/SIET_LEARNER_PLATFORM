import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient, _pingSet: boolean };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (!globalForPrisma._pingSet) {
  globalForPrisma._pingSet = true;
  const pingDb = async () => {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      console.log(`[DB PING] SELECT 1 in ${Date.now() - start}ms`);
    } catch (e) {
      console.error("[DB PING] Error keeping DB awake", e);
    }
  };
  pingDb();
  setInterval(pingDb, 3 * 60 * 1000);
}
