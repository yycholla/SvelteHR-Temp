// E2E Test: Management Team Analytics and Reporting Page
// Created: 2025-09-24
// Task: T008 - E2E test Team analytics and reporting management page
// CRITICAL: This test MUST FAIL initially as per TDD approach

import { test, expect } from '@playwright/test';

test.describe('Management Team Analytics and Reporting Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    // Wait for successful login and navigation
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display team reports dashboard with available report types', async ({ page }) => {
    // Navigate to team reports page
    await page.goto('/dashboard/management/reports');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Team Analytics & Reports');

    // Should show report type selection cards
    await expect(page.locator('[data-testid="reports-grid"]')).toBeVisible();

    // Check available report types
    await expect(page.locator('[data-testid="attendance-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="goals-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="employee-reports"]')).toBeVisible();

    // Each report card should have title, description, and action button
    const attendanceCard = page.locator('[data-testid="attendance-reports"]');
    await expect(attendanceCard.locator('[data-testid="report-title"]')).toContainText('Attendance Reports');
    await expect(attendanceCard.locator('[data-testid="report-description"]')).toBeVisible();
    await expect(attendanceCard.locator('[data-testid="generate-report"]')).toBeVisible();
  });

  test('should generate attendance report with date range filter', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Click on attendance reports
    await page.click('[data-testid="attendance-reports"] [data-testid="generate-report"]');

    // Should open report generation modal
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Generate Attendance Report');

    // Should have date range inputs
    await expect(page.locator('[data-testid="date-from"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-to"]')).toBeVisible();

    // Fill date range
    await page.fill('[data-testid="date-from"]', '2025-01-01');
    await page.fill('[data-testid="date-to"]', '2025-01-31');

    // Select team members (optional filter)
    await page.click('[data-testid="team-members-toggle"]');
    await page.check('[data-testid="employee-john-doe"]');
    await page.check('[data-testid="employee-jane-smith"]');

    // Generate report
    await page.click('[data-testid="generate-report-submit"]');

    // Should show loading indicator
    await expect(page.locator('[data-testid="generating-report"]')).toBeVisible();

    // Should display report results
    await expect(page.locator('[data-testid="report-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-table"]')).toBeVisible();

    // Check report data columns
    await expect(page.locator('th')).toContainText(['Employee', 'Days Present', 'Days Absent', 'Late Arrivals', 'Early Departures', 'Attendance %']);

    // Should have export options
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible();
  });

  test('should generate performance report with rating breakdown', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Click on performance reports
    await page.click('[data-testid="performance-reports"] [data-testid="generate-report"]');

    // Should open performance report modal
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Generate Performance Report');

    // Select report period
    await page.selectOption('[data-testid="report-period"]', 'quarterly');
    await page.selectOption('[data-testid="quarter-select"]', 'Q1-2025');

    // Select performance metrics
    await page.check('[data-testid="include-ratings"]');
    await page.check('[data-testid="include-goals-progress"]');
    await page.check('[data-testid="include-reviews-status"]');

    // Generate report
    await page.click('[data-testid="generate-report-submit"]');

    // Should display performance metrics
    await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

    // Should show performance summary charts
    await expect(page.locator('[data-testid="rating-distribution-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="goals-completion-chart"]')).toBeVisible();

    // Should show detailed performance table
    await expect(page.locator('[data-testid="performance-table"]')).toBeVisible();
    await expect(page.locator('th')).toContainText(['Employee', 'Overall Rating', 'Goals Progress', 'Review Status', 'Last Review Date']);
  });

  test('should generate goals & OKRs progress report', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Click on goals reports
    await page.click('[data-testid="goals-reports"] [data-testid="generate-report"]');

    // Should open goals report modal
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Generate Goals & OKRs Report');

    // Select goal types
    await page.check('[data-testid="include-team-goals"]');
    await page.check('[data-testid="include-individual-goals"]');

    // Select time period
    await page.fill('[data-testid="date-from"]', '2025-01-01');
    await page.fill('[data-testid="date-to"]', '2025-06-30');

    // Generate report
    await page.click('[data-testid="generate-report-submit"]');

    // Should display goals overview
    await expect(page.locator('[data-testid="goals-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-goals"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-goals"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-progress"]')).toBeVisible();

    // Should show goals progress table
    await expect(page.locator('[data-testid="goals-table"]')).toBeVisible();
    await expect(page.locator('th')).toContainText(['Goal', 'Owner', 'Type', 'Progress', 'Key Results', 'Status']);

    // Should display progress charts
    await expect(page.locator('[data-testid="progress-by-department-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="goal-status-chart"]')).toBeVisible();
  });

  test('should generate leave analysis report', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Click on leave reports
    await page.click('[data-testid="leave-reports"] [data-testid="generate-report"]');

    // Should open leave report modal
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Generate Leave Analysis Report');

    // Select leave types
    await page.check('[data-testid="include-annual-leave"]');
    await page.check('[data-testid="include-sick-leave"]');
    await page.check('[data-testid="include-personal-leave"]');

    // Set analysis period
    await page.fill('[data-testid="date-from"]', '2025-01-01');
    await page.fill('[data-testid="date-to"]', '2025-12-31');

    // Generate report
    await page.click('[data-testid="generate-report-submit"]');

    // Should display leave statistics
    await expect(page.locator('[data-testid="leave-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-days-taken"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-requests"]')).toBeVisible();
    await expect(page.locator('[data-testid="approval-rate"]')).toBeVisible();

    // Should show leave usage table
    await expect(page.locator('[data-testid="leave-usage-table"]')).toBeVisible();
    await expect(page.locator('th')).toContainText(['Employee', 'Annual Taken', 'Sick Taken', 'Personal Taken', 'Remaining Balance']);

    // Should display seasonal trends chart
    await expect(page.locator('[data-testid="leave-trends-chart"]')).toBeVisible();
  });

  test('should generate employee analytics report', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Click on employee reports
    await page.click('[data-testid="employee-reports"] [data-testid="generate-report"]');

    // Should open employee analytics modal
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Generate Employee Analytics Report');

    // Select analytics categories
    await page.check('[data-testid="include-demographics"]');
    await page.check('[data-testid="include-tenure-analysis"]');
    await page.check('[data-testid="include-department-distribution"]');

    // Generate report
    await page.click('[data-testid="generate-report-submit"]');

    // Should display employee overview
    await expect(page.locator('[data-testid="employee-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-employees"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-hires"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-tenure"]')).toBeVisible();

    // Should show department breakdown
    await expect(page.locator('[data-testid="department-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="tenure-distribution-chart"]')).toBeVisible();

    // Should display employee demographics table
    await expect(page.locator('[data-testid="demographics-table"]')).toBeVisible();
  });

  test('should validate report generation form fields', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Click on attendance reports
    await page.click('[data-testid="attendance-reports"] [data-testid="generate-report"]');

    // Try to generate without required fields
    await page.click('[data-testid="generate-report-submit"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="date-from-error"]')).toContainText('Start date is required');
    await expect(page.locator('[data-testid="date-to-error"]')).toContainText('End date is required');

    // Fill invalid date range (end before start)
    await page.fill('[data-testid="date-from"]', '2025-12-31');
    await page.fill('[data-testid="date-to"]', '2025-01-01');
    await page.click('[data-testid="generate-report-submit"]');

    // Should show date range validation error
    await expect(page.locator('[data-testid="date-range-error"]')).toContainText('End date must be after start date');

    // Should not generate report
    await expect(page.locator('[data-testid="report-results"]')).not.toBeVisible();
  });

  test('should export reports in different formats', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Generate a simple attendance report
    await page.click('[data-testid="attendance-reports"] [data-testid="generate-report"]');
    await page.fill('[data-testid="date-from"]', '2025-01-01');
    await page.fill('[data-testid="date-to"]', '2025-01-31');
    await page.click('[data-testid="generate-report-submit"]');

    // Wait for report to generate
    await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

    // Test CSV export
    const csvDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv"]');
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toMatch(/attendance-report.*\.csv$/);

    // Test PDF export
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf"]');
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/attendance-report.*\.pdf$/);

    // Test Excel export
    const excelDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-excel"]');
    const excelDownload = await excelDownloadPromise;
    expect(excelDownload.suggestedFilename()).toMatch(/attendance-report.*\.xlsx$/);
  });

  test('should save and load custom report configurations', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Generate a custom report
    await page.click('[data-testid="attendance-reports"] [data-testid="generate-report"]');
    await page.fill('[data-testid="date-from"]', '2025-01-01');
    await page.fill('[data-testid="date-to"]', '2025-03-31');
    await page.click('[data-testid="team-members-toggle"]');
    await page.check('[data-testid="employee-john-doe"]');

    // Save report configuration
    await page.click('[data-testid="save-config"]');
    await page.fill('[data-testid="config-name"]', 'Q1 Team Attendance');
    await page.click('[data-testid="save-config-submit"]');

    // Should show success notification
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Report configuration saved');

    // Go back to reports page
    await page.click('[data-testid="back-to-reports"]');

    // Should see saved configurations section
    await expect(page.locator('[data-testid="saved-configs"]')).toBeVisible();
    await expect(page.locator('[data-testid="saved-config-item"]')).toContainText('Q1 Team Attendance');

    // Load saved configuration
    await page.click('[data-testid="load-config-Q1-Team-Attendance"]');

    // Should pre-fill form with saved values
    await expect(page.locator('[data-testid="date-from"]')).toHaveValue('2025-01-01');
    await expect(page.locator('[data-testid="date-to"]')).toHaveValue('2025-03-31');
    await expect(page.locator('[data-testid="employee-john-doe"]')).toBeChecked();
  });

  test('should handle report generation errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Try to generate a report that might fail (simulate error)
    await page.click('[data-testid="performance-reports"] [data-testid="generate-report"]');
    await page.selectOption('[data-testid="report-period"]', 'custom');
    await page.fill('[data-testid="date-from"]', '1900-01-01'); // Invalid historical date
    await page.fill('[data-testid="date-to"]', '1900-01-02');
    await page.click('[data-testid="generate-report-submit"]');

    // Should show error message instead of crashing
    await expect(page.locator('[data-testid="report-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to generate report');

    // Should suggest trying again or contacting support
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-link"]')).toBeVisible();
  });

  test('should handle empty data states in reports', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Generate report for period with no data
    await page.click('[data-testid="attendance-reports"] [data-testid="generate-report"]');
    await page.fill('[data-testid="date-from"]', '2020-01-01');
    await page.fill('[data-testid="date-to"]', '2020-01-02');
    await page.click('[data-testid="generate-report-submit"]');

    // Should show empty state message
    await expect(page.locator('[data-testid="empty-report-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-message"]')).toContainText('No data found for the selected period');

    // Should suggest adjusting filters
    await expect(page.locator('[data-testid="adjust-filters-suggestion"]')).toBeVisible();

    // Export buttons should be disabled
    await expect(page.locator('[data-testid="export-csv"]')).toBeDisabled();
    await expect(page.locator('[data-testid="export-pdf"]')).toBeDisabled();
  });

  test('should display report generation history', async ({ page }) => {
    await page.goto('/dashboard/management/reports');

    // Should have report history section
    await expect(page.locator('[data-testid="report-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-title"]')).toContainText('Recent Reports');

    // Should show recent report entries
    if (await page.locator('[data-testid="history-item"]').count() > 0) {
      const firstHistoryItem = page.locator('[data-testid="history-item"]').first();
      await expect(firstHistoryItem.locator('[data-testid="report-name"]')).toBeVisible();
      await expect(firstHistoryItem.locator('[data-testid="generated-date"]')).toBeVisible();
      await expect(firstHistoryItem.locator('[data-testid="regenerate-report"]')).toBeVisible();
      await expect(firstHistoryItem.locator('[data-testid="download-report"]')).toBeVisible();
    }

    // Should be able to regenerate previous report
    if (await page.locator('[data-testid="regenerate-report"]').first().isVisible()) {
      await page.click('[data-testid="regenerate-report"]');
      await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    }
  });

  test('should require manager role access', async ({ page }) => {
    // Logout and login as regular employee
    await page.goto('/auth/logout');
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'employee@postgraphile-hr.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    // Try to access team reports page
    await page.goto('/dashboard/management/reports');

    // Should redirect to unauthorized or show access denied
    await expect(page).toHaveURL(/\/(unauthorized|403)/);
    // OR
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
  });
});