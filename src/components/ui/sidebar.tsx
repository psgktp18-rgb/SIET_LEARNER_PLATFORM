'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, Users, Settings, BookOpen, BarChart, ShieldAlert, GraduationCap, ClipboardList, Book, Bell, Calendar, HelpCircle } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Users, Settings, BookOpen, BarChart, ShieldAlert,
  GraduationCap, ClipboardList, Book, Bell, Calendar, HelpCircle, Menu
};

interface RouteItem {
  title: string;
  icon: string;
  href: string;
  group?: string;
}

export function Sidebar({ routes, role = 'admin' }: { routes: RouteItem[], role?: string }) {
  const pathname = usePathname();
  
  // Group routes
  const groups: Record<string, RouteItem[]> = {};
  routes.forEach(route => {
    const groupName = route.group || 'General';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(route);
  });

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="space-y-1">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {group}
            </h3>
            {items.map((item, i) => {
              // strict equality for dashboard to avoid active state on everything
              const isActive = item.href === `/${role}` 
                ? pathname === `/${role}`
                : pathname.startsWith(item.href);

              const IconComponent = ICON_MAP[item.icon] || Home;
                
              return (
                <Link 
                  key={i} 
                  href={item.href} 
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group relative",
                    isActive 
                      ? "bg-secondary/10 text-secondary font-bold" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-1 rounded-r-full bg-secondary" />
                  )}
                  <IconComponent className={cn("h-5 w-5", isActive ? "text-secondary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="md:hidden flex items-center p-4 border-b">
        <Sheet>
          <SheetTrigger render={<div role="button" tabIndex={0} className="inline-flex items-center justify-center size-8 rounded-md hover:bg-accent cursor-pointer" />}>
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="ml-4 font-bold tracking-tight text-primary">Menu</span>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-background">
        <SidebarContent />
      </aside>
    </>
  );
}
