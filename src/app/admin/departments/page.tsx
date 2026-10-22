import { prisma } from '@/lib/prisma';
import { DepartmentsClient } from './client';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<{ q?: string, page?: string }> }) {
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') redirect('/login');

  const params = await searchParams;
  const q = params.q || '';
  const page = parseInt(params.page || '1');
  const limit = 25;
  const skip = (page - 1) * limit;

  const where = q ? {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } }
    ]
  } : {};

  const [total, departments] = await Promise.all([
    prisma.department.count({ where: where as any }),
    prisma.department.findMany({
      where: where as any,
      skip,
      take: limit,
      include: {
        _count: {
          select: { users: true, classrooms: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return <DepartmentsClient departments={departments} total={total} />;
}
