import { prisma } from '@/services/prisma';

export async function getErrors() {
  return prisma.appError.findMany({
    orderBy: { timestamp: 'desc' },
  });
}
