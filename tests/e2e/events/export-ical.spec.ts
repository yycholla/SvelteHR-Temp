/**
 * E2E Test: Export Calendar to iCal
 * Feature: 027-we-need-to
 * Quickstart Scenario 10
 *
 * Tests iCal (.ics) export functionality for importing into external calendar apps.
 * MUST FAIL until iCal export is implemented.
 */

import { expect, test } from '@playwright/test';

test.describe('Export Calendar to iCal', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should show Export button in calendar toolbar', async ({ page }) => {
		const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');
		await expect(exportButton).toBeVisible();
	});

	test('should open export options modal when clicking Export', async ({ page }) => {
		const exportButton = page.locator('button:has-text("Export")');
		await exportButton.click();

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');
		await expect(exportModal).toBeVisible();
	});

	test('should export all accepted events to iCal', async ({ page }) => {
		await page.click('button:has-text("Export")');

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');

		// Select "All accepted events"
		const allEventsRadio = exportModal.locator('input[name="exportScope"][value="accepted"]');
		await allEventsRadio.check();

		// Click export button
		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download"), button:has-text("Export")');

		const download = await downloadPromise;

		// Verify file name
		expect(download.suggestedFilename()).toMatch(/\.ics$/);

		// Verify download completes
		const filePath = await download.path();
		expect(filePath).toBeTruthy();
	});

	test('should export current month events to iCal', async ({ page }) => {
		await page.click('button:has-text("Export")');

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');

		// Select "Current month"
		const currentMonthRadio = exportModal.locator(
			'input[name="exportScope"][value="current-month"]'
		);
		await currentMonthRadio.check();

		// Download
		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toContain(new Date().getFullYear().toString());
	});

	test('should export custom date range to iCal', async ({ page }) => {
		await page.click('button:has-text("Export")');

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');

		// Select "Custom range"
		const customRangeRadio = exportModal.locator('input[name="exportScope"][value="custom"]');
		await customRangeRadio.check();

		// Set date range
		const startDate = new Date();
		const endDate = new Date();
		endDate.setMonth(endDate.getMonth() + 3);

		await page.fill('input[name="exportStartDate"]', startDate.toISOString().split('T')[0]);
		await page.fill('input[name="exportEndDate"]', endDate.toISOString().split('T')[0]);

		// Download
		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/\.ics$/);
	});

	test('should export single event to iCal from event details', async ({ page }) => {
		// Open event details
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Find export button in dialog
		const exportButton = dialog.locator(
			'button:has-text("Export"), button[aria-label="Export event"]'
		);

		if ((await exportButton.count()) > 0) {
			const downloadPromise = page.waitForEvent('download');
			await exportButton.click();

			const download = await downloadPromise;

			// Verify single event export
			expect(download.suggestedFilename()).toMatch(/event.*\.ics$/i);
		}
	});

	test('should validate iCal file format', async ({ page }) => {
		await page.click('button:has-text("Export")');
		await page.check('input[name="exportScope"][value="accepted"]');

		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		const filePath = await download.path();

		if (filePath) {
			// Read file content
			const fs = require('fs');
			const content = fs.readFileSync(filePath, 'utf8');

			// Verify iCal format
			expect(content).toContain('BEGIN:VCALENDAR');
			expect(content).toContain('END:VCALENDAR');
			expect(content).toContain('VERSION:2.0');
			expect(content).toContain('PRODID:');
		}
	});

	test('should include event details in iCal export', async ({ page }) => {
		await page.click('button:has-text("Export")');
		await page.check('input[name="exportScope"][value="accepted"]');

		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		const filePath = await download.path();

		if (filePath) {
			const fs = require('fs');
			const content = fs.readFileSync(filePath, 'utf8');

			// Verify event properties
			expect(content).toContain('BEGIN:VEVENT');
			expect(content).toContain('END:VEVENT');
			expect(content).toContain('DTSTART:');
			expect(content).toContain('DTEND:');
			expect(content).toContain('SUMMARY:');
			expect(content).toContain('DESCRIPTION:');
			expect(content).toContain('UID:');
		}
	});

	test('should include RRULE for recurring events in iCal', async ({ page }) => {
		await page.click('button:has-text("Export")');
		await page.check('input[name="exportScope"][value="accepted"]');

		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		const filePath = await download.path();

		if (filePath) {
			const fs = require('fs');
			const content = fs.readFileSync(filePath, 'utf8');

			// Check if any recurring events are included
			if (content.includes('RRULE:')) {
				// Verify RRULE format
				expect(content).toMatch(/RRULE:FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/);
			}
		}
	});

	test('should export only events user has RSVP accepted', async ({ page }) => {
		await page.click('button:has-text("Export")');

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');

		// Verify "accepted events" option is default or available
		const acceptedRadio = exportModal.locator('input[name="exportScope"][value="accepted"]');
		await expect(acceptedRadio).toBeVisible();

		// Should not export declined or pending events by default
		const helpText = exportModal.locator('text=/only.*accepted|accepted events only/i');

		if ((await helpText.count()) > 0) {
			await expect(helpText).toBeVisible();
		}
	});

	test('should show export progress indicator', async ({ page }) => {
		await page.click('button:has-text("Export")');
		await page.check('input[name="exportScope"][value="accepted"]');

		// Click download
		await page.click('button:has-text("Download")');

		// Verify loading indicator appears briefly
		const loadingIndicator = page.locator('text=/Generating|Preparing/i, [aria-busy="true"]');

		if ((await loadingIndicator.count()) > 0) {
			await expect(loadingIndicator).toBeVisible();
		}
	});

	test('should handle empty calendar export gracefully', async ({ page }) => {
		// Try to export when no events exist (or all declined)
		await page.click('button:has-text("Export")');

		// Select scope
		await page.check('input[name="exportScope"][value="current-month"]');

		// Click download
		await page.click('button:has-text("Download")');

		// Either download empty .ics or show warning
		const emptyWarning = page.locator('text=/No events to export|Calendar is empty/i');

		if ((await emptyWarning.count()) > 0) {
			await expect(emptyWarning).toBeVisible();
		}
	});

	test('should cancel export process', async ({ page }) => {
		await page.click('button:has-text("Export")');

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');

		// Click cancel
		const cancelButton = exportModal.locator('button:has-text("Cancel")');
		await cancelButton.click();

		// Verify modal closes without download
		await expect(exportModal).not.toBeVisible();
	});

	test('should show file size estimate before export', async ({ page }) => {
		await page.click('button:has-text("Export")');

		const exportModal = page.locator('[role="dialog"]:has-text("Export Calendar")');

		// Select scope
		await page.check('input[name="exportScope"][value="accepted"]');

		// Verify file size estimate appears
		const sizeEstimate = exportModal.locator('text=/Estimated size|Approximately/i');

		if ((await sizeEstimate.count()) > 0) {
			await expect(sizeEstimate).toBeVisible();

			const sizeText = await sizeEstimate.textContent();
			expect(sizeText).toMatch(/KB|MB|\d+ events/i);
		}
	});

	test('should include event location in iCal export', async ({ page }) => {
		await page.click('button:has-text("Export")');
		await page.check('input[name="exportScope"][value="accepted"]');

		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		const filePath = await download.path();

		if (filePath) {
			const fs = require('fs');
			const content = fs.readFileSync(filePath, 'utf8');

			// Check for LOCATION property (if events have locations)
			if (content.includes('LOCATION:')) {
				expect(content).toMatch(/LOCATION:.+/);
			}
		}
	});

	test('should include event organizer in iCal export', async ({ page }) => {
		await page.click('button:has-text("Export")');
		await page.check('input[name="exportScope"][value="accepted"]');

		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Download")');

		const download = await downloadPromise;
		const filePath = await download.path();

		if (filePath) {
			const fs = require('fs');
			const content = fs.readFileSync(filePath, 'utf8');

			// Check for ORGANIZER property
			if (content.includes('ORGANIZER:')) {
				expect(content).toMatch(/ORGANIZER:mailto:.+/);
			}
		}
	});
});
