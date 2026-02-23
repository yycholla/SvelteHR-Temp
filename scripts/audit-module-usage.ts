/**
 * Module Usage Audit Script
 *
 * Detects violations of hexagonal architecture in SvelteKit routes.
 * Routes should use service layer (e.g., createTaskService) instead of
 * direct GraphQL clients.
 */

/**
 * Represents a route file analysis result
 */
export interface RouteViolation {
	/** File path of the route */
	path: string;
	/** Module name (PascalCase) detected from path */
	module: string;
	/** Whether the route violates hexagonal architecture */
	isViolation: boolean;
	/** Types of violations detected (e.g., 'direct-import', 'inline-query') */
	violationType: string[];
	/** Helpful suggestion for fixing the violation */
	suggestion: string;
}

/**
 * Detects if code contains violations (direct GraphQL usage instead of service layer)
 *
 * @param code - Source code to analyze
 * @returns true if violations detected, false otherwise
 */
export function isViolation(code: string): boolean {
	if (!code || code.trim() === '') {
		return false;
	}

	// Patterns that indicate direct GraphQL usage (violations)
	const violationPatterns = [
		// Direct GraphQL client imports
		/import\s+{[^}]*\bclient\b[^}]*}\s+from\s+['"].*graphql\/client['"]/,
		/import\s+{[^}]*\bjwtGraphQLClient\b[^}]*}\s+from\s+['"].*graphql\/jwt-client['"]/,

		// Inline GraphQL query definitions (backticks, single, or double quotes)
		// Matches: const/let GET_* = `query...` or "query..." or 'query...'
		/(?:const|let|var)\s+GET_\w+\s*=\s*[`"'](?:query|mutation|subscription)/i,

		// GraphQL query definitions without GET_ prefix
		/(?:const|let|var)\s+\w+(?:Query|Mutation|Subscription)\s*=\s*[`"'](?:query|mutation|subscription)/i
	];

	return violationPatterns.some((pattern) => pattern.test(code));
}

/**
 * Map of kebab-case route names to PascalCase module names
 */
const MODULE_NAME_MAP: Record<string, string> = {
	tasks: 'Task',
	events: 'Event',
	employees: 'Employee',
	departments: 'Department',
	training: 'Training',
	goals: 'Goal',
	'performance-reviews': 'PerformanceReview',
	onboarding: 'Onboarding',
	documents: 'Document',
	attendance: 'Attendance',
	notifications: 'Notification',
	'time-off-balance': 'TimeOffBalance',
	compensation: 'Compensation',
	'hr-reports': 'HrReport',
	'emergency-contacts': 'EmergencyContact',
	vehicles: 'Vehicle',
	skills: 'Skill',
	certifications: 'Certification',
	'user-settings': 'UserSetting',
	compliance: 'Compliance',
	'activity-logs': 'ActivityLog',
	'audit-log': 'AuditLog',
	reviews: 'PerformanceReview', // Alias for performance-reviews
	leave: 'LeaveRequest' // Leave management
};

/**
 * Extracts module name from file path
 *
 * @param filePath - Path to route file (e.g., src/routes/dashboard/tasks/+page.server.ts)
 * @returns Module name in PascalCase (e.g., "Task") or "Unknown"
 */
export function detectModule(filePath: string): string {
	// Extract path segments
	const segments = filePath.split('/');

	// Look for dashboard routes: src/routes/dashboard/{module}/...
	const dashboardIndex = segments.indexOf('dashboard');
	if (dashboardIndex >= 0 && dashboardIndex + 1 < segments.length) {
		const moduleName = segments[dashboardIndex + 1];

		// Check if it's a known module
		if (MODULE_NAME_MAP[moduleName]) {
			return MODULE_NAME_MAP[moduleName];
		}
	}

	return 'Unknown';
}

/**
 * Helper function to convert module name to service factory name
 * E.g., "Task" -> "createTaskService", "PerformanceReview" -> "createPerformanceReviewService"
 */
function getServiceFactoryName(moduleName: string): string {
	if (moduleName === 'Unknown') {
		return 'the appropriate service layer factory';
	}
	return `create${moduleName}Service`;
}

/**
 * Detects specific violation types in code
 */
function detectViolationTypes(code: string): string[] {
	const types: string[] = [];

	// Check for direct GraphQL client imports
	const hasDirectImport =
		/import\s+{[^}]*\bclient\b[^}]*}\s+from\s+['"].*graphql\/client['"]/.test(code) ||
		/import\s+{[^}]*\bjwtGraphQLClient\b[^}]*}\s+from\s+['"].*graphql\/jwt-client['"]/.test(code);

	if (hasDirectImport) {
		types.push('direct-import');
	}

	// Check for inline GraphQL queries
	const hasInlineQuery =
		/(?:const|let|var)\s+GET_\w+\s*=\s*[`"'](?:query|mutation|subscription)/i.test(code) ||
		/(?:const|let|var)\s+\w+(?:Query|Mutation|Subscription)\s*=\s*[`"'](?:query|mutation|subscription)/i.test(
			code
		);

	if (hasInlineQuery) {
		types.push('inline-query');
	}

	return types;
}

/**
 * Generates a helpful suggestion based on module and violation types
 */
function generateSuggestion(moduleName: string, violationTypes: string[]): string {
	if (violationTypes.length === 0) {
		return '';
	}

	const serviceFactory = getServiceFactoryName(moduleName);
	const suggestions: string[] = [];

	if (violationTypes.includes('direct-import')) {
		suggestions.push(
			`Replace direct GraphQL client imports with: import { ${serviceFactory} } from '$lib/server/services'`
		);
	}

	if (violationTypes.includes('inline-query')) {
		suggestions.push(
			`Remove inline GraphQL queries and use ${serviceFactory} from the service layer instead`
		);
	}

	if (suggestions.length === 0) {
		return `Use ${serviceFactory} from the service layer instead of direct GraphQL access.`;
	}

	return suggestions.join('. ');
}

/**
 * Scans a route file and categorizes it as compliant or violation
 *
 * @param filePath - Path to the route file
 * @param content - Content of the route file
 * @returns RouteViolation object with analysis results
 */
export function scanRouteFile(filePath: string, content: string): RouteViolation {
	const module = detectModule(filePath);
	const hasViolation = isViolation(content);
	const violationTypes = hasViolation ? detectViolationTypes(content) : [];
	const suggestion = hasViolation ? generateSuggestion(module, violationTypes) : '';

	return {
		path: filePath,
		module,
		isViolation: hasViolation,
		violationType: violationTypes,
		suggestion
	};
}
