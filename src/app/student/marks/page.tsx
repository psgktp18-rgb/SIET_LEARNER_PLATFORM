import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MarksPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') return redirect('/login');

  const marks = await prisma.studentMark.findMany({
    where: { studentId: payload.userId },
    include: {
      component: true,
      classroom: { include: { subject: true } }
    },
    orderBy: [{ classroom: { subject: { name: 'asc' } } }, { component: { name: 'asc' } }]
  });

  // Group marks by classroom/subject
  const bySubject = marks.reduce((acc, m) => {
    const key = m.classroomId;
    if (!acc[key]) acc[key] = { subjectName: m.classroom.subject.name, subjectCode: m.classroom.subject.code, marks: [] };
    acc[key].marks.push(m);
    return acc;
  }, {} as Record<string, { subjectName: string; subjectCode: string; marks: typeof marks }>);

  const totalScored = marks.reduce((s, m) => s + (m.marks ?? 0), 0);
  const totalMax = marks.reduce((s, m) => s + m.component.maxMarks, 0);
  const overallPercent = totalMax > 0 ? ((totalScored / totalMax) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Marks</h1>
          <p className="text-muted-foreground mt-1">
            {marks.length === 0 ? 'No marks recorded yet.' : `${marks.length} components recorded`}
          </p>
        </div>
        {overallPercent && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${parseFloat(overallPercent) >= 75 ? 'text-green-600' : parseFloat(overallPercent) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {overallPercent}%
            </div>
            <p className="text-xs text-muted-foreground">Overall ({totalScored}/{totalMax})</p>
          </div>
        )}
      </div>

      {marks.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium">No marks available yet</p>
          <p className="text-sm mt-1">Your teacher will upload marks once assessments are completed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(bySubject).map(([classroomId, subject]) => {
            const subjectTotal = subject.marks.reduce((s, m) => s + (m.marks ?? 0), 0);
            const subjectMax = subject.marks.reduce((s, m) => s + m.component.maxMarks, 0);
            const subjectPct = subjectMax > 0 ? ((subjectTotal / subjectMax) * 100).toFixed(1) : null;

            return (
              <Card key={classroomId}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">
                    {subject.subjectName}
                    <span className="text-muted-foreground font-normal text-sm ml-2">({subject.subjectCode})</span>
                  </CardTitle>
                  {subjectPct && (
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      parseFloat(subjectPct) >= 75 ? 'bg-green-100 text-green-700' :
                      parseFloat(subjectPct) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {subjectPct}% ({subjectTotal}/{subjectMax})
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subject.marks.map(m => (
                      <div key={m.id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                        <span className="text-sm text-muted-foreground">{m.component.name}</span>
                        <span className="font-semibold text-sm">
                          {m.marks ?? '—'}
                          <span className="text-muted-foreground font-normal"> / {m.component.maxMarks}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const instant = false;
