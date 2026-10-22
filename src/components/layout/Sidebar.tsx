'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Bell,
  LineChart,
  Settings,
  Sparkles,
  Clock,
  BarChart3,
  Inbox,
  FileText,
  BookMarked,
  Target,
  TrendingUp,
  Home,
  UserCircle,
} from 'lucide-react';
import { RouteItem } from '@/lib/routes';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardCheck,
  Bell,
  LineChart,
  Settings,
  Sparkles,
  Clock,
  BarChart3,
  Inbox,
  FileText,
  BookMarked,
  Target,
  TrendingUp,
  Home,
};

interface SidebarProps {
  routes: RouteItem[];
  role: string;
  user: {
    name: string;
    role: string;
    loginId?: string;
    isHod?: boolean;
  };
}

export function Sidebar({ routes, role, user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Guarantee at most 7 items
  const activeRoutes = routes.slice(0, 7);

  const renderNavItems = (isMobile = false) => (
    <div className="flex flex-col gap-1.5 px-2 py-3 flex-1 overflow-y-auto">
      {activeRoutes.map((item, idx) => {
        const IconComponent = ICON_MAP[item.icon] || Home;
        const isRoot = item.href === `/${role.toLowerCase()}`;
        const isActive = isRoot
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={idx}
            href={item.href}
            onClick={() => isMobile && setMobileOpen(false)}
            title={collapsed && !isMobile ? item.title : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150',
              isActive
                ? 'bg-primary text-secondary shadow-xs font-bold animate-activate-pulse'
                : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
              collapsed && !isMobile && 'justify-center px-2 py-3'
            )}
          >
            {/* Active Left Indicator Bar */}
            {isActive && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-secondary rounded-r-full" />
            )}

            <IconComponent
              className={cn(
                'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                isActive ? 'text-secondary font-bold' : 'text-muted-foreground group-hover:text-primary'
              )}
            />

            {(!collapsed || isMobile) && (
              <span className="truncate tracking-wide">{item.title}</span>
            )}

            {/* Sparkle badge for AI items */}
            {item.title.toLowerCase().includes('ai') && (!collapsed || isMobile) && (
              <span className="ml-auto text-3xs bg-secondary/20 text-secondary border border-secondary/40 px-1.5 py-0.2 rounded-full font-bold">
                AI
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Trigger Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b bg-card">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<button type="button" className="inline-flex items-center gap-2 p-1.5 rounded-md hover:bg-accent text-primary text-xs font-bold focus:outline-none" />}>
            <Menu className="h-5 w-5 text-primary" />
            <span>Navigation Menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 flex flex-col bg-background">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            {/* Top Brand */}
            <div className="p-4 border-b bg-primary text-primary-foreground flex items-center gap-3">
              <img
                src="/siet-logo.jpeg"
                alt="SIET Logo"
                className="h-9 w-9 rounded-full bg-white object-contain p-0.5 border border-secondary"
              />
              <div>
                <h3 className="text-sm font-bold text-secondary">Lecture Lens</h3>
                <p className="text-3xs text-primary-foreground/80">Sri Shakthi Inst of Engg & Tech</p>
              </div>
            </div>

            {/* Nav list */}
            {renderNavItems(true)}

            {/* Bottom User Card */}
            <div className="p-3 border-t bg-muted/30 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-secondary flex items-center justify-center font-bold text-xs shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'LL'}
              </div>
              <div className="flex flex-col leading-tight truncate">
                <span className="text-xs font-bold text-foreground truncate">{user.name}</span>
                <span className="text-3xs text-muted-foreground uppercase">{user.isHod ? 'HOD' : user.role}</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <span className="text-2xs font-mono text-muted-foreground">
          {user.isHod ? 'HOD' : user.role} Portal
        </span>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-card transition-all duration-200 select-none shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Top Header Card */}
        <div className="p-3 border-b flex items-center justify-between gap-2 bg-muted/20">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src="/siet-logo.jpeg"
                alt="SIET Logo"
                className="h-7 w-7 rounded-full bg-white object-contain p-0.5 border border-secondary shrink-0"
              />
              <div className="flex flex-col leading-none truncate">
                <span className="text-xs font-bold text-primary tracking-tight">SIET Campus</span>
                <span className="text-3xs text-muted-foreground">Coimbatore</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mx-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* 7 Hub Navigation Items */}
        {renderNavItems(false)}

        {/* Bottom User Profile Badge with Real Name */}
        <div className="p-3 border-t bg-muted/10 mt-auto">
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <div className="h-7 w-7 rounded-full bg-primary text-secondary font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {user.name ? user.name.slice(0, 2).toUpperCase() : 'LL'}
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none overflow-hidden">
                <span className="text-xs font-bold text-foreground truncate">{user.name}</span>
                <span className="text-3xs text-muted-foreground uppercase mt-0.5">
                  {user.isHod ? 'HOD' : user.role}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
