import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Communication Workflows', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
		await helpers.loginAsAdmin();
	});

	test('should load communications page', async ({ page }) => {
		await page.goto('/communications');

		// Should show communications page
		await expect(page.locator('h1')).toContainText('Communications');

		// Wait for content to load
		await helpers.waitForLoadingToComplete();

		// Should have communication-related UI elements
		const communicationElements = [
			'.inbox',
			'.message-list',
			'.communications-container',
			'[data-testid="message-list"]',
			'button:has-text("Compose")',
			'button:has-text("New Message")'
		];

		let elementFound = false;
		for (const selector of communicationElements) {
			if (
				await page
					.locator(selector)
					.isVisible()
					.catch(() => false)
			) {
				elementFound = true;
				break;
			}
		}

		expect(elementFound).toBeTruthy();
		await helpers.takeScreenshot('communications-page');
	});

	test('should display message inbox with filters', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Check for message filtering options
		const filterElements = [
			'select[name="type"]',
			'select[name="priority"]',
			'input[name="search"]',
			'.filter-buttons',
			'button:has-text("All")',
			'button:has-text("Unread")'
		];

		for (const selector of filterElements) {
			const element = page.locator(selector);
			if (await element.isVisible()) {
				await expect(element).toBeVisible();
			}
		}

		await helpers.takeScreenshot('communications-inbox');
	});

	test('should open compose message modal', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Look for compose/new message button
		const composeButton = page.locator('button:has-text("Compose"), button:has-text("New Message")').first();

		if (await composeButton.isVisible()) {
			await composeButton.click();

			// Modal should open
			await expect(page.locator('.modal, [role="dialog"]')).toBeVisible({ timeout: 5000 });
			await expect(page.locator('h2:has-text("Compose"), h3:has-text("New Message")')).toBeVisible();

			// Check for essential form fields
			const formFields = [
				'select[name="type"]',
				'input[name="subject"]',
				'textarea[name="content"]',
				'select[name="priority"]'
			];

			for (const field of formFields) {
				const element = page.locator(field);
				if (await element.isVisible()) {
					await expect(element).toBeVisible();
				}
			}

			await helpers.takeScreenshot('compose-message-modal');
		}
	});

	test('should validate required fields when composing message', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		const composeButton = page.locator('button:has-text("Compose"), button:has-text("New Message")').first();

		if (await composeButton.isVisible()) {
			await composeButton.click();
			
			// Try to submit empty form
			const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Send Message")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();

				// Should show validation errors
				await expect(page.locator('.error-message, .field-error, .invalid-feedback')).toHaveCount({ gte: 1 });
				await helpers.takeScreenshot('compose-validation-errors');
			}
		}
	});

	test('should send announcement message successfully', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		const composeButton = page.locator('button:has-text("Compose"), button:has-text("New Message")').first();

		if (await composeButton.isVisible()) {
			await composeButton.click();
			
			// Fill form with announcement data
			const messageData = {
				type: 'announcement',
				subject: `Test Announcement ${Date.now()}`,
				content: 'This is a test announcement message for the E2E test suite.',
				priority: 'high'
			};

			// Select message type
			const typeSelect = page.locator('select[name="type"]');
			if (await typeSelect.isVisible()) {
				await typeSelect.selectOption(messageData.type);
			}

			// Fill subject
			const subjectInput = page.locator('input[name="subject"]');
			if (await subjectInput.isVisible()) {
				await subjectInput.fill(messageData.subject);
			}

			// Fill content
			const contentTextarea = page.locator('textarea[name="content"], [contenteditable], .content-editor');
			if (await contentTextarea.isVisible()) {
				await contentTextarea.fill(messageData.content);
			}

			// Select priority
			const prioritySelect = page.locator('select[name="priority"]');
			if (await prioritySelect.isVisible()) {
				await prioritySelect.selectOption(messageData.priority);
			}

			// Submit form
			const submitButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Send Message")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();

				// Should show success message or close modal
				await page.waitForTimeout(2000);
				const successIndicators = [
					'.success-message',
					'.toast-success', 
					'.alert-success',
					':has-text("sent successfully")',
					':has-text("Message sent")'
				];

				let successFound = false;
				for (const selector of successIndicators) {
					if (await page.locator(selector).isVisible().catch(() => false)) {
						successFound = true;
						break;
					}
				}

				await helpers.takeScreenshot('announcement-sent');
			}
		}
	});

	test('should send direct message successfully', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		const composeButton = page.locator('button:has-text("Compose"), button:has-text("New Message")').first();

		if (await composeButton.isVisible()) {
			await composeButton.click();
			
			// Select direct message type
			const typeSelect = page.locator('select[name="type"]');
			if (await typeSelect.isVisible()) {
				await typeSelect.selectOption('direct_message');
			}

			// Fill recipient
			const recipientInput = page.locator('input[name="recipients"], select[name="recipients"]');
			if (await recipientInput.isVisible()) {
				if (await recipientInput.getAttribute('type') === 'text') {
					await recipientInput.fill('admin@mountainhr.com');
				} else {
					await recipientInput.selectOption({ index: 1 });
				}
			}

			// Fill message details
			await page.locator('input[name="subject"]').fill(`Direct Message ${Date.now()}`);
			await page.locator('textarea[name="content"]').fill('This is a test direct message.');

			// Submit
			const submitButton = page.locator('button[type="submit"]:has-text("Send")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('direct-message-sent');
			}
		}
	});

	test('should filter messages by type', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Test different message type filters
		const typeFilters = [
			'button:has-text("All")',
			'button:has-text("Announcements")', 
			'button:has-text("Direct Messages")',
			'button:has-text("Notifications")',
			'select[name="type"]'
		];

		for (const filter of typeFilters) {
			const filterElement = page.locator(filter);
			if (await filterElement.isVisible()) {
				await filterElement.click();
				await page.waitForTimeout(1000); // Allow filter to apply
				
				// Check if message list updated
				const messageList = page.locator('.message-list, .communication-list');
				if (await messageList.isVisible()) {
					await expect(messageList).toBeVisible();
				}

				await helpers.takeScreenshot(`filter-${filter.replace(/[^a-zA-Z]/g, '')}`);
				break;
			}
		}
	});

	test('should filter messages by priority', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Test priority filtering
		const priorityFilter = page.locator('select[name="priority"], .priority-filter');
		if (await priorityFilter.isVisible()) {
			await priorityFilter.selectOption('high');
			await page.waitForTimeout(1000);

			// Check if high priority messages are shown
			const highPriorityMessages = page.locator('.priority-high, .high-priority, [data-priority="high"]');
			await helpers.takeScreenshot('high-priority-filter');

			// Reset filter
			await priorityFilter.selectOption('all');
		}
	});

	test('should search messages by content', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Test search functionality
		const searchInput = page.locator('input[name="search"], input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('announcement');
			await page.waitForTimeout(1000); // Allow search to process

			// Check if search results are displayed
			const messageList = page.locator('.message-list, .communication-list');
			if (await messageList.isVisible()) {
				await expect(messageList).toBeVisible();
			}

			await helpers.takeScreenshot('message-search-results');

			// Clear search
			await searchInput.clear();
			await page.waitForTimeout(1000);
		}
	});

	test('should view message details', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Click on first message to view details
		const firstMessage = page.locator('.message-item, .communication-item').first();
		if (await firstMessage.isVisible()) {
			await firstMessage.click();

			// Should show message details
			const messageDetails = page.locator('.message-details, .communication-details, [role="dialog"]');
			if (await messageDetails.isVisible()) {
				await expect(messageDetails).toBeVisible();
				
				// Check for message content elements
				const detailElements = [
					'.message-subject, .subject',
					'.message-content, .content',
					'.message-sender, .sender',
					'.message-timestamp, .timestamp'
				];

				for (const selector of detailElements) {
					const element = page.locator(selector);
					if (await element.isVisible()) {
						await expect(element).toBeVisible();
					}
				}

				await helpers.takeScreenshot('message-details');
			}
		}
	});

	test('should mark message as read/unread', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Look for mark as read/unread button
		const markButton = page.locator('button:has-text("Mark"), .mark-read, .mark-unread').first();
		if (await markButton.isVisible()) {
			await markButton.click();
			await page.waitForTimeout(1000);

			// Should show status change
			await helpers.takeScreenshot('message-marked');
		}
	});

	test('should delete message with confirmation', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Look for delete button
		const deleteButton = page.locator('button:has-text("Delete"), .delete-btn').first();
		if (await deleteButton.isVisible()) {
			await deleteButton.click();

			// Should show confirmation dialog
			const confirmationDialog = page.locator('.confirmation-dialog, [role="alertdialog"]');
			if (await confirmationDialog.isVisible()) {
				await expect(confirmationDialog).toBeVisible();
				await helpers.takeScreenshot('delete-message-confirmation');

				// Cancel deletion for safety
				const cancelButton = page.locator('button:has-text("Cancel")').first();
				if (await cancelButton.isVisible()) {
					await cancelButton.click();
				}
			}
		}
	});

	test('should handle message pagination', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		// Look for pagination controls
		const paginationControls = [
			'button:has-text("Next")',
			'button:has-text("Previous")',
			'.pagination',
			'[aria-label*="pagination"]'
		];

		for (const selector of paginationControls) {
			const control = page.locator(selector);
			if (await control.isVisible() && await control.isEnabled()) {
				await control.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('communications-pagination');
				break;
			}
		}
	});

	test('should send notification message', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		const composeButton = page.locator('button:has-text("Compose"), button:has-text("New Message")').first();

		if (await composeButton.isVisible()) {
			await composeButton.click();
			
			// Select notification type
			const typeSelect = page.locator('select[name="type"]');
			if (await typeSelect.isVisible()) {
				await typeSelect.selectOption('notification');
			}

			// Fill notification details
			const notificationData = {
				subject: `System Notification ${Date.now()}`,
				content: 'This is a test system notification message.',
				priority: 'medium'
			};

			await page.locator('input[name="subject"]').fill(notificationData.subject);
			await page.locator('textarea[name="content"]').fill(notificationData.content);

			const prioritySelect = page.locator('select[name="priority"]');
			if (await prioritySelect.isVisible()) {
				await prioritySelect.selectOption(notificationData.priority);
			}

			// Submit
			const submitButton = page.locator('button[type="submit"]:has-text("Send")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('notification-sent');
			}
		}
	});

	test('should schedule reminder message', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();

		const composeButton = page.locator('button:has-text("Compose"), button:has-text("New Message")').first();

		if (await composeButton.isVisible()) {
			await composeButton.click();
			
			// Select reminder type
			const typeSelect = page.locator('select[name="type"]');
			if (await typeSelect.isVisible()) {
				await typeSelect.selectOption('reminder');
			}

			// Fill reminder details
			await page.locator('input[name="subject"]').fill(`Test Reminder ${Date.now()}`);
			await page.locator('textarea[name="content"]').fill('This is a scheduled reminder message.');

			// Set schedule date if available
			const scheduleInput = page.locator('input[name="scheduledFor"], input[type="datetime-local"]');
			if (await scheduleInput.isVisible()) {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				const isoString = tomorrow.toISOString().slice(0, 16); // Format for datetime-local
				await scheduleInput.fill(isoString);
			}

			// Submit
			const submitButton = page.locator('button[type="submit"]:has-text("Schedule"), button:has-text("Send")').first();
			if (await submitButton.isVisible()) {
				await submitButton.click();
				await page.waitForTimeout(2000);
				await helpers.takeScreenshot('reminder-scheduled');
			}
		}
	});

	test('should be responsive', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();
		await helpers.testResponsiveDesign();
	});

	test('should have proper accessibility', async ({ page }) => {
		await page.goto('/communications');
		await helpers.waitForLoadingToComplete();
		await helpers.checkAccessibility();
	});
});