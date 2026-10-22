export interface RouteItem {
  title: string;
  icon: string;
  href: string;
  group?: string;
}

export const ADMIN_ROUTES: RouteItem[] = [
  { title: 'Dashboard', icon: 'LayoutDashboard', href: '/admin' },
  { title: 'People', icon: 'Users', href: '/admin/students' },
  { title: 'Academics', icon: 'BookOpen', href: '/admin/classrooms' },
  { title: 'Assessments', icon: 'ClipboardCheck', href: '/admin/marks' },
  { title: 'Notices', icon: 'Bell', href: '/admin/announcements' },
  { title: 'Insights', icon: 'LineChart', href: '/admin/analytics' },
  { title: 'System', icon: 'Settings', href: '/admin/settings' },
];

export const TEACHER_ROUTES: RouteItem[] = [
  { title: 'Dashboard', icon: 'LayoutDashboard', href: '/teacher' },
  { title: 'Classrooms', icon: 'BookOpen', href: '/teacher/classrooms' },
  { title: 'AI Studio', icon: 'Sparkles', href: '/teacher/ai-studio' },
  { title: 'Class Time', icon: 'Clock', href: '/teacher/class-time' },
  { title: 'Marks and Performance', icon: 'BarChart3', href: '/teacher/marks' },
  { title: 'Students', icon: 'Users', href: '/teacher/students' },
  { title: 'Inbox', icon: 'Inbox', href: '/teacher/doubts' },
];

export const HOD_ROUTES: RouteItem[] = [
  { title: 'Dashboard', icon: 'LayoutDashboard', href: '/hod' },
  { title: 'Performance', icon: 'BarChart3', href: '/hod/performance' },
  { title: 'Faculty', icon: 'Users', href: '/hod/teachers' },
  { title: 'Students', icon: 'Users', href: '/hod/sections' },
  { title: 'Reports', icon: 'FileText', href: '/hod/exports' },
  { title: 'AI Insights', icon: 'Sparkles', href: '/hod/ai-insights' },
  { title: 'Notices', icon: 'Bell', href: '/hod/notices' },
];

export const STUDENT_ROUTES: RouteItem[] = [
  { title: 'Dashboard', icon: 'LayoutDashboard', href: '/student' },
  { title: 'Classes', icon: 'BookOpen', href: '/student/classrooms' },
  { title: 'AI Tutor', icon: 'Sparkles', href: '/student/ai-tutor' },
  { title: 'Study', icon: 'BookMarked', href: '/student/study' },
  { title: 'Exam Hub', icon: 'Target', href: '/student/exam-hub' },
  { title: 'Progress', icon: 'TrendingUp', href: '/student/marks' },
  { title: 'Notices', icon: 'Bell', href: '/student/notices' },
];

export function getRoutesForRole(role: string): RouteItem[] {
  const r = role.toLowerCase();
  if (r === 'admin') return ADMIN_ROUTES;
  if (r === 'teacher') return TEACHER_ROUTES;
  if (r === 'hod') return HOD_ROUTES;
  return STUDENT_ROUTES;
}

export function getDashboardForRole(role: string): string {
  const r = role.toLowerCase();
  if (r === 'admin') return '/admin';
  if (r === 'teacher') return '/teacher';
  if (r === 'hod') return '/hod';
  return '/student';
}

type RouteUser = { role: string; isHod: boolean; mustChangePassword?: boolean };
export function getHomeRoute(user: RouteUser): string {
  if (user.mustChangePassword) return '/change-password';
  if (user.role === 'ADMIN' || user.role === 'admin') return '/admin';
  if (user.isHod) return '/hod';
  if (user.role === 'TEACHER' || user.role === 'teacher') return '/teacher';
  return '/student';
}
