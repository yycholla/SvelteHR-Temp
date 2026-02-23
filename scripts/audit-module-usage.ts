/**
 * Module Usage Audit Script
 *
 * Detects violations of hexagonal architecture in SvelteKit routes.
 * Routes should use service layer (e.g., createTaskService) instead of
 * direct GraphQL clients.
 */

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
