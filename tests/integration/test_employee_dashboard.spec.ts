/**
 * Integration Test: Employee Dashboard Access
 *
 * This test validates the complete user journey for employee dashboard access
 * as described in the quickstart.md Test 1.1: Employee Dashboard Access.
 *
 * IMPORTANT: This test MUST FAIL initially (TDD red phase).
 *
 * User Journey:
 * 1. Employee logs in with valid credentials
 * 2. Navigates to dashboard
 * 3. Sees personal metrics, recent activities, pending tasks, quick actions
 * 4. Verifies no manager-level features are visible
 * 5. Validates dashboard loads within performance requirements
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { Client } from 'pg';

interface TestUser {
  id: string;
  email: string;
  password: string;
  roleLevel: number;
  displayName: string;
}

class EmployeeDashboardTestHelper {
  constructor(private page: Page, private dbClient: Client) {}

  async loginAsEmployee(user: TestUser): Promise<void> {
    await this.page.goto('/auth/login');

    // Fill login form
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);

    // Click login button
    await this.page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard');
  }

  async validateDashboardElements(): Promise<void> {
    // Personal metrics summary should be visible
    await expect(this.page.locator('[data-testid="personal-metrics"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="hours-worked-widget"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="leave-balance-widget"]')).toBeVisible();

    // Recent activities section
    await expect(this.page.locator('[data-testid="recent-activities"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="recent-time-entries"]')).toBeVisible();

    // Pending tasks and notifications
    await expect(this.page.locator('[data-testid="pending-tasks"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="notifications-panel"]')).toBeVisible();

    // Quick action buttons
    await expect(this.page.locator('[data-testid="log-time-button"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="request-leave-button"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="view-goals-button"]')).toBeVisible();

    // Upcoming deadlines/training
    await expect(this.page.locator('[data-testid="upcoming-deadlines"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="training-reminders"]')).toBeVisible();
  }

  async validateNoManagerFeatures(): Promise<void> {
    // Manager-specific elements should not be visible
    await expect(this.page.locator('[data-testid="team-overview"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="approval-queue"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="team-analytics"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="manage-team-button"]')).not.toBeVisible();

    // Approval-related navigation should not exist
    await expect(this.page.locator('[data-testid="nav-approvals"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="nav-team-reports"]')).not.toBeVisible();

    // HR admin features should not be visible
    await expect(this.page.locator('[data-testid="hr-admin-panel"]')).not.toBeVisible();
    await expect(this.page.locator('[data-testid="employee-management"]')).not.toBeVisible();
  }

  async validateDashboardData(): Promise<void> {
    // Check that personal metrics show actual data
    const hoursWorked = await this.page.locator('[data-testid="hours-worked-value"]').textContent();
    expect(hoursWorked).toMatch(/\\d+(\\.\\d+)?/); // Should show numeric value

    const leaveBalance = await this.page.locator('[data-testid="leave-balance-value"]').textContent();
    expect(leaveBalance).toMatch(/\\d+(\\.\\d+)?/); // Should show numeric balance

    // Verify recent activities section has content or appropriate empty state
    const recentActivities = await this.page.locator('[data-testid="recent-activities-list"]').count();
    if (recentActivities === 0) {
      // Should show empty state message
      await expect(this.page.locator('[data-testid="no-recent-activities"]')).toBeVisible();
    } else {
      // Should show activity items with proper structure
      await expect(this.page.locator('[data-testid="activity-item"]').first()).toBeVisible();
    }

    // Check pending tasks
    const pendingTasksCount = await this.page.locator('[data-testid="pending-task-item"]').count();
    const pendingTasksBadge = await this.page.locator('[data-testid="pending-tasks-count"]').textContent();
    expect(pendingTasksBadge).toBe(pendingTasksCount.toString());
  }

  async testQuickActions(): Promise<void> {
    // Test Log Time quick action
    await this.page.click('[data-testid="log-time-button"]');
    await expect(this.page.locator('[data-testid="time-entry-modal"]')).toBeVisible();
    await this.page.click('[data-testid="modal-close"]');

    // Test Request Leave quick action
    await this.page.click('[data-testid="request-leave-button"]');
    await expect(this.page.locator('[data-testid="leave-request-modal"]')).toBeVisible();
    await this.page.click('[data-testid="modal-close"]');

    // Test View Goals quick action
    await this.page.click('[data-testid="view-goals-button"]');
    await this.page.waitForURL('/dashboard/users/*/goals');
    expect(this.page.url()).toContain('/goals');
    await this.page.goBack();
  }

  async validatePerformanceRequirements(): Promise<void> {
    // Dashboard should load within 2 seconds
    const startTime = Date.now();
    await this.page.reload();
    await this.page.waitForSelector('[data-testid="dashboard-loaded"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  }

  async validateNotificationSystem(): Promise<void> {
    // Check notification indicator
    const notificationCount = await this.page.locator('[data-testid="notification-count"]').textContent();
    if (notificationCount && parseInt(notificationCount) > 0) {
      // Click notification bell
      await this.page.click('[data-testid="notification-bell"]');
      await expect(this.page.locator('[data-testid="notification-dropdown"]')).toBeVisible();

      // Verify notification items have proper structure
      await expect(this.page.locator('[data-testid="notification-item"]').first()).toBeVisible();
      await expect(this.page.locator('[data-testid="notification-title"]').first()).toBeVisible();
      await expect(this.page.locator('[data-testid="notification-time"]').first()).toBeVisible();

      // Close dropdown
      await this.page.click('[data-testid="notification-bell"]');
    }
  }

  async createTestData(): Promise<void> {
    // Create some test time entries for recent activities
    await this.dbClient.query(`
      INSERT INTO hr_public.time_entries (employee_id, entry_date, total_hours, task_description, status, created_at)
      SELECT
        u.id,
        CURRENT_DATE - INTERVAL '1 day',
        8.0,
        'Test development work',
        'DRAFT',
        NOW() - INTERVAL '1 hour'
      FROM hr_public.users u
      WHERE u.email = $1
    `, ['employee.dashboard.test@hr.com']);

    // Create a test goal
    await this.dbClient.query(`
      INSERT INTO hr_public.goals (employee_id, title, description, goal_type, start_date, target_date, status, progress_percentage, created_at)
      SELECT
        u.id,
        'Complete dashboard integration tests',
        'Implement comprehensive test coverage for employee dashboard',
        'DEVELOPMENT',
        CURRENT_DATE - INTERVAL '7 days',
        CURRENT_DATE + INTERVAL '14 days',
        'ACTIVE',
        25,
        NOW() - INTERVAL '7 days'
      FROM hr_public.users u
      WHERE u.email = $1
    `, ['employee.dashboard.test@hr.com']);

    // Create a test notification
    await this.dbClient.query(`
      INSERT INTO hr_public.notifications (recipient_id, title, message, notification_type, status, created_at)
      SELECT
        u.id,
        'Welcome to SvelteHR',
        'Your dashboard is ready to use. Explore the features and let us know if you need help.',
        'SYSTEM',
        'DELIVERED',
        NOW() - INTERVAL '30 minutes'
      FROM hr_public.users u
      WHERE u.email = $1
    `, ['employee.dashboard.test@hr.com']);
  }

  async cleanupTestData(): Promise<void> {
    const userQuery = 'SELECT id FROM hr_public.users WHERE email = $1';
    const userResult = await this.dbClient.query(userQuery, ['employee.dashboard.test@hr.com']);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      await this.dbClient.query('DELETE FROM hr_public.time_entries WHERE employee_id = $1', [userId]);
      await this.dbClient.query('DELETE FROM hr_public.goals WHERE employee_id = $1', [userId]);
      await this.dbClient.query('DELETE FROM hr_public.notifications WHERE recipient_id = $1', [userId]);
    }

    await this.dbClient.query('DELETE FROM hr_public.users WHERE email = $1', ['employee.dashboard.test@hr.com']);
  }
}

test.describe('Employee Dashboard Access Integration', () => {
  let dbClient: Client;
  let testUser: TestUser;

  test.beforeAll(async () => {
    // Setup database connection
    dbClient = new Client({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/hr_system_test'
    });
    await dbClient.connect();

    // Create test user
    testUser = {
      id: '',
      email: 'employee.dashboard.test@hr.com',
      password: 'TestPassword123!',
      roleLevel: 20,
      displayName: 'Dashboard Test Employee'
    };

    const result = await dbClient.query(
      'INSERT INTO hr_public.users (email, display_name, role_level, password_hash, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET role_level = $3 RETURNING *',
      [testUser.email, testUser.displayName, testUser.roleLevel, 'hashed-password', true]
    );

    testUser.id = result.rows[0].id;
  });

  test.afterAll(async () => {
    const helper = new EmployeeDashboardTestHelper(null as any, dbClient);
    await helper.cleanupTestData();
    await dbClient.end();
  });

  test('Employee Dashboard Access - Complete User Journey', async ({ page, context }) => {
    const helper = new EmployeeDashboardTestHelper(page, dbClient);

    // Setup test data
    await helper.createTestData();

    // Step 1: Employee logs in with valid credentials
    await helper.loginAsEmployee(testUser);

    // Step 2: Verify dashboard URL and title
    expect(page.url()).toContain('/dashboard');
    await expect(page).toHaveTitle(/Employee Dashboard/);

    // Step 3: Validate all required dashboard elements are present
    await helper.validateDashboardElements();

    // Step 4: Verify personal metrics show actual data
    await helper.validateDashboardData();

    // Step 5: Test quick action functionality
    await helper.testQuickActions();

    // Step 6: Verify no manager-level features are visible
    await helper.validateNoManagerFeatures();

    // Step 7: Test notification system
    await helper.validateNotificationSystem();

    // Step 8: Validate performance requirements (< 2 seconds load time)
    await helper.validatePerformanceRequirements();
  });

  test('Employee Dashboard - Role-based Access Control', async ({ page }) => {
    const helper = new EmployeeDashboardTestHelper(page, dbClient);

    await helper.loginAsEmployee(testUser);

    // Test that employee cannot navigate to manager URLs
    await page.goto('/dashboard/management/approvals');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    await page.goto('/dashboard/admin/employees');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    await page.goto('/dashboard/system/users');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });

  test('Employee Dashboard - Responsive Design', async ({ page }) => {
    const helper = new EmployeeDashboardTestHelper(page, dbClient);

    await helper.loginAsEmployee(testUser);

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await helper.validateDashboardElements();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await helper.validateDashboardElements();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await helper.validateDashboardElements();
  });

  test('Employee Dashboard - Error Handling', async ({ page, context }) => {
    const helper = new EmployeeDashboardTestHelper(page, dbClient);

    // Test behavior when backend is unavailable
    await context.route('**/graphql', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await helper.loginAsEmployee(testUser);

    // Should show error states gracefully
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Test retry functionality
    await context.unroute('**/graphql');
    await page.click('[data-testid="retry-button"]');

    // Dashboard should recover
    await expect(page.locator('[data-testid="dashboard-loaded"]')).toBeVisible();
  });

  test('Employee Dashboard - Data Refresh and Real-time Updates', async ({ page }) => {
    const helper = new EmployeeDashboardTestHelper(page, dbClient);

    await helper.loginAsEmployee(testUser);

    // Initial state
    const initialHours = await page.locator('[data-testid="hours-worked-value"]').textContent();

    // Add new time entry via database
    await dbClient.query(`
      INSERT INTO hr_public.time_entries (employee_id, entry_date, total_hours, task_description, status)
      VALUES ($1, CURRENT_DATE, 4.0, 'Additional work', 'APPROVED')
    `, [testUser.id]);

    // Trigger refresh (dashboard should update automatically via subscriptions)
    await page.waitForTimeout(1000); // Wait for real-time update

    const updatedHours = await page.locator('[data-testid="hours-worked-value"]').textContent();
    expect(updatedHours).not.toBe(initialHours);
  });

  test('Employee Dashboard - Accessibility Compliance', async ({ page }) => {
    const helper = new EmployeeDashboardTestHelper(page, dbClient);

    await helper.loginAsEmployee(testUser);

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Should focus first interactive element
    await expect(page.locator(':focus')).toBeVisible();

    // Test ARIA labels and roles
    await expect(page.locator('[data-testid="dashboard-main"]')).toHaveAttribute('role', 'main');
    await expect(page.locator('[data-testid="personal-metrics"]')).toHaveAttribute('aria-label');

    // Test color contrast and visual indicators
    const logTimeButton = page.locator('[data-testid="log-time-button"]');
    await expect(logTimeButton).toHaveCSS('color', /rgb\\(\\d+, \\d+, \\d+\\)/);

    // Test focus management for modals
    await page.click('[data-testid="log-time-button"]');
    await expect(page.locator('[data-testid="time-entry-modal"] [data-testid="modal-title"]')).toBeFocused();
  });
});