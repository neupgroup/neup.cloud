// Only load Prisma in a Node.js environment (never in the browser)
let prisma: any = null;
if (typeof window === 'undefined') {
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('@prisma/client');

  const globalForPrisma = globalThis as unknown as {
    prisma?: typeof PrismaClient;
  };

  function hasRequiredDelegates(client: typeof PrismaClient) {
    return 'database' in client;
  }

  function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured.');
    }

    return new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  const prismaClient =
    globalForPrisma.prisma && hasRequiredDelegates(globalForPrisma.prisma)
      ? globalForPrisma.prisma
      : createPrismaClient();

  prisma = prismaClient;

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
} else {
  // If imported in the browser, throw an error immediately
  throw new Error('Prisma cannot be imported in the browser. This is a server-only module.');
}

export { prisma };
