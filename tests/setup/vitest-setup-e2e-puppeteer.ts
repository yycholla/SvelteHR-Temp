// Vitest E2E Puppeteer Environment Setup
// E2E browser testing configuration with Puppeteer (better Arch Linux support)
// Created: 2025-10-27
// Updated: Feature 039 - Added test database reset and artifact capture

import { afterAll, afterEach, beforeAll } from 'vitest';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { setBrowser, setPage } from '../utils/puppeteer-helpers';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let browser: Browser | null = null;
let page: Page | null = null;

// Artifact directories
const ARTIFACTS_DIR = path.join(process.cwd(), 'test-results');
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');
const VIDEOS_DIR = path.join(ARTIFACTS_DIR, 'videos');
const LOGS_DIR = path.join(ARTIFACTS_DIR, 'logs');

beforeAll(async () => {
	console.log('Starting Puppeteer browser for E2E tests...');

	// Reset test database before test suite
	try {
		console.log('Resetting test database...');
		execSync('npm run test:db:reset', { stdio: 'inherit' });
		console.log('Test database reset complete');
	} catch (error) {
		console.warn('Failed to reset test database:', error);
	}

	// Create artifact directories
	[SCREENSHOTS_DIR, VIDEOS_DIR, LOGS_DIR].forEach((dir) => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	});

	const headless = process.env.BROWSER_HEADLESS !== 'false';

	browser = await puppeteer.launch({
		headless,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
		defaultViewport: {
			width: 1280,
			height: 720
		}
	});

	page = await browser.newPage();

	// Set browser and page in helpers
	setBrowser(browser);
	setPage(page);

	console.log('Puppeteer browser started successfully');
});

afterEach(async () => {
	// Clean up after each test
	if (page) {
		try {
			// Clear cookies
			const client = await page.createCDPSession();
			await client.send('Network.clearBrowserCookies');
			await client.send('Network.clearBrowserCache');

			// Clear storage
			await page.evaluate(() => {
				localStorage.clear();
				sessionStorage.clear();
			});

			// Navigate to blank page
			await page.goto('about:blank');
		} catch (error) {
			console.warn('Error during test cleanup:', error);
		}
	}
});

afterAll(async () => {
	console.log('Closing Puppeteer browser...');

	if (page) {
		await page.close();
		page = null;
	}

	if (browser) {
		await browser.close();
		browser = null;
	}

	console.log('Puppeteer browser closed');
});
