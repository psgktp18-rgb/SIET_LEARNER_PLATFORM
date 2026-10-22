'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, ShieldOff, ShieldCheck, KeyRound } from 'lucide-react';

export function StudentsClient({ initialData, total, departments }: any) {
  const router = useRouter();
  const [data, setData] = useState<any[]>(initialData);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [blockTarget, setBlockTarget] = useState<any>(null);
  const [blockReason, setBlockReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const columns = [
    { key: 'loginId', header: 'Reg No' },
    { key: 'name', header: 'Name' },
    {
      key: 'department',
      header: 'Department',
      render: (t: any) => t.department?.name || <span className="text-muted-foreground text-xs">—</span>
    },
    {
      key: 'year',
      header: 'Year',
      render: (t: any) => `Year ${t.year} · Sec ${t.section || 'A'}`
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: any) => (
        <Badge variant={t.isBlocked ? 'destructive' : t.isActive ? 'default' : 'outline'}>
          {t.isBlocked ? 'Blocked' : t.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  const callPatch = async (id: string, body: object) => {
    const res = await fetch(`/api/admin/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  };

  const handleEdit = async (formData: FormData) => {
    if (!editTarget) return;
    try {
      await callPatch(editTarget.id, {
        action: 'edit',
        name: formData.get('name'),
        email: formData.get('email') || undefined,
        phone: formData.get('phone') || undefined,
        departmentId: formData.get('departmentId') || undefined,
        year: parseInt(formData.get('year') as string),
        section: formData.get('section') || undefined,
      });
      setData(prev => prev.map(s => s.id === editTarget.id ? { ...s, name: formData.get('name') } : s));
      showMsg(`Student "${editTarget.name}" updated successfully.`);
      router.refresh();
      setEditOpen(false);
    } catch (e: any) {
      showMsg(e.message, 'error');
      throw e;
    }
  };

  const handleBlock = async () => {
    if (!blockTarget) return;
    try {
      await callPatch(blockTarget.id, {
        action: blockTarget.isBlocked ? 'unblock' : 'block',
        reason: blockReason || 'Blocked by admin',
      });
      setData(prev => prev.map(s => s.id === blockTarget.id ? { ...s, isBlocked: !s.isBlocked } : s));
      showMsg(`Student ${blockTarget.isBlocked ? 'unblocked' : 'blocked'} successfully.`);
      setBlockOpen(false);
      setBlockReason('');
      router.refresh();
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  const handleResetPassword = async (student: any) => {
    if (!confirm(`Reset password for ${student.name}? Their new password will be their Reg No: "${student.loginId}"`)) return;
    try {
      await callPatch(student.id, { action: 'reset-password' });
      showMsg(`Password reset for ${student.name}. New password = Reg No "${student.loginId}". They must change it on next login.`);
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  const actions = [
    {
      label: 'Edit',
      onClick: (t: any) => { setEditTarget(t); setEditOpen(true); }
    },
    {
      label: 'Reset Password',
      onClick: (t: any) => handleResetPassword(t)
    },
    {
      label: 'Block / Unblock',
      destructive: true,
      onClick: (t: any) => { setBlockTarget(t); setBlockReason(''); setBlockOpen(true); }
    },
  ];

  const handleAddStudent = async (formData: FormData) => {
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: formData.get('loginId'),
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        departmentId: formData.get('departmentId') || undefined,
        year: parseInt(formData.get('year') as string),
        section: formData.get('section') || 'A'
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create student');
    showMsg(`Student "${formData.get('name')}" created. Default password = Reg No "${formData.get('loginId')}"`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Students"
        description="Add, edit, block and manage student accounts."
        role="ADMIN"
        currentPath="/admin/students"
        action={
          <FormDialog
            title="Add Student"
            description="Create a new student account. Default password = Register Number."
            trigger={<Button><Plus className="mr-2 h-4 w-4" /> Add Student</Button>}
            onSubmit={handleAddStudent}
            submitText="Create Student"
          >
            <div className="grid gap-2">
              <Label>Register No</Label>
              <Input name="loginId" required />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input name="name" required />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" name="email" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Year</Label>
                <select name="year" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Section</Label>
                <Input name="section" defaultValue="A" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <select name="departmentId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required>
                <option value="">Select Department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </FormDialog>
        }
      />

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Students</div>
          <div className="text-2xl font-bold mt-2">{total}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="text-sm font-medium text-muted-foreground">Active</div>
          <div className="text-2xl font-bold mt-2">{data.filter((t: any) => t.isActive && !t.isBlocked).length}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="text-sm font-medium text-muted-foreground">Blocked</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{data.filter((t: any) => t.isBlocked).length}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="text-sm font-medium text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold mt-2">{data.filter((t: any) => !t.isActive).length}</div>
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        totalCount={total}
        actions={actions}
      />

      {/* Edit Dialog */}
      {editTarget && (
        <FormDialog
          title={`Edit: ${editTarget.name}`}
          description="Update student account details."
          trigger={<span />}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={handleEdit}
          submitText="Save Changes"
        >
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input name="name" defaultValue={editTarget.name} required />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" name="email" defaultValue={editTarget.email || ''} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input type="tel" name="phone" defaultValue={editTarget.phone || ''} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Year</Label>
              <select name="year" defaultValue={editTarget.year || 3} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Section</Label>
              <Input name="section" defaultValue={editTarget.section || 'A'} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Department</Label>
            <select name="departmentId" defaultValue={editTarget.department?.id || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">No Department</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </FormDialog>
      )}

      {/* Block / Unblock Dialog */}
      {blockTarget && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${blockOpen ? '' : 'hidden'}`}>
          <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 border">
            <h3 className="text-lg font-bold mb-1">
              {blockTarget.isBlocked ? 'Unblock' : 'Block'} {blockTarget.name}?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {blockTarget.isBlocked
                ? 'This will restore their access immediately.'
                : 'They will be signed out immediately and cannot log back in.'}
            </p>
            {!blockTarget.isBlocked && (
              <div className="grid gap-2 mb-4">
                <Label>Reason (optional)</Label>
                <Input
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="e.g. Disciplinary action"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button>
              <Button
                variant={blockTarget.isBlocked ? 'default' : 'destructive'}
                onClick={handleBlock}
              >
                {blockTarget.isBlocked ? 'Unblock' : 'Block Student'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
