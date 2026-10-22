import { test, expect } from '@playwright/test';

test.describe('Privacy and Boundary Checks', () => {
  test('A student cannot open another classs data', async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('input[placeholder="Enter your ID"]', '710001');
    await page.fill('input[type="password"]', 'password123');
    
    const roleSelect = await page.locator('button[role="combobox"]');
    await roleSelect.click();
    await page.click(`div[role="option"]:has-text("STUDENT")`);
    
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/student');

    // Attempt to access an invalid/other class
    // We use a dummy UUID that the student is definitely not enrolled in
    const response = await page.goto('/student/classrooms/cl_dummy_other_class_123');
    
    // It should return 404 because the enrollment check fails
    expect(response?.status()).toBe(404);
  });
});
