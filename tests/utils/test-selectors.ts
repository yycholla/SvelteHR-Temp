// Centralized Test Selectors
// Provides type-safe data-testid selectors for Puppeteer E2E tests
// Based on contract: specs/039-puppeteer-build-out/contracts/test-selectors.contract.ts

/**
 * Centralized data-testid selector definitions.
 *
 * Naming Convention: [page]-[component]-[action]
 * Examples:
 * - dashboard-attendance-metric
 * - employee-list-container
 * - login-form-submit
 */

export const SELECTORS = {
	// Dashboard page selectors
	dashboard: {
		attendanceMetric: '[data-testid="dashboard-attendance-metric"]',
		tasksMetric: '[data-testid="dashboard-tasks-metric"]',
		leaveRequestsMetric: '[data-testid="dashboard-leave-requests-metric"]',
		eventsMetric: '[data-testid="dashboard-events-metric"]',
		recentActivity: '[data-testid="dashboard-recent-activity"]',
		upcomingEvents: '[data-testid="dashboard-upcoming-events"]',
		pendingApprovals: '[data-testid="dashboard-pending-approvals"]'
	},

	// Employee directory selectors
	employees: {
		listContainer: '[data-testid="employee-list-container"]',
		card: '[data-testid="employee-card"]',
		searchInput: '[data-testid="employee-search-input"]',
		filterDropdown: '[data-testid="employee-filter-dropdown"]',
		departmentFilter: '[data-testid="employee-department-filter"]',
		statusFilter: '[data-testid="employee-status-filter"]',
		addButton: '[data-testid="employee-add-button"]',
		pagination: '[data-testid="employee-pagination"]'
	},

	// Authentication selectors
	auth: {
		loginForm: '[data-testid="login-form"]',
		usernameInput: '[data-testid="login-username-input"]',
		passwordInput: '[data-testid="login-password-input"]',
		submitButton: '[data-testid="login-submit-button"]',
		logoutButton: '[data-testid="logout-button"]',
		errorMessage: '[data-testid="login-error-message"]',
		rememberMe: '[data-testid="login-remember-me"]'
	},

	// Navigation selectors
	navigation: {
		dashboard: '[data-testid="nav-dashboard"]',
		employees: '[data-testid="nav-employees"]',
		hr: '[data-testid="nav-hr"]',
		admin: '[data-testid="nav-admin"]',
		events: '[data-testid="nav-events"]',
		tasks: '[data-testid="nav-tasks"]',
		profile: '[data-testid="nav-profile"]',
		settings: '[data-testid="nav-settings"]'
	},

	// HR workflow selectors
	hr: {
		leaveRequestsTable: '[data-testid="hr-leave-requests-table"]',
		approveButton: '[data-testid="hr-approve-button"]',
		rejectButton: '[data-testid="hr-reject-button"]',
		reportsPage: '[data-testid="hr-reports-page"]',
		attendanceTab: '[data-testid="hr-attendance-tab"]',
		performanceTab: '[data-testid="hr-performance-tab"]',
		leaveBalanceCard: '[data-testid="hr-leave-balance-card"]'
	},

	// Admin selectors
	admin: {
		userManagementTable: '[data-testid="admin-user-management-table"]',
		addUserButton: '[data-testid="admin-add-user-button"]',
		editUserButton: '[data-testid="admin-edit-user-button"]',
		deleteUserButton: '[data-testid="admin-delete-user-button"]',
		rolesTab: '[data-testid="admin-roles-tab"]',
		permissionsTab: '[data-testid="admin-permissions-tab"]',
		settingsTab: '[data-testid="admin-settings-tab"]'
	},

	// Events selectors
	events: {
		calendar: '[data-testid="events-calendar"]',
		eventCard: '[data-testid="event-card"]',
		rsvpButton: '[data-testid="event-rsvp-button"]',
		detailsModal: '[data-testid="event-details-modal"]',
		createButton: '[data-testid="event-create-button"]',
		attendeesList: '[data-testid="event-attendees-list"]',
		rsvpStatus: '[data-testid="event-rsvp-status"]'
	},

	// Tasks selectors
	tasks: {
		taskList: '[data-testid="tasks-list"]',
		taskCard: '[data-testid="task-card"]',
		addTaskButton: '[data-testid="tasks-add-button"]',
		statusDropdown: '[data-testid="task-status-dropdown"]',
		priorityBadge: '[data-testid="task-priority-badge"]',
		assigneeAvatar: '[data-testid="task-assignee-avatar"]',
		dueDateLabel: '[data-testid="task-due-date"]'
	},

	// Form selectors
	forms: {
		submitButton: '[data-testid="form-submit-button"]',
		cancelButton: '[data-testid="form-cancel-button"]',
		validationError: '[data-testid="form-validation-error"]',
		loadingSpinner: '[data-testid="form-loading-spinner"]',
		successMessage: '[data-testid="form-success-message"]'
	},

	// Common UI elements
	common: {
		loadingSpinner: '[data-testid="loading-spinner"]',
		errorBoundary: '[data-testid="error-boundary"]',
		toast: '[data-testid="toast-notification"]',
		modal: '[data-testid="modal"]',
		confirmDialog: '[data-testid="confirm-dialog"]',
		searchInput: '[data-testid="search-input"]',
		filterButton: '[data-testid="filter-button"]',
		exportButton: '[data-testid="export-button"]'
	}
} as const;

/**
 * Helper functions for dynamic selectors
 */

export function getEmployeeCard(employeeId: string): string {
	return `[data-testid="employee-card-${employeeId}"]`;
}

export function getEventCard(eventId: string): string {
	return `[data-testid="event-card-${eventId}"]`;
}

export function getTaskCard(taskId: string): string {
	return `[data-testid="task-card-${taskId}"]`;
}

export function getDepartmentCard(departmentId: string): string {
	return `[data-testid="department-card-${departmentId}"]`;
}

export function getLeaveRequestRow(requestId: string): string {
	return `[data-testid="leave-request-row-${requestId}"]`;
}

/**
 * Selector builder for table rows
 */
export function getTableRow(tableName: string, rowIndex: number): string {
	return `[data-testid="${tableName}-row-${rowIndex}"]`;
}

/**
 * Selector builder for form fields
 */
export function getFormField(formName: string, fieldName: string): string {
	return `[data-testid="${formName}-field-${fieldName}"]`;
}

/**
 * Type exports for type-safe selector access
 */
export type SelectorKeys = keyof typeof SELECTORS;
export type DashboardSelectors = typeof SELECTORS.dashboard;
export type EmployeeSelectors = typeof SELECTORS.employees;
export type AuthSelectors = typeof SELECTORS.auth;
export type NavigationSelectors = typeof SELECTORS.navigation;
export type HRSelectors = typeof SELECTORS.hr;
export type AdminSelectors = typeof SELECTORS.admin;
export type EventSelectors = typeof SELECTORS.events;
export type TaskSelectors = typeof SELECTORS.tasks;
export type FormSelectors = typeof SELECTORS.forms;
export type CommonSelectors = typeof SELECTORS.common;
