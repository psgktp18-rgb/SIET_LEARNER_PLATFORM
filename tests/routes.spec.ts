import { test, expect } from '@playwright/test';

// Roles and their test credentials (seeded data)
const ROLES = [
  { role: 'ADMIN', loginId: 'admin', password: '1234', dashboard: '/admin' },
  { role: 'TEACHER', loginId: 'T101', password: 'password123', dashboard: '/teacher' },
  { role: 'STUDENT', loginId: '710001', password: 'password123', dashboard: '/student' }
];

test.describe('Role Route Boundaries and 404 Checks', () => {
  for (const user of ROLES) {
    test(`Verify ${user.role} navigation and permissions`, async ({ page }) => {
      // 1. Login
      await page.goto('/login');
      await page.fill('input[placeholder="Enter your ID"]', user.loginId);
      await page.fill('input[type="password"]', user.password);
      
      const roleSelect = await page.locator('button[role="combobox"]');
      await roleSelect.click();
      await page.click(`div[role="option"]:has-text("${user.role}")`);
      
      await page.click('button:has-text("Sign in")');
      await page.waitForURL(user.dashboard);

      // 2. Check sidebar links don't 404
      // We will look for all links in the sidebar and click them, verifying no 404 text appears
      const links = await page.locator('aside a').evaluateAll(els => els.map(el => el.getAttribute('href')).filter(Boolean));
      
      for (const href of links) {
        if (!href || href === '/api/auth/logout') continue;
        
        const response = await page.goto(href as string);
        
        // Assert HTTP status is < 400
        expect(response?.status()).toBeLessThan(400);
        
        // Assert no 404 text
        await expect(page.locator('text="Page Not Found"')).toHaveCount(0);
        await expect(page.locator('text="404"')).toHaveCount(0);
      }

      // 3. Test Role Boundary
      if (user.role !== 'ADMIN') {
        const res = await page.goto('/admin');
        // Should redirect or give 403, never 404 or show admin dash
        expect([200, 403, 401]).toContain(res?.status());
        if (res?.status() === 200) {
          // If it returned 200, it must be because it redirected to login or back to user's dash
          expect(page.url()).not.toContain('/admin');
        }
      }
    });
  }
});
