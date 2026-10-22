'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
const toast = { create: (x: any) => { console.log(x); alert(x.title || 'Success'); } };
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DepartmentsClient({ departments, total }: any) {
  const router = useRouter();
  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { 
      key: 'teachersCount', 
      header: 'Teachers',
      render: (d: any) => d._count?.users || 0
    },
    { 
      key: 'classroomsCount', 
      header: 'Classrooms',
      render: (d: any) => d._count?.classrooms || 0
    }
  ];

  const actions = [
    { label: 'View Details', onClick: (d: any) => router.push(`/admin/departments/${d.id}`) },
    { label: 'Edit', onClick: () => toast.create({}) },
    { label: 'Delete', onClick: () => toast.create({}), destructive: true },
  ];

  const handleAddDepartment = async (formData: FormData) => {
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: formData.get('code'),
        name: formData.get('name')
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    toast.create({});
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Departments" 
        description="Manage academic departments, subjects, and sections."
        role="ADMIN"
        currentPath="/admin/departments"
        action={
          <FormDialog 
            title="Add Department" 
            description="Create a new academic department."
            trigger={<Button><Plus className="mr-2 h-4 w-4" /> Add Department</Button>}
            onSubmit={handleAddDepartment}
            submitText="Create Department"
          >
            <div className="grid gap-2">
              <Label>Department Code</Label>
              <Input name="code" placeholder="e.g. CSE" required />
            </div>
            <div className="grid gap-2">
              <Label>Department Name</Label>
              <Input name="name" placeholder="e.g. Computer Science and Engineering" required />
            </div>
          </FormDialog>
        }
      />

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments ({total})</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="academic-years">Academic Years</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="space-y-4">
          <DataTable 
            data={departments} 
            columns={columns} 
            totalCount={total} 
            actions={actions}
            onRowClick={(d) => router.push(`/admin/departments/${d.id}`)}
          />
        </TabsContent>
        <TabsContent value="subjects">
          <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">
            Subjects management coming soon.
          </div>
        </TabsContent>
        <TabsContent value="academic-years">
          <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">
            Academic Years management coming soon.
          </div>
        </TabsContent>
        <TabsContent value="sections">
          <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">
            Sections management coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
