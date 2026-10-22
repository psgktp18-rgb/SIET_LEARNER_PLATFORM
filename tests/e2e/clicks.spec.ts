import { test, expect } from '@playwright/test';

// The routes we built across all portals
const ADMIN_ROUTES = [
  '/admin', '/admin/students', '/admin/teachers', '/admin/departments', '/admin/classrooms', 
  '/admin/rollout', '/admin/blocked', '/admin/password-requests', '/admin/marks', 
  '/admin/announcements', '/admin/exams', '/admin/mentors', '/admin/feedback', 
  '/admin/analytics', '/admin/ai', '/admin/settings', '/admin/backups', '/admin/audit-log'
];

const TEACHER_ROUTES = [
  '/teacher', '/teacher/classrooms', '/teacher/class-time', '/teacher/marks', 
  '/teacher/question-bank', '/teacher/doubts', '/teacher/students', '/teacher/attendance',
  '/teacher/mentoring', '/teacher/feedback', '/teacher/notices', '/teacher/timetable'
];

const HOD_ROUTES = [
  '/hod', '/hod/performance', '/hod/teachers', '/hod/sections', '/hod/at-risk',
  '/hod/attendance', '/hod/mentors', '/hod/marks', '/hod/feedback', '/hod/notices',
  '/hod/rollout', '/hod/exports'
];

const STUDENT_ROUTES = [
  '/student', '/student/classrooms', '/student/assignments', '/student/tests', 
  '/student/quizzes', '/student/flashcards', '/student/my-notes', '/student/marks', 
  '/student/attendance', '/student/exam-hub', '/student/leaderboard', '/student/skill-tracks', 
  '/student/study-buddy', '/student/notices', '/student/feedback', '/student/calendar', '/student/profile'
];

async function login(page: any, loginId: any, password: any) {
  await page.goto('/login');
  await page.fill('input[type="text"]', loginId);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  // Wait for the redirect to finish
}

test.describe('Portal Page Visit Tests', () => {
  test('Admin can visit all admin routes', async ({ page }) => {
    await login(page, 'admin', '1234');
    for (const route of ADMIN_ROUTES) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      const content = await page.content();
      expect(content).not.toContain('Application Error'); // Next.js error boundary
    }
  });

  test('Teacher can visit all teacher routes', async ({ page }) => {
    await login(page, 'T101', 'password123');
    for (const route of TEACHER_ROUTES) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      const content = await page.content();
      expect(content).not.toContain('Application Error');
    }
  });

  test('HOD can visit all HOD routes', async ({ page }) => {
    await login(page, 'HOD-CSE', 'password123');
    for (const route of HOD_ROUTES) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      const content = await page.content();
      expect(content).not.toContain('Application Error');
    }
  });

  test('Student can visit all student routes', async ({ page }) => {
    await login(page, '710001', 'password123');
    for (const route of STUDENT_ROUTES) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      const content = await page.content();
      expect(content).not.toContain('Application Error');
    }
  });

  test('Permissions: Student cannot access admin portal', async ({ page }) => {
    await login(page, '710001', 'password123');
    await page.goto('/admin');
    const content = await page.content();
    // Assuming redirection or 403 error page which does not contain "Admin Dashboard"
    expect(page.url()).not.toContain('/admin'); 
  });
});
