import { prisma } from '@/services/prisma';

export async function deleteApplication(id: string) {
  return prisma.application.delete({ where: { id } });
}
