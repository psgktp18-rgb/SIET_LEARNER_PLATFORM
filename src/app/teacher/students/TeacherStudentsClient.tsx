'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function TeacherStudentsClient({ students, currentUserId }: any) {
  const router = useRouter();

  const handleAction = async (userId: string, action: 'block'|'unblock', currentBlockedBy?: string) => {
    if (action === 'unblock' && currentBlockedBy && currentBlockedBy !== currentUserId && currentBlockedBy !== 'Admin') {
       // Ideally we check if it's admin, but blockedBy is userId. If we can't tell, we just try and let API reject.
    }
    
    let reason = '';
    if (action === 'block') {
      reason = prompt('Enter reason for blocking:') || '';
      if (!reason) return;
    }

    const res = await fetch('/api/teacher/students/block', {
      method: 'POST',
      body: JSON.stringify({ userId, action, reason }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      alert(`User ${action}ed successfully`);
      router.refresh();
    } else {
      const { error } = await res.json();
      alert(`Failed to ${action}: ${error}`);
    }
  }

  return (
    <Card className="p-6">
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-2">Name</th>
            <th className="py-2">Reg No</th>
            <th className="py-2">Year / Section</th>
            <th className="py-2">Status</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((u:any) => (
            <tr key={u.id} className="border-t">
              <td className="py-3 font-medium">{u.name}</td>
              <td className="py-3">{u.loginId}</td>
              <td className="py-3">{u.year} / {u.section}</td>
              <td className="py-3">
                {u.isBlocked ? (
                  <span className="text-red-600 font-bold">Blocked</span>
                ) : (
                  <span className="text-green-600">Active</span>
                )}
              </td>
              <td className="py-3">
                {u.isBlocked ? (
                  <Button variant="outline" size="sm" onClick={() => handleAction(u.id, 'unblock', u.blockedBy)}>Unblock</Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={() => handleAction(u.id, 'block')}>Block</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
