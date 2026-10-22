'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatCards } from '@/components/ui/stat-cards';
import { FormDialog } from '@/components/ui/form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { HealthScoreBadge } from '@/components/classroom/HealthScoreBadge';
import {
  BookOpen,
  Plus,
  Download,
  Users,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  KeyRound,
  RefreshCw,
  Archive,
  Trash2,
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface AdminClassroomsClientProps {
  initialClassrooms: any[];
  departments: any[];
  subjects: any[];
  teachers: any[];
  requests: any[];
  stats: {
    total: number;
    official: number;
    extra: number;
    totalEnrolled: number;
  };
}

export function AdminClassroomsClient({
  initialClassrooms,
  departments,
  subjects,
  teachers,
  requests: initialRequests,
  stats,
}: AdminClassroomsClientProps) {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<any[]>(initialClassrooms);
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubjectId, setCreateSubjectId] = useState('');
  const [rejectReqTarget, setRejectReqTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Enrollment tools in drawer
  const [individualInput, setIndividualInput] = useState('');
  const [csvText, setCsvText] = useState('');
  const [addStaffTeacherId, setAddStaffTeacherId] = useState('');
  const [addStaffRole, setAddStaffRole] = useState<'CO_TEACHER' | 'SUBSTITUTE'>('CO_TEACHER');
  const [addStaffEndDate, setAddStaffEndDate] = useState('');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const refreshClassroomDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/classrooms/${id}`);
      const data = await res.json();
      if (res.ok && data.classroom) {
        setSelectedClass(data.classroom);
        setClassrooms(prev => prev.map(c => c.id === id ? { ...c, ...data.classroom } : c));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter classrooms
  const filteredClassrooms = classrooms.filter(c => {
    if (filterDept && c.departmentId !== filterDept) return false;
    if (filterYear && c.year.toString() !== filterYear) return false;
    if (filterSection && c.section.toUpperCase() !== filterSection.toUpperCase()) return false;
    if (filterTeacher && c.teacherId !== filterTeacher) return false;
    if (filterType && c.type !== filterType) return false;
    if (filterStatus === 'archived' && !c.isArchived) return false;
    if (filterStatus === 'active' && c.isArchived) return false;
    return true;
  });

  // Table columns
  const columns = [
    {
      key: 'name',
      header: 'Classroom',
      render: (cls: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground hover:underline cursor-pointer">
            {cls.name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-2xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Code: {cls.joinCode}
            </span>
            {cls.category && (
              <span className="text-2xs text-primary font-medium">· {cls.category}</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (cls: any) => (
        <div>
          <p className="font-medium text-xs sm:text-sm">{cls.subject?.name}</p>
          <span className="font-mono text-2xs text-muted-foreground">{cls.subject?.code}</span>
        </div>
      )
    },
    {
      key: 'dept',
      header: 'Dept / Class',
      render: (cls: any) => (
        <div>
          <Badge variant="outline" className="font-mono text-2xs mb-0.5">
            {cls.department?.code}
          </Badge>
          <p className="text-xs text-muted-foreground">Year {cls.year} · Sec {cls.section}</p>
        </div>
      )
    },
    {
      key: 'teacher',
      header: 'Main Teacher',
      render: (cls: any) => (
        <div>
          <p className="font-medium text-xs sm:text-sm">{cls.teacher?.name}</p>
          <span className="text-2xs text-muted-foreground">{cls.teacher?.loginId}</span>
        </div>
      )
    },
    {
      key: 'students',
      header: 'Students',
      render: (cls: any) => (
        <span className="font-semibold text-xs sm:text-sm">
          {cls.studentCount || cls._count?.enrollments || 0}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (cls: any) => (
        <Badge variant={cls.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
          {cls.type === 'OFFICIAL' ? 'Official' : 'Extra'}
        </Badge>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (cls: any) => (
        <Badge variant={cls.isArchived ? 'outline' : 'success'} className="text-2xs">
          {cls.isArchived ? 'Archived' : 'Active'}
        </Badge>
      )
    },
    {
      key: 'health',
      header: 'Health Score',
      render: (cls: any) => cls.health ? <HealthScoreBadge health={cls.health} size="sm" /> : <span className="text-muted-foreground text-xs">—</span>
    }
  ];

  // Actions on row
  const rowActions = [
    {
      label: 'View / Manage',
      onClick: (cls: any) => {
        setSelectedClass(cls);
        setDrawerOpen(true);
        refreshClassroomDetail(cls.id);
      }
    }
  ];

  // Create official class
  const handleCreateOfficial = async (formData: FormData) => {
    try {
      setLoading(true);
      const subjectIdRaw = formData.get('subjectId') as string;
      const isCustom = subjectIdRaw === '__NEW__';
      const subjectId = isCustom ? undefined : (subjectIdRaw || undefined);
      const subjectName = isCustom ? (formData.get('subjectName') as string) : undefined;
      const subjectCode = isCustom ? (formData.get('subjectCode') as string) : undefined;

      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          subjectName,
          subjectCode,
          departmentId: formData.get('departmentId'),
          year: parseInt(formData.get('year') as string),
          section: formData.get('section'),
          teacherId: formData.get('teacherId'),
          name: formData.get('name') || undefined,
          type: 'OFFICIAL',
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg(`Official classroom "${data.classroom.name}" created successfully!`);
      setClassrooms(prev => [data.classroom, ...prev]);
      setCreateOpen(false);
      setCreateSubjectId('');
      router.refresh();
    } catch (e: any) {
      showMsg(e.message, 'error');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Reassign main teacher
  const handleReassignTeacher = async (teacherId: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('Main teacher reassigned successfully.');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Regenerate join code
  const handleRegenerateCode = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-code' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`Join code regenerated: ${data.classroom.joinCode}`);
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Archive / Unarchive
  const handleToggleArchive = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !selectedClass.isArchived })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`Classroom ${data.classroom.isArchived ? 'archived' : 'unarchived'}.`);
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Delete Classroom
  const handleDeleteClassroom = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: selectedClass.name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(data.message);
      setClassrooms(prev => prev.filter(c => c.id !== selectedClass.id));
      setDrawerOpen(false);
      setSelectedClass(null);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Enrollment: Individual
  const handleEnrollIndividual = async () => {
    if (!selectedClass || !individualInput.trim()) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'individual', studentIdentifier: individualInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('Student enrolled successfully.');
      setIndividualInput('');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Enrollment: Rule
  const handleEnrollByRule = async () => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'rule' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`Enrolled ${data.enrolledCount} matching students!`);
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Enrollment: CSV
  const handleEnrollCsv = async () => {
    if (!selectedClass || !csvText.trim()) return;
    const lines = csvText.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'csv', regNumbers: lines })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`Enrolled ${data.enrolledCount} students from CSV list.`);
      if (data.errors?.length) {
        showMsg(`Warnings: ${data.errors.join('; ')}`, 'error');
      }
      setCsvText('');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Remove student
  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/enrollments?studentId=${studentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('Student removed from classroom.');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Staff: Add Co-teacher or Substitute
  const handleAddStaff = async () => {
    if (!selectedClass || !addStaffTeacherId) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: addStaffTeacherId,
          role: addStaffRole,
          endDate: addStaffRole === 'SUBSTITUTE' && addStaffEndDate ? addStaffEndDate : null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(`${addStaffRole === 'SUBSTITUTE' ? 'Substitute' : 'Co-teacher'} assigned successfully.`);
      setAddStaffTeacherId('');
      setAddStaffEndDate('');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Staff: Remove
  const handleRemoveStaff = async (staffId: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/staff?staffId=${staffId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('Staff role removed.');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Staff: Designate Class Rep
  const handleDesignateClassRep = async (studentId: string | null) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classrooms/${selectedClass.id}/staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classRepId: studentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(studentId ? 'Class representative designated.' : 'Class representative removed.');
      await refreshClassroomDetail(selectedClass.id);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  // Approval requests
  const handleApproveRequest = async (reqId: string) => {
    try {
      const res = await fetch('/api/classrooms/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId, action: 'approve' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg(data.message);
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'APPROVED' } : r));
      router.refresh();
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectReqTarget) return;
    try {
      const res = await fetch('/api/classrooms/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: rejectReqTarget.id,
          action: 'reject',
          adminComment: rejectReason || 'Declined by Administrator'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('Request declined.');
      setRequests(prev => prev.map(r => r.id === rejectReqTarget.id ? { ...r, status: 'REJECTED' } : r));
      setRejectModalOpen(false);
      setRejectReason('');
      setRejectReqTarget(null);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Classrooms & Academics"
        description="Oversee institutional classrooms, teachers, enrollments, and approval queues."
        actions={
          <div className="flex gap-2">
            <a href="/api/classrooms/export" download>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </a>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Official Classroom
            </Button>
          </div>
        }
      />

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Stat Cards */}
      <StatCards
        stats={[
          { label: 'Total Classrooms', value: stats.total, icon: BookOpen, description: 'Active & archived' },
          { label: 'Official Classes', value: stats.official, icon: ShieldCheck, badge: 'Institution', badgeVariant: 'default' },
          { label: 'Extra Classes', value: stats.extra, icon: Sparkles, description: 'Remedial, Lab, Revision' },
          { label: 'Total Enrolled', value: stats.totalEnrolled, icon: Users, description: 'Student enrollments' },
        ]}
      />

      {/* Tabs */}
      <Tabs defaultValue="classrooms" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="classrooms" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classrooms ({filteredClassrooms.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="h-4 w-4" />
            Approval Requests
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 px-1.5 py-0.2 text-2xs">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Classrooms Table */}
        <TabsContent value="classrooms" className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-card p-3 rounded-lg border">
            <div>
              <Label className="text-2xs text-muted-foreground uppercase">Department</Label>
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="w-full text-xs h-8 rounded border bg-background px-2"
              >
                <option value="">All Depts</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-2xs text-muted-foreground uppercase">Year</Label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="w-full text-xs h-8 rounded border bg-background px-2"
              >
                <option value="">All Years</option>
                {[1, 2, 3, 4].map(y => (
                  <option key={y} value={y.toString()}>Year {y}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-2xs text-muted-foreground uppercase">Section</Label>
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                className="w-full text-xs h-8 rounded border bg-background px-2"
              >
                <option value="">All Secs</option>
                {['A', 'B', 'C', 'D'].map(s => (
                  <option key={s} value={s}>Sec {s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-2xs text-muted-foreground uppercase">Teacher</Label>
              <select
                value={filterTeacher}
                onChange={e => setFilterTeacher(e.target.value)}
                className="w-full text-xs h-8 rounded border bg-background px-2"
              >
                <option value="">All Teachers</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-2xs text-muted-foreground uppercase">Type</Label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full text-xs h-8 rounded border bg-background px-2"
              >
                <option value="">All Types</option>
                <option value="OFFICIAL">Official</option>
                <option value="EXTRA">Extra</option>
              </select>
            </div>
            <div>
              <Label className="text-2xs text-muted-foreground uppercase">Status</Label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full text-xs h-8 rounded border bg-background px-2"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {filteredClassrooms.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classrooms found"
              description="No classrooms match your search or filter criteria. Create an official classroom to get started."
              action={{
                label: 'Create Official Classroom',
                onClick: () => setCreateOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <DataTable
              data={filteredClassrooms}
              columns={columns}
              actions={rowActions}
              totalCount={filteredClassrooms.length}
              onRowClick={(cls) => {
                setSelectedClass(cls);
                setDrawerOpen(true);
                refreshClassroomDetail(cls.id);
              }}
            />
          )}
        </TabsContent>

        {/* Tab 2: Approval Requests */}
        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <EmptyState
              icon={Check}
              title="No pending requests"
              description="All HOD classroom creation and teacher reassignment requests have been reviewed."
            />
          ) : (
            <div className="grid gap-3">
              {requests.map(req => (
                <Card key={req.id} className="border border-border/80 shadow-xs">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={req.type === 'CREATE_OFFICIAL' ? 'default' : 'secondary'} className="text-2xs">
                          {req.type === 'CREATE_OFFICIAL' ? 'New Official Classroom' : 'Teacher Reassignment'}
                        </Badge>
                        <Badge variant={req.status === 'PENDING' ? 'warning' : req.status === 'APPROVED' ? 'success' : 'destructive'} className="text-2xs">
                          {req.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {req.type === 'CREATE_OFFICIAL'
                          ? `Request: ${req.name || 'New Classroom'} (${req.department?.code} - Year ${req.year} Sec ${req.section})`
                          : `Change Teacher for: ${req.classroom?.name || 'Classroom'}`}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Proposed Teacher: <strong>{req.proposedTeacher?.name}</strong> ({req.proposedTeacher?.loginId}) · Requested by: {req.requester?.name} (HOD)
                      </p>
                      {req.reason && (
                        <p className="text-xs text-muted-foreground/90 italic">Reason: "{req.reason}"</p>
                      )}
                      {req.adminComment && (
                        <p className="text-xs text-primary font-medium">Admin Comment: "{req.adminComment}"</p>
                      )}
                    </div>

                    {req.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setRejectReqTarget(req);
                            setRejectModalOpen(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApproveRequest(req.id)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Official Classroom Modal */}
      <FormDialog
        title="Create Official Classroom"
        description="Specify the subject, department, year, section, and main teacher. The system auto-generates a unique code and identifier."
        trigger={<span />}
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateSubjectId('');
        }}
        submitText="Create Classroom"
        onSubmit={handleCreateOfficial}
      >
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Department *</Label>
            <select
              name="departmentId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Subject *</Label>
            <select
              name="subjectId"
              required
              value={createSubjectId}
              onChange={e => setCreateSubjectId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select Subject</option>
              {subjects && subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
              <option value="__NEW__">+ Add Custom / New Subject...</option>
            </select>
          </div>

          {createSubjectId === '__NEW__' && (
            <div className="p-3 bg-muted/40 rounded-lg border border-dashed border-border/80 space-y-2.5">
              <div className="grid gap-1.5">
                <Label className="text-xs">Subject Name *</Label>
                <Input
                  name="subjectName"
                  placeholder="e.g. Distributed Systems"
                  required={createSubjectId === '__NEW__'}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Course Code (Optional)</Label>
                <Input
                  name="subjectCode"
                  placeholder="e.g. CS8791 (leave blank to auto-generate)"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Academic Year *</Label>
              <select
                name="year"
                required
                defaultValue="3"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {[1, 2, 3, 4].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Section *</Label>
              <select
                name="section"
                required
                defaultValue="A"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {['A', 'B', 'C', 'D'].map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Main Teacher *</Label>
            <select
              name="teacherId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select Main Teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>Custom Name (Optional)</Label>
            <Input name="name" placeholder="Leave blank to auto-generate (e.g. CSE-3A-CS8591-CN)" />
          </div>
        </div>
      </FormDialog>

      {/* Reject Request Modal */}
      <FormDialog
        title="Reject Classroom Request"
        description="Provide a constructive reason for declining this HOD request."
        trigger={<span />}
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        submitText="Confirm Rejection"
        onSubmit={async () => handleRejectRequest()}
      >
        <div className="space-y-3">
          <Label>Reason for rejection *</Label>
          <Input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Teacher workload exceeded or Subject already assigned"
            required
          />
        </div>
      </FormDialog>

      {/* Detail Drawer / Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
          {selectedClass && (
            <div className="space-y-6">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={selectedClass.type === 'OFFICIAL' ? 'default' : 'secondary'} className="text-2xs font-semibold">
                    {selectedClass.type}
                  </Badge>
                  <Badge variant={selectedClass.isArchived ? 'outline' : 'success'} className="text-2xs">
                    {selectedClass.isArchived ? 'Archived' : 'Active'}
                  </Badge>
                  {selectedClass.health && (
                    <HealthScoreBadge health={selectedClass.health} size="sm" />
                  )}
                </div>
                <SheetTitle className="text-2xl font-bold">{selectedClass.name}</SheetTitle>
                <SheetDescription>
                  {selectedClass.subject?.name} ({selectedClass.subject?.code}) · {selectedClass.department?.name} · Year {selectedClass.year} Sec {selectedClass.section}
                </SheetDescription>
              </SheetHeader>

              {/* Drawer Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="people" className="text-xs">People</TabsTrigger>
                  <TabsTrigger value="enrollment" className="text-xs">Enrollment</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                </TabsList>

                {/* Subtab 1: Overview */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4 border">
                      <span className="text-2xs uppercase text-muted-foreground font-semibold">Main Teacher</span>
                      <p className="text-sm font-bold mt-1">{selectedClass.teacher?.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedClass.teacher?.email || selectedClass.teacher?.loginId}</p>
                    </Card>
                    <Card className="p-4 border">
                      <span className="text-2xs uppercase text-muted-foreground font-semibold">Join Code</span>
                      <p className="text-sm font-mono font-bold mt-1 text-primary">{selectedClass.joinCode}</p>
                      <p className="text-xs text-muted-foreground">Share with students</p>
                    </Card>
                    <Card className="p-4 border">
                      <span className="text-2xs uppercase text-muted-foreground font-semibold">Enrolled Students</span>
                      <p className="text-2xl font-bold mt-1">{selectedClass.enrollments?.length || 0}</p>
                    </Card>
                    <Card className="p-4 border">
                      <span className="text-2xs uppercase text-muted-foreground font-semibold">Class Representative</span>
                      <p className="text-sm font-bold mt-1">
                        {selectedClass.classRep ? selectedClass.classRep.name : <span className="text-muted-foreground font-normal">Not designated</span>}
                      </p>
                    </Card>
                  </div>

                  {selectedClass.health && (
                    <Card className="p-4 border">
                      <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
                        <span>Classroom Health Diagnostics</span>
                        <Badge variant="outline">{selectedClass.health.score}%</Badge>
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 bg-muted/40 rounded">
                          <span className="text-muted-foreground block">Attendance Rate</span>
                          <span className="font-bold text-sm">{selectedClass.health.attendanceRate}%</span>
                        </div>
                        <div className="p-2 bg-muted/40 rounded">
                          <span className="text-muted-foreground block">Notes Uploaded</span>
                          <span className="font-bold text-sm">{selectedClass.health.notesCount} notes</span>
                        </div>
                        <div className="p-2 bg-muted/40 rounded">
                          <span className="text-muted-foreground block">Assignments Created</span>
                          <span className="font-bold text-sm">{selectedClass.health.assignmentsCount} assignments</span>
                        </div>
                        <div className="p-2 bg-muted/40 rounded">
                          <span className="text-muted-foreground block">Active Students (7d)</span>
                          <span className="font-bold text-sm">{selectedClass.health.activeStudentsCount} / {selectedClass.health.totalEnrolled}</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* Subtab 2: People & Staff */}
                <TabsContent value="people" className="space-y-4">
                  {/* Change Main Teacher */}
                  <div className="p-4 border rounded-lg bg-card space-y-3">
                    <Label className="font-semibold text-sm">Change Main Teacher</Label>
                    <div className="flex gap-2">
                      <select
                        defaultValue={selectedClass.teacherId}
                        onChange={(e) => handleReassignTeacher(e.target.value)}
                        className="flex-1 h-9 rounded-md border text-sm px-3 bg-background"
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.loginId})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Co-Teachers & Substitutes */}
                  <div className="p-4 border rounded-lg bg-card space-y-3">
                    <Label className="font-semibold text-sm">Co-Teachers & Substitutes</Label>
                    {selectedClass.teachers?.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No co-teachers or substitutes assigned.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedClass.teachers?.map((st: any) => (
                          <div key={st.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                            <div>
                              <span className="font-semibold">{st.teacher?.name}</span>
                              <Badge variant="outline" className="ml-2 text-2xs">
                                {st.role === 'CO_TEACHER' ? 'Co-Teacher' : 'Substitute'}
                              </Badge>
                              {st.role === 'SUBSTITUTE' && st.endDate && (
                                <span className="text-muted-foreground block text-2xs mt-0.5">
                                  Until {new Date(st.endDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-7 px-2 text-xs"
                              onClick={() => handleRemoveStaff(st.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={addStaffTeacherId}
                        onChange={e => setAddStaffTeacherId(e.target.value)}
                        className="h-8 rounded border text-xs px-2 bg-background"
                      >
                        <option value="">Select Teacher</option>
                        {teachers.filter(t => t.id !== selectedClass.teacherId).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <select
                        value={addStaffRole}
                        onChange={e => setAddStaffRole(e.target.value as any)}
                        className="h-8 rounded border text-xs px-2 bg-background"
                      >
                        <option value="CO_TEACHER">Co-Teacher</option>
                        <option value="SUBSTITUTE">Substitute</option>
                      </select>
                      {addStaffRole === 'SUBSTITUTE' ? (
                        <Input
                          type="date"
                          value={addStaffEndDate}
                          onChange={e => setAddStaffEndDate(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="End Date"
                        />
                      ) : (
                        <div />
                      )}
                      <Button size="sm" onClick={handleAddStaff} disabled={!addStaffTeacherId} className="sm:col-span-3 h-8 text-xs">
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Staff Member
                      </Button>
                    </div>
                  </div>

                  {/* Class Representative designation */}
                  <div className="p-4 border rounded-lg bg-card space-y-3">
                    <Label className="font-semibold text-sm">Class Representative (CR)</Label>
                    <p className="text-xs text-muted-foreground">
                      Designate an enrolled student as CR with announcement permissions.
                    </p>
                    <select
                      value={selectedClass.classRepId || ''}
                      onChange={e => handleDesignateClassRep(e.target.value || null)}
                      className="w-full h-9 rounded-md border text-sm px-3 bg-background"
                    >
                      <option value="">None (Remove CR)</option>
                      {selectedClass.enrollments?.map((en: any) => (
                        <option key={en.user.id} value={en.user.id}>
                          {en.user.name} ({en.user.loginId})
                        </option>
                      ))}
                    </select>
                  </div>
                </TabsContent>

                {/* Subtab 3: Enrollment Tools */}
                <TabsContent value="enrollment" className="space-y-4">
                  {/* Tool 1: Individual */}
                  <div className="p-4 border rounded-lg bg-card space-y-2">
                    <Label className="font-semibold text-sm">Add Individual Student</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Reg No or Name..."
                        value={individualInput}
                        onChange={e => setIndividualInput(e.target.value)}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={handleEnrollIndividual} disabled={!individualInput.trim()}>
                        Enroll
                      </Button>
                    </div>
                  </div>

                  {/* Tool 2: Rule based */}
                  <div className="p-4 border rounded-lg bg-card space-y-2">
                    <Label className="font-semibold text-sm">Enroll By Rule</Label>
                    <p className="text-xs text-muted-foreground">
                      One-click enroll all Year {selectedClass.year} {selectedClass.department?.code} Section {selectedClass.section} active students into this class.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleEnrollByRule} className="gap-2">
                      <Users className="h-4 w-4" /> Enroll All Matching Students
                    </Button>
                  </div>

                  {/* Tool 3: CSV upload */}
                  <div className="p-4 border rounded-lg bg-card space-y-2">
                    <Label className="font-semibold text-sm">Bulk CSV Reg No Paste / Upload</Label>
                    <textarea
                      rows={3}
                      value={csvText}
                      onChange={e => setCsvText(e.target.value)}
                      placeholder="Paste comma or newline separated Reg Numbers (e.g. 714021104001, 714021104002...)"
                      className="w-full p-2 text-xs font-mono rounded border bg-background"
                    />
                    <Button size="sm" onClick={handleEnrollCsv} disabled={!csvText.trim()} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" /> Bulk Enroll from Reg Nos
                    </Button>
                  </div>

                  {/* Enrolled students list */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">
                        Enrolled Students ({selectedClass.enrollments?.length || 0})
                      </Label>
                    </div>
                    <div className="max-h-60 overflow-y-auto border rounded divide-y text-xs">
                      {selectedClass.enrollments?.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No students enrolled yet.</div>
                      ) : (
                        selectedClass.enrollments?.map((en: any) => (
                          <div key={en.id} className="p-2 flex items-center justify-between hover:bg-muted/30">
                            <div>
                              <span className="font-semibold">{en.user.name}</span>
                              <span className="font-mono text-muted-foreground ml-2">({en.user.loginId})</span>
                              {selectedClass.classRepId === en.user.id && (
                                <Badge variant="secondary" className="ml-2 text-2xs">Class Rep</Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-6 px-2 text-xs"
                              onClick={() => handleRemoveStudent(en.user.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Subtab 4: Settings */}
                <TabsContent value="settings" className="space-y-4">
                  <div className="p-4 border rounded-lg bg-card space-y-3">
                    <Label className="font-semibold text-sm">Classroom Actions</Label>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={handleRegenerateCode} className="justify-start gap-2">
                        <KeyRound className="h-4 w-4" /> Regenerate Join Code
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleToggleArchive} className="justify-start gap-2">
                        <Archive className="h-4 w-4" /> {selectedClass.isArchived ? 'Unarchive Classroom' : 'Archive Classroom'}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 space-y-2">
                    <Label className="font-semibold text-sm text-destructive">Danger Zone</Label>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this classroom and all related posts, notes, assignments, and test submissions.
                    </p>
                    <ConfirmDialog
                      title="Delete Classroom"
                      description={`This action cannot be undone. To confirm, type the classroom name "${selectedClass.name}".`}
                      requireTypedConfirmation={selectedClass.name}
                      confirmText="Permanently Delete Classroom"
                      onConfirm={handleDeleteClassroom}
                      trigger={
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" /> Delete Classroom
                        </Button>
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
