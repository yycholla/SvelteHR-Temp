import { beforeEach, describe, expect, test } from 'vitest';
import {
	clickElement,
	fillInput,
	getPage,
	gotoPage,
	login,
	pageContainsText,
	waitFor
} from '../../utils/puppeteer-helpers';

describe('Admin - Training Creation (Puppeteer)', () => {
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('can navigate to training creation page', async () => {
		await gotoPage('/admin/trainings/create');
		const hasTitle = await pageContainsText('Create Training');
		expect(hasTitle).toBe(true);
	});

	test('can create a new training', async () => {
		await gotoPage('/admin/trainings/create');

		const title = `Test Training ${Date.now()}`;
		await fillInput('input[name="title"]', title);
		await fillInput('textarea[name="description"]', 'This is a test training module');

		// Submit form
		const page = getPage();
		await clickElement('button[type="submit"]');

		// Wait for navigation
		try {
			await page.waitForNavigation({ timeout: 5000 });
		} catch (e) {
			// Navigation might have happened too fast or timeout
			console.log('Navigation wait finished or timed out');
		}

		// Verify we are redirected to list
		expect(page.url()).toContain('/admin/trainings');
		expect(page.url()).not.toContain('/create');
	});
});
