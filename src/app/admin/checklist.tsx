"use client";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GoLiveChecklist({ status }: { status: any }) {
  const steps = [
    { label: "1. Change the admin password", done: status.adminPasswordChanged, href: "/admin/profile" },
    { label: "2. Set College Name and Logo", done: status.collegeNameSet, href: "/admin/settings" },
    { label: "3. Set Academic Year and Semester", done: status.academicYearSet, href: "/admin/settings" },
    { label: "4. Confirm Departments", done: status.departmentsConfirmed, href: "/admin/departments" },
    { label: "5. Import Teachers", done: status.teachersImported, href: "/admin/teachers" },
    { label: "6. Assign HODs", done: status.hodsAssigned, href: "/admin/teachers" }, // Usually an edit on teacher
    { label: "7. Add Subjects", done: status.subjectsAdded, href: "/admin/departments" },
    { label: "8. Import Students", done: status.studentsImported, href: "/admin/students" },
    { label: "9. Create Classrooms & Assign Teachers", done: status.classroomsCreated, href: "/admin/classrooms" },
    { label: "10. Enroll Students", done: status.studentsEnrolled, href: "/admin/classrooms" },
    { label: "11. Open Year 3 in Rollout", done: status.rolloutOpened, href: "/admin/rollout" },
    { label: "12. Configure AI Provider", done: status.aiConfigured, href: "/admin/settings/ai" },
    { label: "13. Configure Storage", done: status.storageConfigured, href: "/admin/settings" },
    { label: "14. Run a Backup", done: status.backupRun, href: "/admin/backups" },
  ];

  const progress = Math.round((steps.filter(s => s.done).length / steps.length) * 100);

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Go-Live Checklist</h2>
        <div className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
          {progress}% Ready
        </div>
      </div>
      <div className="w-full bg-secondary h-2 rounded-full mb-6 overflow-hidden">
        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center justify-between p-3 border rounded-md ${step.done ? 'bg-green-50 border-green-200' : 'bg-background hover:bg-accent/50 transition-colors'}`}>
            <div className="flex items-center gap-3">
              {step.done ? <CheckCircle2 className="text-green-600 w-5 h-5" /> : <Circle className="text-muted-foreground w-5 h-5" />}
              <span className={`text-sm font-medium ${step.done ? 'text-green-800' : 'text-foreground'}`}>{step.label}</span>
            </div>
            {!step.done && (
              <Link href={step.href}>
                <Button size="sm" variant="outline" className="h-8 text-xs">Do this</Button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
