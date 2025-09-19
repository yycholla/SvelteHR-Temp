#!/usr/bin/env node

/**
 * Real browser authentication flow test using Playwright
 * This will actually simulate the login and detect redirect loops
 */

import { chromium } from 'playwright';

async function testAuthenticationFlow() {
	console.log('🚀 Testing Real Authentication Flow with Playwright');
	console.log('==================================================');

	const browser = await chromium.launch({
		headless: false, // Show browser for debugging
		slowMo: 1000 // Slow down for observation
	});

	try {
		const context = await browser.newContext();
		const page = await context.newPage();

		// Listen for navigation events to detect loops
		const navigationHistory = [];
		page.on('framenavigated', (frame) => {
			if (frame === page.mainFrame()) {
				const url = frame.url();
				const timestamp = new Date().toISOString();
				navigationHistory.push({ url, timestamp });
				console.log(`📍 Navigation: ${url} at ${timestamp}`);
			}
		});

		// Listen for console messages from the app
		page.on('console', (msg) => {
			if (msg.text().includes('Admin layout') || msg.text().includes('redirect')) {
				console.log(`🖥️  Browser Console: ${msg.text()}`);
			}
		});

		console.log('\n1. Navigate to home page');
		await page.goto('http://localhost:5174/');
		await page.waitForTimeout(2000);

		console.log('\n2. Should redirect to login - filling out login form');
		await page.waitForSelector('input[type="email"]', { timeout: 10000 });

		// Fill login form
		await page.fill('input[type="email"]', 'admin@postgraphile-hr.com');
		await page.fill('input[type="password"]', 'admin123');

		console.log('\n3. Submitting login form');
		await page.click('button[type="submit"]');

		// Wait and watch for navigation patterns
		console.log('\n4. Monitoring navigation for 10 seconds to detect loops...');
		await page.waitForTimeout(10000);

		// Analyze navigation history
		console.log('\n📊 NAVIGATION ANALYSIS');
		console.log('======================');

		const adminNavigations = navigationHistory.filter((nav) => nav.url.includes('/admin'));
		const loginNavigations = navigationHistory.filter((nav) => nav.url.includes('/login'));

		console.log(`Total navigations: ${navigationHistory.length}`);
		console.log(`Admin page visits: ${adminNavigations.length}`);
		console.log(`Login page visits: ${loginNavigations.length}`);

		if (adminNavigations.length > 1) {
			console.log('\n🚨 POTENTIAL REDIRECT LOOP DETECTED:');
			adminNavigations.forEach((nav, index) => {
				console.log(`   ${index + 1}. ${nav.url} at ${nav.timestamp}`);
			});
		} else {
			console.log('\n✅ NO REDIRECT LOOPS DETECTED');
		}

		// Check current final state
		const currentUrl = page.url();
		console.log(`\n🎯 Final URL: ${currentUrl}`);

		if (currentUrl.includes('/admin')) {
			console.log('✅ Successfully reached admin page');
		} else if (currentUrl.includes('/login')) {
			console.log('⚠️  Ended up back on login page');
		} else {
			console.log('❓ Unexpected final location');
		}

		// Take a screenshot of final state
		await page.screenshot({ path: 'auth-flow-final-state.png' });
		console.log('\n📸 Screenshot saved: auth-flow-final-state.png');
	} catch (error) {
		console.error('❌ Test failed:', error);
	} finally {
		await browser.close();
	}
}

testAuthenticationFlow().catch(console.error);
