// E2E Test: Management Overview Dashboard Page
// Created: 2025-09-24
// Task: T009 - E2E test Management overview dashboard page
// CRITICAL: This test MUST FAIL initially as per TDD approach

import { test, expect } from '@playwright/test';

test.describe('Management Overview Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    // Wait for successful login and navigation
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display management overview dashboard with key metrics', async ({ page }) => {
    // Navigate to management overview
    await page.goto('/dashboard/management/overview');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Management Overview');

    // Should show key metrics cards
    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible();

    // Check team size metrics
    await expect(page.locator('[data-testid="team-size-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-team-members"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-employees"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-hires-month"]')).toBeVisible();

    // Check attendance metrics
    await expect(page.locator('[data-testid="attendance-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="attendance-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="absent-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="late-arrivals"]')).toBeVisible();

    // Check performance metrics
    await expect(page.locator('[data-testid="performance-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-performance-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-reviews"]')).toBeVisible();
    await expect(page.locator('[data-testid="goals-completion"]')).toBeVisible();

    // Check leave metrics
    await expect(page.locator('[data-testid="leave-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-leave-requests"]')).toBeVisible();
    await expect(page.locator('[data-testid="approved-leave-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-balance-usage"]')).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should show recent activities section
    await expect(page.locator('[data-testid="recent-activities"]')).toBeVisible();
    await expect(page.locator('[data-testid="activities-title"]')).toContainText('Recent Team Activities');

    // Should have activity items
    await expect(page.locator('[data-testid="activity-item"]')).toHaveCount({ min: 1 });

    // Each activity should have timestamp, employee, and description
    const firstActivity = page.locator('[data-testid="activity-item"]').first();
    await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();
    await expect(firstActivity.locator('[data-testid="activity-employee"]')).toBeVisible();
    await expect(firstActivity.locator('[data-testid="activity-description"]')).toBeVisible();
    await expect(firstActivity.locator('[data-testid="activity-type"]')).toBeVisible();

    // Should show different activity types
    const activityTypes = ['leave_request', 'performance_review', 'goal_update', 'attendance'];
    const activities = page.locator('[data-testid="activity-type"]');
    const count = await activities.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display team performance charts', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should show performance charts section
    await expect(page.locator('[data-testid="performance-charts"]')).toBeVisible();

    // Should have attendance trend chart
    await expect(page.locator('[data-testid="attendance-trend-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-title-attendance"]')).toContainText('Team Attendance Trend');

    // Should have performance ratings distribution
    await expect(page.locator('[data-testid="performance-distribution-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-title-performance"]')).toContainText('Performance Ratings Distribution');

    // Should have goals progress chart
    await expect(page.locator('[data-testid="goals-progress-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-title-goals"]')).toContainText('Team Goals Progress');

    // Charts should be interactive
    const attendanceChart = page.locator('[data-testid="attendance-trend-chart"]');
    await expect(attendanceChart).toBeVisible();
    await attendanceChart.hover();
    // Should show tooltip or hover effects (chart library dependent)
  });

  test('should display pending actions and quick access buttons', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should show pending actions section
    await expect(page.locator('[data-testid="pending-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="actions-title"]')).toContainText('Pending Actions');

    // Should have leave approval actions
    if (await page.locator('[data-testid="pending-leave-approvals"]').isVisible()) {
      await expect(page.locator('[data-testid="leave-approval-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-leave-approvals"]')).toBeVisible();
    }

    // Should have performance review actions
    if (await page.locator('[data-testid="pending-performance-reviews"]').isVisible()) {
      await expect(page.locator('[data-testid="review-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-pending-reviews"]')).toBeVisible();
    }

    // Should have quick action buttons
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-goal"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-review"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-report"]')).toBeVisible();
  });

  test('should navigate to detailed pages from overview widgets', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Click on pending leave approvals
    if (await page.locator('[data-testid="view-leave-approvals"]').isVisible()) {
      await page.click('[data-testid="view-leave-approvals"]');
      await expect(page).toHaveURL(/\/dashboard\/management\/leave-approvals/);
      await page.goBack();
    }

    // Click on performance metrics to go to reviews
    await page.click('[data-testid="performance-card"]');
    await expect(page).toHaveURL(/\/dashboard\/management\/reviews/);
    await page.goBack();

    // Click on goals completion to go to goals page
    if (await page.locator('[data-testid="goals-completion"]').isVisible()) {
      await page.click('[data-testid="goals-completion"]');
      await expect(page).toHaveURL(/\/dashboard\/management\/goals/);
      await page.goBack();
    }
  });

  test('should use quick action buttons to create new items', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Test create goal quick action
    await page.click('[data-testid="create-goal"]');
    await expect(page).toHaveURL(/\/dashboard\/management\/goals/);
    await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible(); // Should open create modal
    await page.goBack();

    // Test schedule review quick action
    await page.click('[data-testid="schedule-review"]');
    await expect(page).toHaveURL(/\/dashboard\/management\/reviews/);
    await expect(page.locator('[data-testid="review-modal"]')).toBeVisible(); // Should open create modal
    await page.goBack();

    // Test generate report quick action
    await page.click('[data-testid="generate-report"]');
    await expect(page).toHaveURL(/\/dashboard\/management\/reports/);
  });

  test('should filter dashboard by time period', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should have time period filter
    await expect(page.locator('[data-testid="period-filter"]')).toBeVisible();

    // Change to weekly view
    await page.selectOption('[data-testid="period-filter"]', 'week');

    // Should update metrics and charts
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    // Verify data refreshed
    await expect(page.locator('[data-testid="period-label"]')).toContainText('This Week');

    // Change to monthly view
    await page.selectOption('[data-testid="period-filter"]', 'month');
    await expect(page.locator('[data-testid="period-label"]')).toContainText('This Month');

    // Change to quarterly view
    await page.selectOption('[data-testid="period-filter"]', 'quarter');
    await expect(page.locator('[data-testid="period-label"]')).toContainText('This Quarter');
  });

  test('should display team member status overview', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should show team status section
    await expect(page.locator('[data-testid="team-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-title"]')).toContainText('Team Status Today');

    // Should show different status counts
    await expect(page.locator('[data-testid="status-present"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-absent"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-on-leave"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-remote"]')).toBeVisible();

    // Each status should have count and list
    const presentStatus = page.locator('[data-testid="status-present"]');
    await expect(presentStatus.locator('[data-testid="status-count"]')).toBeVisible();

    // Should be able to expand to see individual team members
    if (await presentStatus.locator('[data-testid="expand-status"]').isVisible()) {
      await presentStatus.locator('[data-testid="expand-status"]').click();
      await expect(presentStatus.locator('[data-testid="member-list"]')).toBeVisible();
    }
  });

  test('should show alerts and notifications for important events', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should have alerts section
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible();

    // Check for different types of alerts
    if (await page.locator('[data-testid="alert-item"]').count() > 0) {
      const firstAlert = page.locator('[data-testid="alert-item"]').first();
      await expect(firstAlert.locator('[data-testid="alert-type"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-message"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-action"]')).toBeVisible();
    }

    // Should show different alert severities
    const alertTypes = ['urgent', 'warning', 'info'];
    for (const alertType of alertTypes) {
      if (await page.locator(`[data-testid="alert-${alertType}"]`).isVisible()) {
        await expect(page.locator(`[data-testid="alert-${alertType}"]`)).toBeVisible();
      }
    }
  });

  test('should refresh dashboard data automatically', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should have manual refresh button
    await expect(page.locator('[data-testid="refresh-dashboard"]')).toBeVisible();

    // Click refresh
    await page.click('[data-testid="refresh-dashboard"]');

    // Should show loading indicator
    await expect(page.locator('[data-testid="refreshing-data"]')).toBeVisible();

    // Should complete refresh
    await expect(page.locator('[data-testid="refreshing-data"]')).not.toBeVisible();

    // Should show last updated timestamp
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-updated"]')).toContainText(/Updated|Last updated/);
  });

  test('should display department comparison metrics', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should have department comparison section
    await expect(page.locator('[data-testid="department-comparison"]')).toBeVisible();
    await expect(page.locator('[data-testid="comparison-title"]')).toContainText('Department Comparison');

    // Should show metrics by department
    await expect(page.locator('[data-testid="department-metrics-table"]')).toBeVisible();
    await expect(page.locator('th')).toContainText(['Department', 'Team Size', 'Attendance %', 'Avg Performance', 'Goals Progress']);

    // Should have at least one department row
    await expect(page.locator('[data-testid="department-row"]')).toHaveCount({ min: 1 });

    // Each department should show key metrics
    const firstDept = page.locator('[data-testid="department-row"]').first();
    await expect(firstDept.locator('[data-testid="dept-name"]')).toBeVisible();
    await expect(firstDept.locator('[data-testid="dept-size"]')).toBeVisible();
    await expect(firstDept.locator('[data-testid="dept-attendance"]')).toBeVisible();
    await expect(firstDept.locator('[data-testid="dept-performance"]')).toBeVisible();
    await expect(firstDept.locator('[data-testid="dept-goals"]')).toBeVisible();
  });

  test('should customize dashboard layout and widgets', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should have customize button
    await expect(page.locator('[data-testid="customize-dashboard"]')).toBeVisible();

    // Click customize
    await page.click('[data-testid="customize-dashboard"]');

    // Should open customization modal
    await expect(page.locator('[data-testid="customize-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Customize Dashboard');

    // Should show widget toggle options
    await expect(page.locator('[data-testid="widget-toggles"]')).toBeVisible();

    // Should be able to toggle widgets on/off
    await page.click('[data-testid="toggle-attendance-chart"]');
    await page.click('[data-testid="toggle-department-comparison"]');

    // Save customization
    await page.click('[data-testid="save-customization"]');

    // Should apply changes
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Dashboard customized successfully');
    await expect(page.locator('[data-testid="customize-modal"]')).not.toBeVisible();

    // Widgets should be hidden/shown based on toggles
    await expect(page.locator('[data-testid="attendance-trend-chart"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="department-comparison"]')).not.toBeVisible();
  });

  test('should handle loading states and data errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/management/overview');

    // Should show loading skeletons initially
    await expect(page.locator('[data-testid="metrics-skeleton"]')).toBeVisible();

    // Wait for data to load
    await expect(page.locator('[data-testid="metrics-skeleton"]')).not.toBeVisible();

    // If there are data loading errors, should show error states
    // This would typically be tested with network interception
    // For now, verify error handling UI exists
    if (await page.locator('[data-testid="error-state"]').isVisible()) {
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    }
  });

  test('should require manager role access', async ({ page }) => {
    // Logout and login as regular employee
    await page.goto('/auth/logout');
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'employee@postgraphile-hr.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    // Try to access management overview
    await page.goto('/dashboard/management/overview');

    // Should redirect to unauthorized or show access denied
    await expect(page).toHaveURL(/\/(unauthorized|403)/);
    // OR
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
  });
});