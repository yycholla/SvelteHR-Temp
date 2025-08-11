import { chromium, FullConfig } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

async function globalSetup(config: FullConfig) {
	console.log('🚀 Starting global setup...');
	
	// Create screenshots directory
	const fs = await import('fs');
	const path = './e2e/screenshots';
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path, { recursive: true });
	}
	
	// Launch browser for setup
	const browser = await chromium.launch();
	const context = await browser.newContext();
	const page = await context.newPage();
	const helpers = new TestHelpers(page);
	
	try {
		console.log('🔍 Checking if application is running...');
		
		// Check if the application is accessible
		await page.goto('/');
		console.log('✅ Application is accessible');
		
		// Test login functionality
		console.log('🔐 Testing login functionality...');
		await helpers.loginAsAdmin();
		console.log('✅ Login test successful');
		
		// Check if backend is responding
		console.log('🌐 Checking backend connectivity...');
		const response = await page.goto('/home');
		if (response?.status() === 200) {
			console.log('✅ Backend is responding');
		} else {
			console.warn('⚠️ Backend may have issues');
		}
		
	} catch (error) {
		console.error('❌ Global setup failed:', error);
		throw error;
	} finally {
		await browser.close();
	}
	
	console.log('✅ Global setup completed successfully');
}

export default globalSetup;