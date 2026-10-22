import { test, expect } from '@playwright/test';

test.describe('Admin Interactive Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Admin
    await page.goto('/login');
    await page.fill('input[name="loginId"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('Teachers page has interactive elements', async ({ page }) => {
    await page.goto('/admin/teachers');
    
    // Check Page Header and Sidebar
    await expect(page.locator('h1').filter({ hasText: 'Manage Teachers' })).toBeVisible();
    
    // Check Add Teacher button exists
    const addButton = page.getByRole('button', { name: /Add Teacher/i });
    await expect(addButton).toBeVisible();
    
    // Test the Add Teacher dialog
    await addButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create a new faculty account.')).toBeVisible();
    
    // Close the dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    
    // Search table
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('John Doe');
    await page.waitForTimeout(500); // debounce wait
  });

  test('Students page has interactive elements', async ({ page }) => {
    await page.goto('/admin/students');
    
    // Check Page Header
    await expect(page.locator('h1').filter({ hasText: 'Manage Students' })).toBeVisible();
    
    // Check Add Student button exists
    const addButton = page.getByRole('button', { name: /Add Student/i });
    await expect(addButton).toBeVisible();
    
    // Test the Add Student dialog
    await addButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Close the dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Departments page has interactive elements', async ({ page }) => {
    await page.goto('/admin/departments');
    
    // Check Page Header
    await expect(page.locator('h1').filter({ hasText: 'Departments' })).toBeVisible();
    
    // Check Add Department button exists
    const addButton = page.getByRole('button', { name: /Add Department/i });
    await expect(addButton).toBeVisible();
    
    // Tabs test
    await page.getByRole('tab', { name: 'Subjects' }).click();
    await expect(page.getByText('Subjects management coming soon')).toBeVisible();
  });
});
