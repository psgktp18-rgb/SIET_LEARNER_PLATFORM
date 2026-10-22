'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, ShieldOff, ShieldCheck, KeyRound } from 'lucide-react';

export function TeachersClient({ initialData, total, departments }: any) {
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
    { key: 'loginId', header: 'Staff ID' },
    { key: 'name', header: 'Name' },
    {
      key: 'department',
      header: 'Department',
      render: (t: any) => t.department?.name || <span className="text-muted-foreground text-xs">—</span>
    },
    {
      key: 'role',
      header: 'Role',
      render: (t: any) => <Badge variant={t.role === 'HOD' ? 'default' : 'secondary'}>{t.role}</Badge>
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
    const res = await fetch(`/api/admin/teachers/${id}`, {
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
        isHOD: formData.get('isHOD') === 'on',
      });
      setData(prev => prev.map(t => t.id === editTarget.id ? { ...t, name: formData.get('name') } : t));
      showMsg(`Teacher "${editTarget.name}" updated successfully.`);
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
      setData(prev => prev.map(t => t.id === blockTarget.id ? { ...t, isBlocked: !t.isBlocked } : t));
      showMsg(`User ${blockTarget.isBlocked ? 'unblocked' : 'blocked'} successfully.`);
      setBlockOpen(false);
      setBlockReason('');
      router.refresh();
    } catch (e: any) {
      showMsg(e.message, 'error');
    }
  };

  const handleResetPassword = async (teacher: any) => {
    if (!confirm(`Reset password for ${teacher.name}? Their new password will be their Staff ID: "${teacher.loginId}"`)) return;
    try {
      await callPatch(teacher.id, { action: 'reset-password' });
      showMsg(`Password reset for ${teacher.name}. New password = Staff ID "${teacher.loginId}". They must change it on next login.`);
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

  const handleAddTeacher = async (formData: FormData) => {
    const res = await fetch('/api/admin/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: formData.get('loginId'),
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        departmentId: formData.get('departmentId') || undefined,
        isHOD: formData.get('isHOD') === 'on'
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create teacher');
    showMsg(`Teacher "${formData.get('name')}" created. Default password = Staff ID "${formData.get('loginId')}"`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Teachers"
        description="Add, edit, block and manage faculty accounts."
        role="ADMIN"
        currentPath="/admin/teachers"
        action={
          <FormDialog
            title="Add Teacher"
            description="Create a new faculty account. Default password = Staff ID."
            trigger={<Button><Plus className="mr-2 h-4 w-4" /> Add Teacher</Button>}
            onSubmit={handleAddTeacher}
            submitText="Create Teacher"
          >
            <div className="grid gap-2">
              <Label>Staff ID</Label>
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
            <div className="grid gap-2">
              <Label>Phone (Optional)</Label>
              <Input type="tel" name="phone" />
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <select name="departmentId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">No Department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox name="isHOD" id="isHOD" />
              <Label htmlFor="isHOD">Assign as Head of Department (HOD)</Label>
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
          <div className="text-sm font-medium text-muted-foreground">Total Teachers</div>
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
          <div className="text-sm font-medium text-muted-foreground">HODs</div>
          <div className="text-2xl font-bold mt-2">{data.filter((t: any) => t.role === 'HOD').length}</div>
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
          description="Update teacher account details."
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
          <div className="grid gap-2">
            <Label>Department</Label>
            <select name="departmentId" defaultValue={editTarget.department?.id || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">No Department</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Checkbox name="isHOD" id="editIsHOD" defaultChecked={editTarget.role === 'HOD'} />
            <Label htmlFor="editIsHOD">Head of Department (HOD)</Label>
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
                {blockTarget.isBlocked ? 'Unblock' : 'Block User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
