/**
 * E2E Test: Create New Event
 * Feature: 027-we-need-to
 * Quickstart Scenario 2
 *
 * Tests event creation with recurring patterns, capacity limits, waitlist, and image upload.
 * MUST FAIL until EventCreateDialog component is implemented.
 */

import { expect, test } from '@playwright/test';
import path from 'path';

test.describe('Create New Event', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should open EventCreateDialog when clicking on a date', async ({ page }) => {
		// Click on a date cell
		const dateCell = page.locator('.fc-daygrid-day').nth(10); // Mid-month date
		await dateCell.click();

		// Verify dialog opens
		const dialog = page.locator('[role="dialog"]').first();
		await expect(dialog).toBeVisible();

		// Verify dialog title
		const dialogTitle = dialog.locator('h2:has-text("Create Event")');
		await expect(dialogTitle).toBeVisible();
	});

	test('should pre-fill selected date in form', async ({ page }) => {
		// Click on specific date
		const targetDate = page.locator('.fc-daygrid-day[data-date]').nth(15);
		const selectedDate = await targetDate.getAttribute('data-date');

		await targetDate.click();

		// Verify start date field has selected date
		const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
		const startDateValue = await startDateInput.inputValue();

		expect(startDateValue).toContain(selectedDate?.split('T')[0]);
	});

	test('should create simple non-recurring event', async ({ page }) => {
		// Open create dialog
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Fill basic fields
		await page.fill('input[name="title"]', 'Team Meeting');
		await page.fill('textarea[name="description"]', 'Quarterly planning session');

		// Select event type
		await page.selectOption('select[name="type"]', 'meeting');

		// Select visibility
		await page.selectOption('select[name="visibility"]', 'public');

		// Submit form
		const createButton = page.locator('button:has-text("Create Event")');
		await createButton.click();

		// Verify success toast
		await expect(page.locator('.toast:has-text("Event created")')).toBeVisible({
			timeout: 3000
		});

		// Verify event appears on calendar
		await expect(page.locator('.fc-event:has-text("Team Meeting")')).toBeVisible({
			timeout: 2000
		});
	});

	test('should create recurring weekly event', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Fill basic info
		await page.fill('input[name="title"]', 'Weekly Standup');
		await page.fill('textarea[name="description"]', 'Team sync meeting');

		// Toggle recurring
		const recurringToggle = page.locator('input[type="checkbox"][name="isRecurring"]');
		await recurringToggle.check();

		// Select weekly frequency
		await page.selectOption('select[name="frequency"]', 'weekly');

		// Select days of week (Monday, Wednesday, Friday)
		await page.check('input[type="checkbox"][value="1"]'); // Monday
		await page.check('input[type="checkbox"][value="3"]'); // Wednesday
		await page.check('input[type="checkbox"][value="5"]'); // Friday

		// Set end date (3 months from now)
		const endDate = new Date();
		endDate.setMonth(endDate.getMonth() + 3);
		const endDateStr = endDate.toISOString().split('T')[0];

		await page.fill('input[name="recurrenceEndDate"]', endDateStr);

		// Submit
		await page.click('button:has-text("Create Event")');

		// Verify success
		await expect(page.locator('.toast:has-text("Event created")')).toBeVisible({
			timeout: 3000
		});

		// Verify recurring event appears with repeat icon
		const recurringEvent = page.locator('.fc-event:has-text("Weekly Standup")').first();
		await expect(recurringEvent.locator('.recurring-icon, svg[data-icon="repeat"]')).toBeVisible();
	});

	test('should create event with capacity limit and waitlist', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Fill basic info
		await page.fill('input[name="title"]', 'Workshop');
		await page.fill('textarea[name="description"]', 'Design thinking workshop');

		// Toggle capacity limit
		const capacityToggle = page.locator('input[type="checkbox"][name="hasCapacity"]');
		await capacityToggle.check();

		// Enter capacity
		await page.fill('input[name="capacity"]', '20');

		// Toggle waitlist
		const waitlistToggle = page.locator('input[type="checkbox"][name="waitlistEnabled"]');
		await waitlistToggle.check();

		// Submit
		await page.click('button:has-text("Create Event")');

		// Verify event created
		await expect(page.locator('.toast:has-text("Event created")')).toBeVisible({
			timeout: 3000
		});

		// Click on created event to verify capacity details
		await page.click('.fc-event:has-text("Workshop")');
		await page.waitForSelector('[role="dialog"]');

		// Verify capacity indicator in details dialog
		const capacityText = page.locator('text=/0.*20|Capacity/');
		await expect(capacityText).toBeVisible();
	});

	test('should upload and crop image with 16:9 aspect ratio', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Fill basic fields
		await page.fill('input[name="title"]', 'Event with Image');

		// Click upload button
		const uploadButton = page.locator('button:has-text("Upload Image")');
		await uploadButton.click();

		// Upload file (mock image file)
		const fileInput = page.locator('input[type="file"]');

		// Create a test image file path (assumes test fixtures exist)
		const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');

		// For this test to work in real environment, we'll simulate the upload
		await fileInput.setInputFiles(testImagePath);

		// Wait for crop interface to appear
		await expect(page.locator('.cropper-container, [data-cropper]')).toBeVisible({
			timeout: 2000
		});

		// Select 16:9 aspect ratio
		const aspectRatioButton = page.locator('button[data-aspect-ratio="16:9"]');
		await aspectRatioButton.click();

		// Confirm crop
		const confirmCropButton = page.locator('button:has-text("Confirm Crop")');
		await confirmCropButton.click();

		// Verify image preview appears
		await expect(page.locator('img[alt*="Event image preview"]')).toBeVisible();

		// Submit event
		await page.click('button:has-text("Create Event")');

		// Verify success
		await expect(page.locator('.toast:has-text("Event created")')).toBeVisible({
			timeout: 3000
		});
	});

	test('should validate form fields before submission', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Try to submit empty form
		const createButton = page.locator('button:has-text("Create Event")');
		await createButton.click();

		// Verify validation errors appear
		await expect(page.locator('text=/Title is required|Required/')).toBeVisible();
	});

	test('should enforce 200 character title limit', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Enter 201 characters
		const longTitle = 'A'.repeat(201);
		await page.fill('input[name="title"]', longTitle);

		// Try to submit
		await page.click('button:has-text("Create Event")');

		// Verify validation error
		await expect(page.locator('text=/Title must be.*200 characters/')).toBeVisible();
	});

	test('should enforce 5000 character description limit', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Enter valid title first
		await page.fill('input[name="title"]', 'Test Event');

		// Enter 5001 characters in description
		const longDescription = 'A'.repeat(5001);
		await page.fill('textarea[name="description"]', longDescription);

		// Try to submit
		await page.click('button:has-text("Create Event")');

		// Verify validation error
		await expect(page.locator('text=/Description must be.*5000 characters/')).toBeVisible();
	});

	test('should enforce 5-year limit on recurring events', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		await page.fill('input[name="title"]', 'Long Recurring Event');

		// Toggle recurring
		await page.check('input[type="checkbox"][name="isRecurring"]');

		// Set end date > 5 years from now
		const endDate = new Date();
		endDate.setFullYear(endDate.getFullYear() + 6); // 6 years
		const endDateStr = endDate.toISOString().split('T')[0];

		await page.fill('input[name="recurrenceEndDate"]', endDateStr);

		// Try to submit
		await page.click('button:has-text("Create Event")');

		// Verify validation error
		await expect(page.locator('text=/Recurring events cannot exceed.*5 years/')).toBeVisible();
	});

	test('should close dialog without creating event when clicking cancel', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		// Fill some fields
		await page.fill('input[name="title"]', 'Cancelled Event');

		// Click cancel button
		const cancelButton = page.locator('button:has-text("Cancel")');
		await cancelButton.click();

		// Verify dialog closes
		await expect(page.locator('[role="dialog"]')).not.toBeVisible();

		// Verify event was not created
		await expect(page.locator('.fc-event:has-text("Cancelled Event")')).not.toBeVisible();
	});

	test('should generate valid RRULE for monthly recurring event', async ({ page }) => {
		await page.locator('.fc-daygrid-day').nth(10).click();
		await page.waitForSelector('[role="dialog"]');

		await page.fill('input[name="title"]', 'Monthly All-Hands');

		// Toggle recurring
		await page.check('input[type="checkbox"][name="isRecurring"]');

		// Select monthly frequency
		await page.selectOption('select[name="frequency"]', 'monthly');

		// Set interval to 1
		await page.fill('input[name="interval"]', '1');

		// Set end date
		const endDate = new Date();
		endDate.setMonth(endDate.getMonth() + 12);
		await page.fill('input[name="recurrenceEndDate"]', endDate.toISOString().split('T')[0]);

		// Intercept GraphQL mutation to verify RRULE
		const createMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'CreateEvent'
		);

		// Submit
		await page.click('button:has-text("Create Event")');

		const response = await createMutation;
		const requestData = response.request().postDataJSON();

		// Verify RRULE contains FREQ=MONTHLY
		expect(requestData.variables.recurrencePattern?.rruleString).toContain('FREQ=MONTHLY');
		expect(requestData.variables.recurrencePattern?.rruleString).toContain('INTERVAL=1');
	});
});
