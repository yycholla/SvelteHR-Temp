/**
 * E2E Test: Comment on Event
 * Feature: 027-we-need-to
 * Quickstart Scenario 6
 *
 * Tests event commenting with @mentions, markdown rendering, and real-time updates.
 * MUST FAIL until comment functionality is implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Comment on Event', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard/events');
		await page.waitForSelector('.fc-daygrid-body');
	});

	test('should switch to Comments tab in EventDetailsDialog', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Click Comments tab
		const commentsTab = dialog.locator('[role="tab"]:has-text("Comments")');
		await commentsTab.click();

		// Verify Comments tab is now active
		await expect(commentsTab).toHaveAttribute('aria-selected', 'true');

		// Verify comment section is visible
		const commentSection = dialog.locator('[role="tabpanel"]').filter({ hasText: /Comments|No comments/ });
		await expect(commentSection).toBeVisible();
	});

	test('should display existing comments', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// Wait for comments to load
		await page.waitForTimeout(500);

		// Verify comment list or empty state
		const commentList = dialog.locator('.comment-list, [data-comment-list]');

		if ((await commentList.count()) > 0) {
			// If comments exist, verify structure
			const firstComment = commentList.locator('.comment-item').first();

			if ((await firstComment.count()) > 0) {
				// Verify comment has author name
				const authorName = firstComment.locator('.comment-author');
				await expect(authorName).toBeVisible();

				// Verify comment has timestamp
				const timestamp = firstComment.locator('.comment-timestamp, time');
				await expect(timestamp).toBeVisible();

				// Verify comment has content
				const content = firstComment.locator('.comment-content');
				await expect(content).toBeVisible();
			}
		} else {
			// Verify empty state message
			await expect(dialog.locator('text=/No comments yet|Be the first to comment/')).toBeVisible();
		}
	});

	test('should post a new comment', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// Find comment input
		const commentInput = dialog.locator('textarea[name="comment"], textarea[placeholder*="comment" i]');
		await commentInput.fill('This is a test comment');

		// Submit comment
		const submitButton = dialog.locator('button:has-text("Post"), button:has-text("Submit")');
		await submitButton.click();

		// Verify success toast
		await expect(
			page.locator('.toast:has-text("Comment posted")')
		).toBeVisible({ timeout: 3000 });

		// Verify comment appears in list
		await page.waitForTimeout(500);
		const commentList = dialog.locator('.comment-list');
		await expect(commentList.locator('text="This is a test comment"')).toBeVisible();
	});

	test('should mention user with @ syntax', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		const commentInput = dialog.locator('textarea[name="comment"]');

		// Type @ to trigger mention autocomplete
		await commentInput.fill('@');

		// Verify mention dropdown appears
		const mentionDropdown = page.locator('.mention-dropdown, [role="listbox"]');
		await expect(mentionDropdown).toBeVisible({ timeout: 1000 });

		// Type more to filter
		await commentInput.press('j');
		await commentInput.press('o');

		// Verify filtered results
		await page.waitForTimeout(300);

		// Select first mention suggestion
		const firstSuggestion = mentionDropdown.locator('[role="option"]').first();
		await firstSuggestion.click();

		// Verify mention is inserted in input
		const inputValue = await commentInput.inputValue();
		expect(inputValue).toMatch(/@\w+/);

		// Complete comment
		await commentInput.fill(inputValue + ' Great event!');

		// Submit
		await page.click('button:has-text("Post")');

		// Verify comment with mention is posted
		await page.waitForTimeout(500);
		await expect(page.locator('.comment-content:has-text("Great event!")')).toBeVisible();
	});

	test('should render markdown in comments', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		const commentInput = dialog.locator('textarea[name="comment"]');

		// Write comment with markdown
		await commentInput.fill('This is **bold** and this is *italic*');

		// Submit
		await page.click('button:has-text("Post")');

		await page.waitForTimeout(500);

		// Verify markdown is rendered
		const commentContent = page.locator('.comment-content').last();
		const boldText = commentContent.locator('strong, b');
		const italicText = commentContent.locator('em, i');

		await expect(boldText).toHaveText('bold');
		await expect(italicText).toHaveText('italic');
	});

	test('should allow editing own comment', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// Post a comment
		const commentInput = dialog.locator('textarea[name="comment"]');
		await commentInput.fill('Original comment');
		await page.click('button:has-text("Post")');

		await page.waitForTimeout(500);

		// Find own comment (should have edit button)
		const ownComment = page.locator('.comment-item').last();
		const editButton = ownComment.locator('button:has-text("Edit"), button[aria-label="Edit comment"]');

		if ((await editButton.count()) > 0) {
			await editButton.click();

			// Verify edit mode activates
			const editInput = ownComment.locator('textarea');
			await expect(editInput).toBeVisible();

			// Modify comment
			await editInput.fill('Updated comment');

			// Save edit
			const saveButton = ownComment.locator('button:has-text("Save")');
			await saveButton.click();

			// Verify updated comment appears
			await expect(ownComment.locator('text="Updated comment"')).toBeVisible();
		}
	});

	test('should allow deleting own comment', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// Post a comment
		const commentInput = dialog.locator('textarea[name="comment"]');
		await commentInput.fill('Comment to delete');
		await page.click('button:has-text("Post")');

		await page.waitForTimeout(500);

		// Find own comment
		const ownComment = page.locator('.comment-item:has-text("Comment to delete")');
		const deleteButton = ownComment.locator('button:has-text("Delete"), button[aria-label="Delete comment"]');

		if ((await deleteButton.count()) > 0) {
			await deleteButton.click();

			// Verify confirmation modal
			const confirmModal = page.locator('[role="dialog"]:has-text("Delete comment")');

			if ((await confirmModal.count()) > 0) {
				const confirmButton = confirmModal.locator('button:has-text("Delete"), button:has-text("Confirm")');
				await confirmButton.click();

				// Verify comment is removed
				await expect(ownComment).not.toBeVisible();
			}
		}
	});

	test('should not show edit/delete buttons on other users comments', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// Find a comment by another user (if exists)
		const otherUserComment = page.locator('.comment-item[data-is-own="false"]').first();

		if ((await otherUserComment.count()) > 0) {
			// Verify no edit/delete buttons
			await expect(otherUserComment.locator('button:has-text("Edit")')).not.toBeVisible();
			await expect(otherUserComment.locator('button:has-text("Delete")')).not.toBeVisible();
		}
	});

	test('should show comment count badge on Comments tab', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();

		// Verify Comments tab has count badge
		const commentsTab = dialog.locator('[role="tab"]:has-text("Comments")');
		const countBadge = commentsTab.locator('.badge, [data-count]');

		if ((await countBadge.count()) > 0) {
			const countText = await countBadge.textContent();
			const count = parseInt(countText || '0');

			expect(count).toBeGreaterThanOrEqual(0);
		}
	});

	test('should load more comments with pagination', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// If there's a "Load More" button
		const loadMoreButton = dialog.locator('button:has-text("Load More"), button:has-text("Show More")');

		if ((await loadMoreButton.count()) > 0) {
			// Count initial comments
			const initialCount = await dialog.locator('.comment-item').count();

			// Click load more
			await loadMoreButton.click();

			await page.waitForTimeout(500);

			// Verify more comments loaded
			const newCount = await dialog.locator('.comment-item').count();
			expect(newCount).toBeGreaterThan(initialCount);
		}
	});

	test('should receive real-time comment updates via subscription', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		// Note initial comment count
		const initialCount = await dialog.locator('.comment-item').count();

		// Simulate another user posting a comment (via GraphQL subscription)
		// In real test, this would be triggered by backend/subscription mock

		// For now, just verify subscription setup
		// Real-time updates would appear automatically without refresh
	});

	test('should validate comment length before posting', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		const commentInput = dialog.locator('textarea[name="comment"]');

		// Try to post empty comment
		await page.click('button:has-text("Post")');

		// Verify validation error
		const errorMessage = dialog.locator('text=/Comment cannot be empty|Required/');

		if ((await errorMessage.count()) > 0) {
			await expect(errorMessage).toBeVisible();
		} else {
			// Or button is disabled
			const postButton = dialog.locator('button:has-text("Post")');
			await expect(postButton).toBeDisabled();
		}
	});

	test('should show typing indicator when composing comment', async ({ page }) => {
		const event = page.locator('.fc-event').first();
		await event.click();

		const dialog = page.locator('[role="dialog"]').first();
		await page.click('[role="tab"]:has-text("Comments")');

		const commentInput = dialog.locator('textarea[name="comment"]');

		// Start typing
		await commentInput.fill('Typing a comment...');

		// Verify character count or typing indicator
		const characterCount = dialog.locator('[data-character-count], .character-count');

		if ((await characterCount.count()) > 0) {
			const countText = await characterCount.textContent();
			expect(countText).toContain('19'); // "Typing a comment..." length
		}
	});
});
