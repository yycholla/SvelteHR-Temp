#!/usr/bin/env node

/**
 * Headless browser authentication flow test
 * This will detect navigation patterns and redirect loops
 */

import { chromium } from 'playwright';

async function testAuthenticationFlow() {
	console.log('🚀 Testing Authentication Flow (Headless)');
	console.log('==========================================');

	const browser = await chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-dev-shm-usage']
	});

	try {
		const context = await browser.newContext();
		const page = await context.newPage();

		// Track navigation patterns
		const navigationHistory = [];
		const consoleMessages = [];

		page.on('framenavigated', (frame) => {
			if (frame === page.mainFrame()) {
				const url = frame.url();
				const timestamp = Date.now();
				navigationHistory.push({ url, timestamp });
				console.log(`📍 Navigation: ${url}`);
			}
		});

		page.on('console', (msg) => {
			const text = msg.text();
			consoleMessages.push({ text, timestamp: Date.now() });
			if (
				text.includes('Admin layout') ||
				text.includes('redirect') ||
				text.includes('Authentication')
			) {
				console.log(`🖥️  Console: ${text}`);
			}
		});

		console.log('\n1. Navigate to home page');
		await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
		await page.waitForTimeout(1000);

		console.log('\n2. Fill and submit login form');
		try {
			// Wait for login form
			await page.waitForSelector('input[type="email"]', { timeout: 5000 });
			await page.fill('input[type="email"]', 'admin@postgraphile-hr.com');
			await page.fill('input[type="password"]', 'admin123');

			// Submit form and wait for navigation
			await Promise.all([
				page.waitForNavigation({ timeout: 10000 }),
				page.click('button[type="submit"]')
			]);

			console.log('\n3. Monitoring for redirect loops (5 seconds)...');
			await page.waitForTimeout(5000);
		} catch (error) {
			console.log(`⚠️  Form interaction failed: ${error.message}`);
		}

		// Analyze navigation patterns
		console.log('\n📊 NAVIGATION ANALYSIS');
		console.log('======================');

		console.log('Navigation History:');
		navigationHistory.forEach((nav, index) => {
			console.log(`  ${index + 1}. ${nav.url}`);
		});

		// Check for loops
		const adminVisits = navigationHistory.filter((nav) => nav.url.includes('/admin')).length;
		const loginVisits = navigationHistory.filter((nav) => nav.url.includes('/login')).length;
		const rootVisits = navigationHistory.filter(
			(nav) => nav.url === 'http://localhost:5174/'
		).length;

		console.log(`\nPage Visit Counts:`);
		console.log(`  Root page (/): ${rootVisits}`);
		console.log(`  Login page: ${loginVisits}`);
		console.log(`  Admin page: ${adminVisits}`);

		// Detect potential loops
		if (adminVisits > 1 || loginVisits > 2) {
			console.log('\n🚨 POTENTIAL REDIRECT LOOP DETECTED');
			console.log('Multiple visits to the same page type detected');
		} else {
			console.log('\n✅ NO OBVIOUS REDIRECT LOOPS');
		}

		// Check final state
		const finalUrl = page.url();
		console.log(`\n🎯 Final URL: ${finalUrl}`);

		// Analyze console messages for patterns
		const adminLayoutMessages = consoleMessages.filter((msg) =>
			msg.text.includes('Admin layout: Component loaded')
		);

		if (adminLayoutMessages.length > 1) {
			console.log(`\n⚠️  Admin layout loaded ${adminLayoutMessages.length} times`);
			console.log('This suggests component re-mounting/re-rendering');
		}

		return {
			navigationHistory,
			consoleMessages,
			finalUrl,
			hasRedirectLoop: adminVisits > 1 || loginVisits > 2
		};
	} catch (error) {
		console.error('❌ Test failed:', error);
		return null;
	} finally {
		await browser.close();
	}
}

testAuthenticationFlow()
	.then((result) => {
		if (result) {
			console.log('\n🏁 Test completed successfully');
			if (result.hasRedirectLoop) {
				console.log('❌ Redirect loop detected');
				process.exit(1);
			} else {
				console.log('✅ No redirect loops found');
				process.exit(0);
			}
		} else {
			console.log('❌ Test failed');
			process.exit(1);
		}
	})
	.catch(console.error);
