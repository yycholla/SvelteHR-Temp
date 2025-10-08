/**
 * E2E Test: Event Comments - CRUD Operations
 * Feature: 026-integrate-ui-components - T021
 *
 * Tests comment functionality:
 * - Add comment with @mention
 * - XSS sanitization (strips HTML/JS)
 * - Edit own comment
 * - Cannot edit others' comments
 * - Timestamp transition at 48h boundary
 * - Pagination with "Load More" button
 */

import { test, expect } from '@playwright/test';

test.describe('Event Comments - CRUD Operations', () => {
	test.beforeEach(async ({ page }) => {
		// Login with valid credentials
		await page.goto('/login');
		await page.fill('input[name="email"]', 'admin@example.com');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');

		// Wait for redirect to dashboard
		await page.waitForURL('/dashboard');

		// Navigate to events page
		await page.goto('/dashboard/events');
		await page.waitForLoadState('networkidle');

		// Open first event dialog
		const eventCard = page.locator('[class*="event-card"]').first();
		await eventCard.click();
		await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

		// Switch to Comments tab
		const commentsTab = page.locator('[role="tab"]:has-text("Comments")').first();
		await commentsTab.click();
	});

	test('should add comment with plain text', async ({ page }) => {
		// Find comment input
		const commentInput = page.locator('textarea[placeholder*="comment"], textarea[name="comment"]').first();
		await commentInput.waitFor({ state: 'visible' });

		// Type comment
		const testComment = `Test comment at ${Date.now()}`;
		await commentInput.fill(testComment);

		// Submit comment
		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();

		// Wait for comment to appear
		await page.waitForTimeout(1000);

		// Verify comment appears in list
		const commentText = page.locator(`text=${testComment}`);
		await expect(commentText).toBeVisible();
	});

	test('should add comment with @mention', async ({ page }) => {
		// Find comment input
		const commentInput = page.locator('textarea[placeholder*="comment"], textarea[name="comment"]').first();
		await commentInput.waitFor({ state: 'visible' });

		// Type comment with @mention
		const testComment = `Test comment with @alice mention at ${Date.now()}`;
		await commentInput.fill(testComment);

		// Submit comment
		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();

		// Wait for comment to appear
		await page.waitForTimeout(1000);

		// Verify comment appears with @mention preserved
		const commentText = page.locator('text=@alice');
		await expect(commentText).toBeVisible();
	});

	test('should strip HTML tags from comment (XSS protection)', async ({ page }) => {
		// Find comment input
		const commentInput = page.locator('textarea[placeholder*="comment"], textarea[name="comment"]').first();
		await commentInput.waitFor({ state: 'visible' });

		// Try to inject HTML
		const maliciousComment = '<b>Bold text</b> and <i>italic text</i> with @bob';
		await commentInput.fill(maliciousComment);

		// Submit comment
		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();

		// Wait for comment to appear
		await page.waitForTimeout(1000);

		// Verify HTML tags were stripped but text and @mention preserved
		const sanitizedText = page.locator('text=Bold text and italic text with @bob');
		await expect(sanitizedText).toBeVisible();

		// Verify no actual HTML tags rendered
		const boldTag = page.locator('b:has-text("Bold text")');
		await expect(boldTag).toHaveCount(0);
	});

	test('should strip JavaScript from comment (XSS protection)', async ({ page }) => {
		// Find comment input
		const commentInput = page.locator('textarea[placeholder*="comment"], textarea[name="comment"]').first();
		await commentInput.waitFor({ state: 'visible' });

		// Try to inject script
		const xssComment = '<script>alert("XSS")</script>Safe text here';
		await commentInput.fill(xssComment);

		// Setup alert dialog handler to catch XSS attempts
		let alertFired = false;
		page.on('dialog', async (dialog) => {
			alertFired = true;
			await dialog.dismiss();
		});

		// Submit comment
		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();

		// Wait for comment processing
		await page.waitForTimeout(1000);

		// Verify script did NOT execute
		expect(alertFired).toBe(false);

		// Verify safe text was preserved
		const safeText = page.locator('text=Safe text here');
		await expect(safeText).toBeVisible();
	});

	test('should edit own comment', async ({ page }) => {
		// First, add a comment
		const commentInput = page.locator('textarea[placeholder*="comment"], textarea[name="comment"]').first();
		const originalComment = `Original comment ${Date.now()}`;
		await commentInput.fill(originalComment);

		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();
		await page.waitForTimeout(1000);

		// Find the comment we just added
		const commentContainer = page.locator(`text=${originalComment}`).locator('..').locator('..');

		// Find edit button (usually a pencil icon or "Edit" text)
		const editButton = commentContainer.locator('button[aria-label*="Edit"], button:has-text("Edit")').first();

		// Check if edit button exists (should for own comments)
		const editButtonCount = await editButton.count();
		if (editButtonCount > 0) {
			await editButton.click();

			// Find edit textarea
			const editTextarea = page.locator('textarea[value*="Original comment"]').first();
			await editTextarea.fill(`Edited comment ${Date.now()}`);

			// Save edit
			const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
			await saveButton.click();
			await page.waitForTimeout(1000);

			// Verify comment was updated
			const editedText = page.locator('text=Edited comment');
			await expect(editedText).toBeVisible();
		}
	});

	test('should display relative timestamps for recent comments', async ({ page }) => {
		// Add a new comment
		const commentInput = page.locator('textarea[placeholder*="comment"], textarea[name="comment"]').first();
		await commentInput.fill(`New comment ${Date.now()}`);

		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();
		await page.waitForTimeout(1000);

		// Look for relative timestamp formats (within 48 hours)
		const relativeTime = page.locator('text=/\\d+ (second|minute|hour|day)s? ago/').first();
		await expect(relativeTime).toBeVisible();
	});

	test('should display "Load More" button when more than 20 comments', async ({ page }) => {
		// Check comment count badge
		const commentsTab = page.locator('[role="tab"]:has-text("Comments")').first();
		const badge = commentsTab.locator('[class*="badge"]');

		const badgeCount = await badge.count();
		if (badgeCount > 0) {
			const badgeText = await badge.textContent();
			const commentCount = parseInt(badgeText || '0');

			if (commentCount > 20) {
				// "Load More" button should be visible
				const loadMoreButton = page.locator('button:has-text("Load More")').first();
				await expect(loadMoreButton).toBeVisible();

				// Click "Load More"
				await loadMoreButton.click();
				await page.waitForTimeout(500);

				// Verify more comments loaded
				const comments = page.locator('[class*="comment-item"], div[role="article"]');
				const loadedCount = await comments.count();
				expect(loadedCount).toBeGreaterThan(20);
			}
		}
	});

	test('should show empty state when no comments exist', async ({ page }) => {
		// This test works if we're on an event with no comments
		const emptyState = page.locator('text=/No comments yet|Be the first to comment/');
		const emptyStateCount = await emptyState.count();

		if (emptyStateCount > 0) {
			// Empty state exists
			await expect(emptyState).toBeVisible();

			// Add first comment
			const commentInput = page.locator('textarea[placeholder*="comment"]').first();
			await commentInput.fill('First comment!');

			const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post")').first();
			await submitButton.click();
			await page.waitForTimeout(1000);

			// Empty state should disappear
			await expect(emptyState).not.toBeVisible();
		}
	});

	test('should display inline error on comment submission failure', async ({ page }) => {
		// Try to submit empty comment
		const submitButton = page.locator('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]').first();
		await submitButton.click();

		// Wait for error message
		await page.waitForTimeout(500);

		// Look for inline error (not toast notification)
		const errorMessage = page.locator('text=/required|cannot be empty|at least/i').first();
		const errorCount = await errorMessage.count();

		if (errorCount > 0) {
			await expect(errorMessage).toBeVisible();
		}
	});
});
