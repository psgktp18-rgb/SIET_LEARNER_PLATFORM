'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Sparkles, User, FileText, Settings, ArrowRight } from 'lucide-react';
import { getRoutesForRole } from '@/lib/routes';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
}

export function GlobalSearchDialog({ open, onOpenChange, role }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const routes = getRoutesForRole(role);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const filteredRoutes = routes.filter(r => 
    r.title.toLowerCase().includes(query.toLowerCase()) || 
    r.href.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    { title: 'AI Studio / AI Tutor', href: role === 'TEACHER' ? '/teacher/ai-studio' : '/student/ai-tutor', icon: Sparkles, roles: ['TEACHER', 'STUDENT'] },
    { title: 'My Classrooms', href: `/${role.toLowerCase()}/classrooms`, icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'HOD', 'STUDENT'] },
    { title: 'Marks & Performance', href: `/${role.toLowerCase()}/marks`, icon: FileText, roles: ['TEACHER', 'HOD', 'STUDENT', 'ADMIN'] },
    { title: 'System Settings', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  ].filter(a => a.roles.includes(role.toUpperCase()));

  const handleSelect = (href: string) => {
    onOpenChange(false);
    setQuery('');
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-primary/20">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick Search</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-3 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search pages, tools, or resources... (Esc to close)"
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-12 bg-transparent"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-2xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-3 space-y-3">
          <div>
            <p className="text-2xs font-semibold text-muted-foreground uppercase px-2 mb-1.5">Hub Navigation</p>
            <div className="space-y-1">
              {filteredRoutes.map((route) => (
                <button
                  key={route.href}
                  onClick={() => handleSelect(route.href)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium">{route.title}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
              {filteredRoutes.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">No matching navigation items.</p>
              )}
            </div>
          </div>

          {quickActions.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-muted-foreground uppercase px-2 mb-1.5">Direct Shortcuts</p>
              <div className="space-y-1">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.href}
                      onClick={() => handleSelect(action.href)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-secondary" />
                        <span>{action.title}</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 bg-muted/20 text-2xs text-muted-foreground flex items-center justify-between">
          <span>Navigate with mouse or Tab · Press Enter to open</span>
          <span className="font-mono">Ctrl + K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
