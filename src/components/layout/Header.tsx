'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  Bell,
  HelpCircle,
  Globe,
  Sun,
  Moon,
  User,
  LogOut,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlobalSearchDialog } from './GlobalSearchDialog';
import { HelpBotModal } from './HelpBotModal';
import { CalendarQuickModal } from './CalendarQuickModal';

interface HeaderProps {
  user: {
    userId: string;
    name: string;
    role: string;
    email?: string | null;
    isHod?: boolean;
    loginId?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'TA'>('EN');
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'New Semester Schedule Active', time: '10m ago', unread: true },
    { id: '2', title: 'Anna University Exam Timetable Released', time: '1h ago', unread: true },
  ]);

  useEffect(() => {
    // Check initial dark mode state
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
        setIsDark(false);
        try { localStorage.setItem('theme', 'light'); } catch {}
      } else {
        root.classList.add('dark');
        setIsDark(true);
        try { localStorage.setItem('theme', 'dark'); } catch {}
      }
    }
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'TA' : 'EN'));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-primary px-4 md:px-6 text-primary-foreground shadow-md transition-colors">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <img
            src="/siet-logo.jpeg"
            alt="SIET Logo"
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-white object-contain p-0.5 border-2 border-secondary shadow-xs shrink-0"
          />
          <div className="flex flex-col leading-none">
            <span className="text-base md:text-lg font-bold text-secondary tracking-tight">
              Lecture Lens
            </span>
            <span className="hidden sm:inline text-3xs text-primary-foreground/80 font-medium">
              Sri Shakthi Institute of Engineering and Technology
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Center/Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Global Search Button (Ctrl+K) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 px-2.5 py-1.5 text-xs text-primary-foreground border border-primary-foreground/15 transition-colors focus:outline-none focus:ring-1 focus:ring-secondary"
            title="Global Search (Ctrl+K)"
          >
            <Search className="h-4 w-4 text-secondary shrink-0" />
            <span className="hidden md:inline font-normal opacity-90">Search...</span>
            <kbd className="hidden lg:inline-flex h-4 items-center rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1 font-mono text-3xs text-secondary">
              Ctrl+K
            </kbd>
          </button>

          {/* Timetable / Calendar Quick Trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCalendarOpen(true)}
            className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-secondary rounded-lg h-9 w-9"
            title="View Academic Calendar / Timetable"
          >
            <Calendar className="h-4 w-4" />
          </Button>

          {/* Help Bot Trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpOpen(true)}
            className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-secondary rounded-lg h-9 w-9"
            title="Campus AI Help Bot"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" className="relative p-2 rounded-lg text-primary-foreground hover:bg-primary-foreground/15 hover:text-secondary transition-colors focus:outline-none" title="Notifications" />}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-secondary ring-2 ring-primary" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-2">
              <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-3xs bg-secondary text-primary font-bold">
                    {unreadCount} New
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-1 py-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2 text-xs rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                      );
                    }}
                  >
                    <p className={`font-medium ${n.unread ? 'text-primary font-bold' : 'text-foreground'}`}>
                      {n.title}
                    </p>
                    <span className="text-3xs text-muted-foreground">{n.time}</span>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-secondary font-bold text-xs h-9 px-2 gap-1 rounded-lg"
            title="Toggle Language: English / தமிழ்"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{language}</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-secondary rounded-lg h-9 w-9"
            title="Toggle Light / Dark Mode"
          >
            {isDark ? <Sun className="h-4 w-4 text-secondary" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="h-5 w-px bg-primary-foreground/20 mx-0.5 hidden sm:block" />

          {/* Avatar Menu with Real Name */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-primary-foreground/10 transition-colors focus:outline-none" />}>
              <div className="h-8 w-8 rounded-full bg-secondary text-primary font-bold flex items-center justify-center text-xs shadow-xs border border-secondary/50">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'LL'}
              </div>
              <div className="hidden md:flex flex-col leading-tight">
                <span className="text-xs font-bold text-secondary truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-3xs text-primary-foreground/75 uppercase tracking-wide">
                  {user.isHod ? 'HOD' : user.role}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold leading-none text-foreground">{user.name}</p>
                  <p className="text-2xs leading-none text-muted-foreground font-mono">
                    {user.loginId || user.email || user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={`/${user.role.toLowerCase()}`} className="cursor-pointer text-xs flex items-center gap-2" />}>
                <User className="h-3.5 w-3.5 text-primary" />
                <span>My Dashboard</span>
              </DropdownMenuItem>
              {user.role === 'STUDENT' && (
                <DropdownMenuItem render={<Link href="/student/ai-tutor" className="cursor-pointer text-xs flex items-center gap-2" />}>
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                  <span>AI Tutor</span>
                </DropdownMenuItem>
              )}
              {user.role === 'TEACHER' && (
                <DropdownMenuItem render={<Link href="/teacher/ai-studio" className="cursor-pointer text-xs flex items-center gap-2" />}>
                  <Sparkles className="h-3.5 w-3.5 text-secondary" />
                  <span>AI Studio</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<a href="/api/auth/logout" className="cursor-pointer text-xs text-destructive flex items-center gap-2" />}>
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Modals */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} role={user.role} />
      <HelpBotModal open={helpOpen} onOpenChange={setHelpOpen} userRole={user.role} />
      <CalendarQuickModal open={calendarOpen} onOpenChange={setCalendarOpen} userRole={user.role} />
    </>
  );
}
