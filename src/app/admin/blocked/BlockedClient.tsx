'use client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function BlockedClient({ blockedUsers }: { blockedUsers: any[] }) {
  const router = useRouter();

  const unblock = async (userId: string) => {
    if (!confirm('Are you sure you want to unblock this user?')) return;
    const res = await fetch('/api/admin/blocked', {
      method: 'POST',
      body: JSON.stringify({ userId }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      alert('User unblocked successfully');
      router.refresh();
    } else {
      alert('Failed to unblock');
    }
  }

  return (
    <Card className="p-6">
      {blockedUsers.length === 0 ? (
        <p className="text-muted-foreground">No blocked users found.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Reg No / ID</th>
              <th className="py-2">Role</th>
              <th className="py-2">Blocked By</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {blockedUsers.map(u => (
              <tr key={u.id} className="border-t">
                <td className="py-3 font-medium">{u.name}</td>
                <td className="py-3">{u.loginId}</td>
                <td className="py-3">{u.role}</td>
                <td className="py-3">{u.blockedByName || 'Admin'}</td>
                <td className="py-3 text-red-600 max-w-xs truncate" title={u.blockReason}>{u.blockReason}</td>
                <td className="py-3">
                  <Button variant="outline" size="sm" onClick={() => unblock(u.id)}>Unblock</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
