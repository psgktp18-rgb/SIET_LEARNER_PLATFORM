'use client';

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { getRoutesForRole } from '@/lib/routes';

interface AppLayoutProps {
  children: React.ReactNode;
  user: {
    userId: string;
    name: string;
    role: string;
    email?: string | null;
    isHod?: boolean;
    loginId?: string;
  };
}

export function AppLayout({ children, user }: AppLayoutProps) {
  const routes = getRoutesForRole(user.isHod ? 'hod' : user.role);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Universal Top Header */}
      <Header user={user} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar routes={routes} role={user.isHod ? 'HOD' : user.role} user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/15 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
