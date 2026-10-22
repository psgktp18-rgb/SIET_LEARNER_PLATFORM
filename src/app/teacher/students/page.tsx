import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TeacherStudentsClient from './TeacherStudentsClient';

export const instant = false;

export default async function TeacherStudentsPage() {
  const payload = await getUser();
  if (!payload) return redirect('/login');

  const teacherId = payload.userId;

  const classrooms = await prisma.classroom.findMany({
    where: { teacherId },
    include: {
      enrollments: {
        include: {
          user: true
        }
      }
    }
  });

  let students: any[] = [];
  if (classrooms.length > 0) {
    const studentMap = new Map();
    for (const c of classrooms) {
      for (const en of c.enrollments) {
        if (!studentMap.has(en.user.id)) {
          studentMap.set(en.user.id, {
            id: en.user.id,
            name: en.user.name,
            loginId: en.user.loginId,
            email: en.user.email,
            isBlocked: en.user.isBlocked,
            classrooms: [c.name]
          });
        } else {
          studentMap.get(en.user.id).classrooms.push(c.name);
        }
      }
    }
    students = Array.from(studentMap.values());
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Students</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Students enrolled across your assigned classrooms.</p>
      </div>
      <TeacherStudentsClient students={students} currentUserId={teacherId} />
    </div>
  );
}
