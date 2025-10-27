// Test Selector Contract
// Defines TypeScript types for all data-testid selectors used in Puppeteer tests
// Status: Template - Requires Implementation

/**
 * Centralized data-testid selector definitions for Puppeteer E2E tests.
 *
 * Naming Convention: [page]-[component]-[action]
 *
 * Examples:
 * - dashboard-attendance-metric
 * - employee-list-container
 * - employee-card
 * - login-form-submit
 * - nav-dashboard
 */

export const SELECTORS = {
  // Dashboard page selectors
  dashboard: {
    attendanceMetric: '[data-testid="dashboard-attendance-metric"]',
    tasksMetric: '[data-testid="dashboard-tasks-metric"]',
    leaveRequestsMetric: '[data-testid="dashboard-leave-requests-metric"]',
    eventsMetric: '[data-testid="dashboard-events-metric"]',
    recentActivity: '[data-testid="dashboard-recent-activity"]',
    // TO BE EXPANDED
  },

  // Employee directory selectors
  employees: {
    listContainer: '[data-testid="employee-list-container"]',
    card: '[data-testid="employee-card"]',
    searchInput: '[data-testid="employee-search-input"]',
    filterDropdown: '[data-testid="employee-filter-dropdown"]',
    // TO BE EXPANDED
  },

  // Authentication selectors
  auth: {
    loginForm: '[data-testid="login-form"]',
    usernameInput: '[data-testid="login-username-input"]',
    passwordInput: '[data-testid="login-password-input"]',
    submitButton: '[data-testid="login-submit-button"]',
    logoutButton: '[data-testid="logout-button"]',
    // TO BE EXPANDED
  },

  // Navigation selectors
  navigation: {
    dashboard: '[data-testid="nav-dashboard"]',
    employees: '[data-testid="nav-employees"]',
    hr: '[data-testid="nav-hr"]',
    admin: '[data-testid="nav-admin"]',
    events: '[data-testid="nav-events"]',
    tasks: '[data-testid="nav-tasks"]',
    // TO BE EXPANDED
  },

  // HR workflow selectors
  hr: {
    leaveRequestsTable: '[data-testid="hr-leave-requests-table"]',
    approveButton: '[data-testid="hr-approve-button"]',
    rejectButton: '[data-testid="hr-reject-button"]',
    reportsPage: '[data-testid="hr-reports-page"]',
    // TO BE EXPANDED
  },

  // Admin selectors
  admin: {
    userManagementTable: '[data-testid="admin-user-management-table"]',
    addUserButton: '[data-testid="admin-add-user-button"]',
    editUserButton: '[data-testid="admin-edit-user-button"]',
    deleteUserButton: '[data-testid="admin-delete-user-button"]',
    // TO BE EXPANDED
  },

  // Events selectors
  events: {
    calendar: '[data-testid="events-calendar"]',
    eventCard: '[data-testid="event-card"]',
    rsvpButton: '[data-testid="event-rsvp-button"]',
    detailsModal: '[data-testid="event-details-modal"]',
    // TO BE EXPANDED
  },

  // Tasks selectors
  tasks: {
    taskList: '[data-testid="tasks-list"]',
    taskCard: '[data-testid="task-card"]',
    addTaskButton: '[data-testid="tasks-add-button"]',
    statusDropdown: '[data-testid="task-status-dropdown"]',
    // TO BE EXPANDED
  },

  // Form selectors
  forms: {
    submitButton: '[data-testid="form-submit-button"]',
    cancelButton: '[data-testid="form-cancel-button"]',
    validationError: '[data-testid="form-validation-error"]',
    // TO BE EXPANDED
  },
} as const;

/**
 * Helper function for dynamic selectors (e.g., employee cards with IDs)
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

/**
 * Type-safe selector access
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
