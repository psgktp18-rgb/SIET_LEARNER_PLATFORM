import { prisma } from '@/lib/prisma';
import BlockedClient from './BlockedClient';

export const instant = false;

export default async function BlockedUsersPage() {
  const blockedUsers = await prisma.user.findMany({
    where: { isBlocked: true }
  });

  const blockerIds = blockedUsers.map(u => u.blockedBy).filter(Boolean);
  const blockers = await prisma.user.findMany({
    where: { id: { in: blockerIds as string[] } },
    select: { id: true, name: true, role: true }
  });

  const data = blockedUsers.map(u => {
    const blocker = blockers.find(b => b.id === u.blockedBy);
    return {
      id: u.id,
      name: u.name,
      loginId: u.loginId,
      role: u.role,
      blockReason: u.blockReason,
      blockedByName: blocker ? `${blocker.name} (${blocker.role})` : u.blockedBy
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Blocked Users</h1>
      <BlockedClient blockedUsers={data} />
    </div>
  )
}
