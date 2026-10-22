import { prisma } from '@/lib/prisma';
import MarksClient from './MarksClient';
import { getUser } from '@/lib/auth';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClassroomStream } from '@/components/classroom/ClassroomStream';
import { getClassroomAccess } from '@/lib/permissions/classroom';
import { Clock, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

export const instant = false;

export default async function ClassroomMarksPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const payload = await getUser();
  if (!payload) return <div className="p-8">Access Denied: Please log in.</div>;

  const access = await getClassroomAccess(payload.userId, classroomId);

  if (access.isSubstituteExpired) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="h-12 w-12 text-destructive mx-auto flex items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Substitute Access Expired</h2>
        <p className="text-sm text-muted-foreground">
          Your temporary substitute teacher access for this classroom expired on{' '}
          <strong>{access.substituteEndDate ? new Date(access.substituteEndDate).toLocaleDateString() : 'earlier date'}</strong>.
        </p>
        <Link href="/teacher/classrooms" className="text-primary hover:underline font-medium inline-block text-sm">
          Return to My Classrooms
        </Link>
      </div>
    );
  }

  if (!access.isMainTeacher && !access.isCoTeacher && !access.isSubstitute && !access.isAdmin && !access.isHod) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You are not authorized to manage or teach this classroom.</p>
        <Link href="/teacher/classrooms" className="text-primary hover:underline font-medium inline-block text-sm">
          Return to My Classrooms
        </Link>
      </div>
    );
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      subject: true,
      department: true,
      teacher: true,
      classRep: true,
    }
  });

  if (!classroom) return <div className="p-8">Classroom Not Found</div>;

  const [announcements, notes, assignments, enrollments] = await Promise.all([
    prisma.announcement.findMany({
      where: { classroomId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.note.findMany({
      where: { classroomId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.assignment.findMany({
      where: { classroomId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.enrollment.findMany({
      where: { classroomId },
      include: { user: true },
      orderBy: { user: { loginId: 'asc' } }
    })
  ]);

  const scheme = await prisma.subjectMarksScheme.findUnique({
    where: { subjectId: classroom.subjectId },
    include: { components: true }
  });

  const marks = await prisma.studentMark.findMany({
    where: { classroomId },
    include: { student: true, component: true }
  });

  const finalised = await prisma.finalisedSubjectMarks.findUnique({
    where: { subjectId_classroomId: { subjectId: classroom.subjectId, classroomId: classroom.id } }
  });

  const isLocked = !!finalised?.isLocked;

  const studentMap = new Map();
  for (const m of marks) {
    if (!studentMap.has(m.studentId)) {
      studentMap.set(m.studentId, {
        id: m.student.id,
        name: m.student.name,
        loginId: m.student.loginId,
        marks: {}
      });
    }
    studentMap.get(m.studentId).marks[m.componentId] = m.marks;
  }

  for (const en of enrollments) {
    if (en.user.role === 'STUDENT' && !studentMap.has(en.userId)) {
      studentMap.set(en.userId, {
        id: en.user.id,
        name: en.user.name,
        loginId: en.user.loginId,
        marks: {}
      });
    }
  }

  const students = Array.from(studentMap.values());

  const roleName = access.isMainTeacher
    ? 'Main Teacher'
    : access.isCoTeacher
    ? 'Co-Teacher'
    : access.isSubstitute
    ? `Substitute until ${access.substituteEndDate ? new Date(access.substituteEndDate).toLocaleDateString() : 'N/A'}`
    : 'Teacher';

  return (
    <div className="flex flex-col bg-background min-h-full">
      {/* Role Banner if Co-Teacher or Substitute */}
      {access.isSubstitute && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            You have temporary <strong>Substitute Teacher</strong> access for this classroom until{' '}
            <strong>{access.substituteEndDate ? new Date(access.substituteEndDate).toLocaleDateString() : 'specified end date'}</strong>.
            Access will be automatically revoked after this date.
          </span>
        </div>
      )}
      {access.isCoTeacher && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 text-xs text-blue-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-700" />
          <span>
            You are acting as a <strong>Co-Teacher</strong> in this classroom. You can post to stream, upload notes, grade assignments, and mark attendance.
          </span>
        </div>
      )}

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={classroom.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
                {classroom.type}
              </Badge>
              {classroom.category && (
                <Badge variant="outline" className="text-2xs text-primary">
                  {classroom.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-2xs">
                {roleName}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{classroom.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {classroom.subject.name} ({classroom.subject.code}) · Year {classroom.year} Sec {classroom.section} · Code: <span className="font-mono font-bold text-primary">{classroom.joinCode}</span>
            </p>
          </div>
        </div>

        <Tabs defaultValue="stream" className="w-full">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="stream">Stream</TabsTrigger>
            <TabsTrigger value="notes">Notes & Materials ({notes.length})</TabsTrigger>
            <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            <TabsTrigger value="meet">Live Meet</TabsTrigger>
            <TabsTrigger value="marks">Marks & Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="stream" className="space-y-4">
            <ClassroomStream
              classroomId={classroom.id}
              initialAnnouncements={announcements}
              canPost={access.canPostStream}
              isClassRep={false}
              userRoleName={roleName}
            />
          </TabsContent>

          <TabsContent value="notes" className="p-4 border rounded-md bg-card">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes uploaded yet. Use the upload materials tool to add PDFs and documents.</p>
            ) : (
              <div className="space-y-2">
                {notes.map(n => (
                  <div key={n.id} className="p-3 border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-sm">{n.title}</p>
                      <span className="text-muted-foreground">{n.fileType} · {new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="p-4 border rounded-md bg-card">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments created yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="p-3 border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-sm">{a.title}</p>
                      <span className="text-muted-foreground">Due: {new Date(a.dueDate).toLocaleDateString()} · Max: {a.maxMarks} marks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No AI quizzes generated yet.
          </TabsContent>

          <TabsContent value="tests" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No class tests scheduled.
          </TabsContent>

          <TabsContent value="students" className="p-4 border rounded-md bg-card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Enrolled Roster ({enrollments.length} Students)</h4>
            </div>
            {enrollments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No students enrolled in this classroom.</p>
            ) : (
              <div className="divide-y border rounded-md text-xs">
                {enrollments.map(en => (
                  <div key={en.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{en.user.name}</span>
                      <span className="font-mono text-muted-foreground ml-2">({en.user.loginId})</span>
                      {classroom.classRepId === en.user.id && (
                        <Badge variant="secondary" className="ml-2 text-2xs gap-1 bg-amber-100 text-amber-900 border-amber-300">
                          <UserCheck className="h-3 w-3" /> Class Representative
                        </Badge>
                      )}
                    </div>
                    <span className="text-2xs text-muted-foreground">
                      Joined {new Date(en.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meet" className="p-4 border rounded-md text-muted-foreground bg-card text-xs">
            No active live meetings scheduled.
          </TabsContent>

          <TabsContent value="marks">
            {!scheme ? (
              <div className="p-4 border rounded-md bg-card">
                <p className="text-sm text-muted-foreground">No marks scheme configured by admin for this subject yet.</p>
              </div>
            ) : (
              <MarksClient
                classroom={classroom}
                scheme={scheme}
                students={students}
                isLocked={isLocked}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
