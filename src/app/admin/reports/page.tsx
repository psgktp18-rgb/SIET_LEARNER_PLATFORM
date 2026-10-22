import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';

export const instant = false;

export default async function AdminReportsPage() {
  const classrooms = await prisma.classroom.findMany({
    include: { subject: true, teacher: true, department: true }
  });

  const finalisedMarks = await prisma.finalisedSubjectMarks.findMany();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Marks & Performance Reports</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">Year / Section</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Teacher</th>
              <th className="p-3">Marks Status</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map(c => {
              const isFinalised = finalisedMarks.some(f => f.classroomId === c.id);
              return (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.department.code}</td>
                  <td className="p-3">{c.year} / {c.section}</td>
                  <td className="p-3">{c.subject.name}</td>
                  <td className="p-3">{c.teacher.name}</td>
                  <td className="p-3">{isFinalised ? <span className="text-green-600 font-bold">Locked</span> : <span className="text-yellow-600">Draft / Pending</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
