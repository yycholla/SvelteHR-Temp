// Stagehand Test Helper Utilities for SvelteHR
// AI-powered browser automation with natural language
// Created: 2025-10-27

import Stagehand from '@browserbasehq/stagehand';
import { z } from 'zod';
import { TEST_CONFIG } from './test-helpers';

// Stagehand configuration
export const STAGEHAND_CONFIG = {
	API_KEY: process.env.STAGEHAND_API_KEY || '',
	MODEL_PROVIDER: (process.env.STAGEHAND_MODEL_PROVIDER as 'openai' | 'anthropic') || 'openai',
	MODEL_NAME: process.env.STAGEHAND_MODEL_NAME || 'gpt-4o',
	BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174',
	ENABLE_CACHING: process.env.STAGEHAND_ENABLE_CACHING === 'true',
	DEBUG_DOM: process.env.STAGEHAND_DEBUG_DOM === 'true',
	HEADLESS: process.env.CI === 'true' || process.env.STAGEHAND_HEADLESS !== 'false',
	TIMEOUT: parseInt(process.env.STAGEHAND_TIMEOUT || '30000', 10)
} as const;

// Stagehand instance type
export type StagehandInstance = Awaited<ReturnType<typeof Stagehand.prototype.init>>;

/**
 * Initialize Stagehand instance with project defaults
 *
 * @example
 * const stagehand = await initStagehand();
 * const page = stagehand.page;
 * await page.goto('/dashboard');
 * await page.act("click on the employees tab");
 */
export async function initStagehand(
	options: {
		headless?: boolean;
		enableCaching?: boolean;
		debugDom?: boolean;
	} = {}
): Promise<Stagehand> {
	// Validate API key is set
	if (
		!STAGEHAND_CONFIG.API_KEY ||
		STAGEHAND_CONFIG.API_KEY === 'your-openai-or-anthropic-api-key-here'
	) {
		throw new Error(
			'STAGEHAND_API_KEY environment variable is not set. ' +
				'Please add your OpenAI or Anthropic API key to .env file. ' +
				'See .env.example for instructions.'
		);
	}

	const stagehand = new Stagehand({
		env: 'LOCAL',
		apiKey: STAGEHAND_CONFIG.API_KEY,
		modelName: STAGEHAND_CONFIG.MODEL_NAME,
		enableCaching: options.enableCaching ?? STAGEHAND_CONFIG.ENABLE_CACHING,
		headless: options.headless ?? STAGEHAND_CONFIG.HEADLESS,
		debugDom: options.debugDom ?? STAGEHAND_CONFIG.DEBUG_DOM,
		domSettleTimeoutMs: 1000
	});

	await stagehand.init();
	return stagehand;
}

/**
 * Navigate to a page with Stagehand
 *
 * @example
 * await gotoPage(stagehand, '/dashboard');
 */
export async function gotoPage(stagehand: Stagehand, path: string): Promise<void> {
	const url = path.startsWith('http') ? path : `${STAGEHAND_CONFIG.BASE_URL}${path}`;
	await stagehand.page.goto(url, { waitUntil: 'networkidle' });
}

/**
 * Extract data from page with type safety using Zod schema
 *
 * @example
 * const data = await extractData(stagehand, {
 *   instruction: "get the employee count",
 *   schema: z.object({ employeeCount: z.number() })
 * });
 */
export async function extractData<T extends z.ZodTypeAny>(
	stagehand: Stagehand,
	options: {
		instruction: string;
		schema: T;
	}
): Promise<z.infer<T>> {
	return await stagehand.page.extract({
		instruction: options.instruction,
		schema: options.schema
	});
}

/**
 * Perform an action using natural language
 *
 * @example
 * await performAction(stagehand, "click on the submit button");
 */
export async function performAction(stagehand: Stagehand, instruction: string): Promise<void> {
	await stagehand.page.act(instruction);
}

/**
 * Observe (preview) an action before performing it
 * Useful for debugging and understanding what the AI will do
 *
 * @example
 * const result = await observeAction(stagehand, "click the login button");
 * console.log('Will click element:', result.selector);
 */
export async function observeAction(
	stagehand: Stagehand,
	instruction: string
): Promise<{ selector: string; action: string }> {
	return await stagehand.page.observe(instruction);
}

/**
 * Wait for a condition using natural language
 *
 * @example
 * await waitForCondition(stagehand, "the dashboard data has loaded");
 */
export async function waitForCondition(
	stagehand: Stagehand,
	condition: string,
	timeout: number = STAGEHAND_CONFIG.TIMEOUT
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		try {
			// Use extract to check if condition is met
			const result = await stagehand.page.extract({
				instruction: `Check if ${condition}. Return true if yes, false if no.`,
				schema: z.object({
					conditionMet: z.boolean()
				})
			});

			if (result.conditionMet) {
				return;
			}
		} catch (error) {
			// Continue waiting
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Timeout waiting for condition: ${condition}`);
}

/**
 * Login helper using Stagehand natural language
 *
 * @example
 * await loginWithStagehand(stagehand, "admin@test.com", "admin123");
 */
export async function loginWithStagehand(
	stagehand: Stagehand,
	email: string,
	password: string
): Promise<void> {
	await gotoPage(stagehand, '/login');

	// Use natural language for login flow
	await performAction(stagehand, `enter "${email}" in the email field`);
	await performAction(stagehand, `enter "${password}" in the password field`);
	await performAction(stagehand, 'click the login button');

	// Wait for navigation to dashboard
	await stagehand.page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Extract table data with pagination support
 *
 * @example
 * const employees = await extractTableData(stagehand, {
 *   instruction: "extract all employee data from the table",
 *   schema: z.array(z.object({
 *     name: z.string(),
 *     department: z.string(),
 *     role: z.string()
 *   }))
 * });
 */
export async function extractTableData<T extends z.ZodTypeAny>(
	stagehand: Stagehand,
	options: {
		instruction: string;
		schema: T;
		paginated?: boolean;
	}
): Promise<z.infer<T>> {
	if (!options.paginated) {
		return await extractData(stagehand, options);
	}

	// Handle paginated tables
	const allData: any[] = [];
	let hasNextPage = true;

	while (hasNextPage) {
		const pageData = await extractData(stagehand, options);
		allData.push(...(Array.isArray(pageData) ? pageData : [pageData]));

		// Check if there's a next page button
		try {
			const nextPageExists = await stagehand.page.extract({
				instruction: 'Check if there is a "next page" or "next" button that is enabled',
				schema: z.object({
					hasNextPage: z.boolean()
				})
			});

			if (nextPageExists.hasNextPage) {
				await performAction(stagehand, 'click the next page button');
				await stagehand.page.waitForTimeout(1000); // Wait for data to load
			} else {
				hasNextPage = false;
			}
		} catch {
			hasNextPage = false;
		}
	}

	return allData as z.infer<T>;
}

/**
 * Clean up and close Stagehand instance
 *
 * @example
 * await cleanupStagehand(stagehand);
 */
export async function cleanupStagehand(stagehand: Stagehand): Promise<void> {
	try {
		await stagehand.close();
	} catch (error) {
		console.error('Error closing Stagehand:', error);
	}
}

/**
 * Common Zod schemas for SvelteHR data extraction
 */
export const CommonSchemas = {
	// Dashboard data
	dashboardSummary: z.object({
		employeeCount: z.number().describe('Total number of employees'),
		departmentCount: z.number().describe('Total number of departments'),
		activeReviews: z.number().optional().describe('Number of active performance reviews'),
		pendingLeaveRequests: z.number().optional().describe('Number of pending leave requests')
	}),

	// Employee data
	employee: z.object({
		id: z.string().optional(),
		firstName: z.string().describe('Employee first name'),
		lastName: z.string().describe('Employee last name'),
		email: z.string().email().describe('Employee email address'),
		department: z.string().describe('Department name'),
		role: z.string().describe('Job role or title'),
		status: z.enum(['active', 'inactive', 'on_leave']).optional()
	}),

	// Performance review
	performanceReview: z.object({
		reviewId: z.string().optional(),
		employeeName: z.string().describe('Name of employee being reviewed'),
		reviewType: z.string().describe('Type of review (e.g., quarterly, annual)'),
		status: z.enum(['draft', 'pending', 'completed']).describe('Review status'),
		rating: z.number().min(1).max(5).optional().describe('Performance rating'),
		reviewDate: z.string().optional().describe('Date of review')
	}),

	// Event data
	event: z.object({
		eventId: z.string().optional(),
		title: z.string().describe('Event title'),
		startDate: z.string().describe('Event start date and time'),
		endDate: z.string().describe('Event end date and time'),
		description: z.string().optional().describe('Event description'),
		attendeeCount: z.number().optional().describe('Number of attendees'),
		rsvpStatus: z.enum(['going', 'not_going', 'maybe', 'pending']).optional()
	}),

	// Form validation error
	formError: z.object({
		fieldName: z.string().describe('Name of the field with error'),
		errorMessage: z.string().describe('Error message displayed'),
		hasError: z.boolean().describe('Whether the error is currently displayed')
	}),

	// Generic success/error state
	operationResult: z.object({
		success: z.boolean().describe('Whether the operation succeeded'),
		message: z.string().optional().describe('Success or error message displayed'),
		redirected: z.boolean().optional().describe('Whether page redirected after operation')
	})
};

/**
 * Type-safe wrapper for common SvelteHR page interactions
 */
export class StagehandPageHelpers {
	constructor(private stagehand: Stagehand) {}

	/**
	 * Navigate to dashboard and extract summary data
	 */
	async getDashboardSummary() {
		await gotoPage(this.stagehand, '/dashboard');
		return await extractData(this.stagehand, {
			instruction:
				'Extract the dashboard summary showing employee count, department count, and other metrics',
			schema: CommonSchemas.dashboardSummary
		});
	}

	/**
	 * Search for employees by name or department
	 */
	async searchEmployees(query: string) {
		await gotoPage(this.stagehand, '/dashboard/employees/directory');
		await performAction(this.stagehand, `search for "${query}" in the employee directory`);
		await this.stagehand.page.waitForTimeout(1000); // Wait for results

		return await extractData(this.stagehand, {
			instruction: 'Extract all employee information from the search results',
			schema: z.array(CommonSchemas.employee)
		});
	}

	/**
	 * Submit a form and check for validation errors
	 */
	async submitFormWithValidation(formDescription: string) {
		await performAction(this.stagehand, `fill out the ${formDescription} form`);
		await performAction(this.stagehand, 'submit the form');

		// Check for validation errors
		return await extractData(this.stagehand, {
			instruction: 'Check if there are any form validation errors displayed',
			schema: z.object({
				hasErrors: z.boolean(),
				errors: z.array(CommonSchemas.formError).optional()
			})
		});
	}

	/**
	 * Wait for data to load and verify it's not placeholder content
	 */
	async verifyRealData(dataDescription: string) {
		return await extractData(this.stagehand, {
			instruction: `Check if the ${dataDescription} contains real data (not placeholder text like "Lorem ipsum", "Sample data", or "Test data")`,
			schema: z.object({
				hasRealData: z.boolean().describe('True if real data is displayed'),
				containsPlaceholders: z.boolean().describe('True if placeholder text is found'),
				dataCount: z.number().optional().describe('Number of data items displayed')
			})
		});
	}
}

// Export helper factory
export function createStagehandHelpers(stagehand: Stagehand): StagehandPageHelpers {
	return new StagehandPageHelpers(stagehand);
}

// Default export for convenience
export default {
	initStagehand,
	gotoPage,
	extractData,
	performAction,
	observeAction,
	waitForCondition,
	loginWithStagehand,
	extractTableData,
	cleanupStagehand,
	createStagehandHelpers,
	CommonSchemas,
	STAGEHAND_CONFIG
};
