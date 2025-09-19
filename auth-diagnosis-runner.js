#!/usr/bin/env node

/**
 * Authentication Redirect Issue Diagnosis Runner
 *
 * Uses our authentication testing entities to systematically analyze
 * the redirect issue in the SvelteHR application.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

// Import our testing entities (simplified for diagnosis)
class AuthTestResult {
	constructor(data) {
		this.id = data.id;
		this.scenarioId = data.scenarioId;
		this.status = data.status;
		this.startTime = data.startTime;
		this.endTime = data.endTime;
		this.duration = data.duration;
		this.redirects = data.redirects || [];
		this.finalUrl = data.finalUrl;
		this.errors = data.errors || [];
		this.screenshots = data.screenshots || [];
		this.logs = data.logs || [];
	}

	hasRedirectLoop() {
		if (this.redirects.length < 3) return false;

		// Check for repeated URLs in redirect chain
		const urlCounts = {};
		for (const redirect of this.redirects) {
			urlCounts[redirect.url] = (urlCounts[redirect.url] || 0) + 1;
			if (urlCounts[redirect.url] > 2) {
				return true;
			}
		}
		return false;
	}

	getRedirectPattern() {
		return this.redirects.map((r) => r.url).join(' -> ');
	}
}

class AuthDiagnosisRunner {
	constructor(config) {
		this.config = config;
		this.results = [];
		this.browser = null;
		this.context = null;
		this.page = null;
	}

	async initialize() {
		console.log('🔍 Initializing Authentication Diagnosis...');
		this.browser = await chromium.launch({
			headless: false, // Show browser for debugging
			slowMo: 500 // Slow down actions for observation
		});
		this.context = await this.browser.newContext({
			recordVideo: { dir: './auth-diagnosis-videos/' }
		});
		this.page = await this.context.newPage();

		// Track navigation events
		this.redirects = [];
		this.page.on('framenavigated', (frame) => {
			if (frame === this.page.mainFrame()) {
				this.redirects.push({
					url: frame.url(),
					timestamp: new Date(),
					method: 'navigation'
				});
				console.log(`📍 Navigation: ${frame.url()}`);
			}
		});

		// Track responses for redirect detection
		this.page.on('response', (response) => {
			if (response.status() >= 300 && response.status() < 400) {
				const location = response.headers()['location'];
				console.log(`🔄 Redirect: ${response.status()} -> ${location}`);
				this.redirects.push({
					url: location || 'unknown',
					timestamp: new Date(),
					method: 'redirect',
					status: response.status()
				});
			}
		});

		// Track console logs
		this.logs = [];
		this.page.on('console', (msg) => {
			this.logs.push({
				type: msg.type(),
				text: msg.text(),
				timestamp: new Date()
			});
			console.log(`📝 Console [${msg.type()}]: ${msg.text()}`);
		});
	}

	async runScenario(scenario) {
		console.log(`\n🧪 Running Scenario: ${scenario.name}`);
		console.log(`📋 Description: ${scenario.description}`);

		const startTime = new Date();
		const errors = [];
		const screenshots = [];

		try {
			// Reset redirect tracking for this scenario
			this.redirects = [];
			this.logs = [];

			for (const step of scenario.steps) {
				console.log(`  ⚡ Step: ${step.description}`);

				try {
					await this.executeStep(step);

					// Take screenshot after each step
					const screenshotPath = `./auth-diagnosis-screenshots/step-${step.id}-${Date.now()}.png`;
					await this.page.screenshot({ path: screenshotPath });
					screenshots.push(screenshotPath);
				} catch (stepError) {
					console.error(`  ❌ Step failed: ${stepError.message}`);
					errors.push({
						stepId: step.id,
						error: stepError.message,
						timestamp: new Date()
					});

					// Take error screenshot
					const errorScreenshotPath = `./auth-diagnosis-screenshots/error-${step.id}-${Date.now()}.png`;
					await this.page.screenshot({ path: errorScreenshotPath });
					screenshots.push(errorScreenshotPath);
				}
			}

			const endTime = new Date();
			const result = new AuthTestResult({
				id: `result-${Date.now()}`,
				scenarioId: scenario.id,
				status: errors.length > 0 ? 'failed' : 'passed',
				startTime,
				endTime,
				duration: endTime - startTime,
				redirects: this.redirects,
				finalUrl: this.page.url(),
				errors,
				screenshots,
				logs: this.logs
			});

			this.results.push(result);

			// Immediate analysis
			this.analyzeResult(result);

			return result;
		} catch (error) {
			console.error(`💥 Scenario failed: ${error.message}`);
			const endTime = new Date();

			const result = new AuthTestResult({
				id: `result-${Date.now()}`,
				scenarioId: scenario.id,
				status: 'failed',
				startTime,
				endTime,
				duration: endTime - startTime,
				redirects: this.redirects,
				finalUrl: this.page.url(),
				errors: [{ error: error.message, timestamp: new Date() }],
				screenshots,
				logs: this.logs
			});

			this.results.push(result);
			this.analyzeResult(result);
			return result;
		}
	}

	async executeStep(step) {
		const timeout = step.timeout || 5000;

		switch (step.action) {
			case 'navigate':
				console.log(`    🧭 Navigating to: ${step.target}`);
				await this.page.goto(step.target, { waitUntil: 'networkidle', timeout });
				break;

			case 'wait':
				console.log(`    ⏳ Waiting for: ${step.target}`);
				if (step.target === 'body') {
					await this.page.waitForTimeout(step.timeout || 1000);
				} else {
					await this.page.waitForSelector(step.target, { timeout });
				}
				break;

			case 'fill':
				console.log(`    ✏️  Filling: ${step.target} = ${step.value}`);
				await this.page.fill(step.target, step.value, { timeout });
				break;

			case 'click':
				console.log(`    👆 Clicking: ${step.target}`);
				await this.page.click(step.target, { timeout });
				break;

			default:
				throw new Error(`Unknown action: ${step.action}`);
		}

		// Small delay to observe what happens
		await this.page.waitForTimeout(1000);
	}

	analyzeResult(result) {
		console.log(`\n📊 Analysis for ${result.scenarioId}:`);
		console.log(`   Status: ${result.status}`);
		console.log(`   Duration: ${result.duration}ms`);
		console.log(`   Final URL: ${result.finalUrl}`);
		console.log(`   Redirects: ${result.redirects.length}`);

		if (result.redirects.length > 0) {
			console.log(`   Redirect Pattern: ${result.getRedirectPattern()}`);
		}

		if (result.hasRedirectLoop()) {
			console.log(`   🚨 REDIRECT LOOP DETECTED!`);
		}

		if (result.errors.length > 0) {
			console.log(`   ❌ Errors: ${result.errors.length}`);
			result.errors.forEach((err) => {
				console.log(`      - ${err.error}`);
			});
		}

		// Check for common authentication issues
		this.detectAuthIssues(result);
	}

	detectAuthIssues(result) {
		const url = result.finalUrl;
		const logs = result.logs;

		// Check for JWT issues
		const jwtErrors = logs.filter(
			(log) =>
				log.text.includes('jwt') || log.text.includes('token') || log.text.includes('unauthorized')
		);

		if (jwtErrors.length > 0) {
			console.log(`   🔑 JWT/Token Issues Detected:`);
			jwtErrors.forEach((log) => {
				console.log(`      - ${log.text}`);
			});
		}

		// Check for CORS issues
		const corsErrors = logs.filter(
			(log) => log.text.includes('CORS') || log.text.includes('cross-origin')
		);

		if (corsErrors.length > 0) {
			console.log(`   🌐 CORS Issues Detected:`);
			corsErrors.forEach((log) => {
				console.log(`      - ${log.text}`);
			});
		}

		// Check if stuck on login page
		if (url.includes('/login') && result.redirects.length > 2) {
			console.log(
				`   🔄 Potential Login Loop: Stuck on login page after ${result.redirects.length} redirects`
			);
		}

		// Check for authentication redirect patterns
		const authRedirects = result.redirects.filter(
			(r) => r.url.includes('/login') || r.url.includes('/auth') || r.url.includes('/admin')
		);

		if (authRedirects.length > 1) {
			console.log(`   🔐 Authentication Redirect Pattern:`);
			authRedirects.forEach((redirect) => {
				console.log(`      - ${redirect.url} (${redirect.method})`);
			});
		}
	}

	async generateDiagnosisReport() {
		console.log(`\n📋 AUTHENTICATION DIAGNOSIS REPORT`);
		console.log(`==================================`);
		console.log(`Total Scenarios: ${this.results.length}`);
		console.log(`Passed: ${this.results.filter((r) => r.status === 'passed').length}`);
		console.log(`Failed: ${this.results.filter((r) => r.status === 'failed').length}`);

		const loopResults = this.results.filter((r) => r.hasRedirectLoop());
		if (loopResults.length > 0) {
			console.log(`\n🚨 REDIRECT LOOPS DETECTED: ${loopResults.length}`);
			loopResults.forEach((result) => {
				console.log(`   Scenario: ${result.scenarioId}`);
				console.log(`   Pattern: ${result.getRedirectPattern()}`);
			});
		}

		// Save detailed report
		const report = {
			timestamp: new Date().toISOString(),
			summary: {
				totalScenarios: this.results.length,
				passed: this.results.filter((r) => r.status === 'passed').length,
				failed: this.results.filter((r) => r.status === 'failed').length,
				redirectLoops: loopResults.length
			},
			results: this.results.map((r) => ({
				scenarioId: r.scenarioId,
				status: r.status,
				duration: r.duration,
				finalUrl: r.finalUrl,
				redirectCount: r.redirects.length,
				hasRedirectLoop: r.hasRedirectLoop(),
				redirectPattern: r.getRedirectPattern(),
				errors: r.errors,
				logs: r.logs
			}))
		};

		await fs.writeFile('./auth-diagnosis-report.json', JSON.stringify(report, null, 2));
		console.log(`\n📄 Detailed report saved to: auth-diagnosis-report.json`);
	}

	async cleanup() {
		if (this.browser) {
			await this.browser.close();
		}
	}
}

// Main execution
async function main() {
	try {
		// Load configuration
		const configData = await fs.readFile('./auth-diagnosis-config.json', 'utf8');
		const config = JSON.parse(configData);

		// Create directories for outputs
		await fs.mkdir('./auth-diagnosis-screenshots', { recursive: true });
		await fs.mkdir('./auth-diagnosis-videos', { recursive: true });

		const runner = new AuthDiagnosisRunner(config.testSuite);
		await runner.initialize();

		console.log(`🚀 Starting Authentication Diagnosis`);
		console.log(`Base URL: ${config.testSuite.baseUrl}`);
		console.log(`Scenarios: ${config.testSuite.scenarios.length}`);

		// Run each scenario
		for (const scenario of config.testSuite.scenarios) {
			await runner.runScenario(scenario);

			// Wait between scenarios
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		await runner.generateDiagnosisReport();
		await runner.cleanup();

		console.log(`\n✅ Authentication diagnosis complete!`);
	} catch (error) {
		console.error(`💥 Diagnosis failed: ${error.message}`);
		console.error(error.stack);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
