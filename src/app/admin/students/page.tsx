import { prisma } from '@/lib/prisma';
import { StudentsClient } from './client';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string, page?: string }> }) {
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') redirect('/login');

  const params = await searchParams;
  const q = params.q || '';
  const page = parseInt(params.page || '1');
  const limit = 25;
  const skip = (page - 1) * limit;

  const where = {
    role: 'STUDENT',
    ...(q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { loginId: { contains: q, mode: 'insensitive' } }
      ]
    } : {})
  };

  const [total, students, departments] = await Promise.all([
    prisma.user.count({ where: where as any }),
    prisma.user.findMany({
      where: where as any,
      skip,
      take: limit,
      include: {
        department: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.department.findMany()
  ]);

  return <StudentsClient initialData={students} total={total} departments={departments} />;
}
