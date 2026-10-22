import { prisma } from './prisma';

export interface ClassroomHealthBreakdown {
  score: number;
  status: 'Healthy' | 'Fair' | 'At Risk';
  attendanceRate: number;
  notesRate: number;
  notesCount: number;
  assignmentsRate: number;
  assignmentsCount: number;
  activeStudentsRate: number;
  activeStudentsCount: number;
  totalEnrolled: number;
}

export async function calculateClassroomHealth(classroomId: string): Promise<ClassroomHealthBreakdown> {
  const [classroom, enrollments, notesCount, assignments, meetings] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true }
    }),
    prisma.enrollment.findMany({
      where: { classroomId },
      include: {
        user: {
          select: { id: true, lastLoginAt: true }
        }
      }
    }),
    prisma.note.count({ where: { classroomId } }),
    prisma.assignment.findMany({
      where: { classroomId },
      include: {
        submissions: {
          select: { id: true, status: true, marks: true }
        }
      }
    }),
    prisma.meeting.findMany({
      where: { classroomId },
      include: {
        _count: { select: { attendances: true } }
      }
    })
  ]);

  const totalEnrolled = enrollments.length;

  // 1. Attendance rate (weight 30%): % attendance across meetings/sessions
  let attendanceRate = 100;
  if (meetings.length > 0 && totalEnrolled > 0) {
    const totalPossibleAttendances = meetings.length * totalEnrolled;
    const actualAttendances = meetings.reduce((acc, m) => acc + (m._count?.attendances || 0), 0);
    attendanceRate = Math.min(100, Math.round((actualAttendances / totalPossibleAttendances) * 100));
  } else if (meetings.length === 0) {
    // Neutral default if no meetings held yet
    attendanceRate = 80;
  }

  // 2. Notes uploaded (weight 20%): >=3 notes = 100%, 1-2 = 60%, 0 = 0%
  let notesRate = 0;
  if (notesCount >= 3) {
    notesRate = 100;
  } else if (notesCount >= 1) {
    notesRate = 60;
  } else {
    notesRate = 0;
  }

  // 3. Assignments created and graded on time (weight 25%)
  let assignmentsRate = 50;
  if (assignments.length > 0) {
    let totalSubmissions = 0;
    let gradedSubmissions = 0;
    for (const a of assignments) {
      totalSubmissions += a.submissions.length;
      gradedSubmissions += a.submissions.filter(s => s.status === 'GRADED' || s.marks !== null).length;
    }
    if (totalSubmissions > 0) {
      assignmentsRate = Math.round((gradedSubmissions / totalSubmissions) * 100);
    } else {
      // Assignments exist but no submissions yet -> good active creation
      assignmentsRate = 85;
    }
  } else {
    assignmentsRate = 30; // No assignments created
  }

  // 4. Active students (weight 25%): % enrolled students active in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let activeStudentsCount = 0;
  for (const en of enrollments) {
    if (en.user.lastLoginAt && new Date(en.user.lastLoginAt) >= sevenDaysAgo) {
      activeStudentsCount++;
    }
  }
  const activeStudentsRate = totalEnrolled > 0
    ? Math.round((activeStudentsCount / totalEnrolled) * 100)
    : 100;

  // Weighted total: 30% attendance + 20% notes + 25% assignments + 25% active students
  const score = Math.min(100, Math.max(0, Math.round(
    attendanceRate * 0.30 +
    notesRate * 0.20 +
    assignmentsRate * 0.25 +
    activeStudentsRate * 0.25
  )));

  let status: 'Healthy' | 'Fair' | 'At Risk' = 'Fair';
  if (score >= 80) status = 'Healthy';
  else if (score >= 50) status = 'Fair';
  else status = 'At Risk';

  return {
    score,
    status,
    attendanceRate,
    notesRate,
    notesCount,
    assignmentsRate,
    assignmentsCount: assignments.length,
    activeStudentsRate,
    activeStudentsCount,
    totalEnrolled,
  };
}

export async function calculateMultipleClassroomHealth(classroomIds: string[]): Promise<Record<string, ClassroomHealthBreakdown>> {
  const result: Record<string, ClassroomHealthBreakdown> = {};
  await Promise.all(
    classroomIds.map(async (id) => {
      result[id] = await calculateClassroomHealth(id);
    })
  );
  return result;
}
