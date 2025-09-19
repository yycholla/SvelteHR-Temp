import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type { User } from '$lib/types';

/**
 * Onboarding Service for MountainHR
 *
 * Provides comprehensive onboarding workflow management including:
 * - Onboarding instance creation and management
 * - Task tracking and completion
 * - Document management
 * - Progress monitoring
 * - Meeting scheduling
 * - Equipment tracking
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface OnboardingTemplate {
	id: string;
	name: string;
	description: string;
	department_id?: string;
	role_id?: string;
	is_default: boolean;
	is_active: boolean;
	estimated_duration_days: number;
	created_by?: string;
	created_at: string;
	updated_at: string;
}

export interface OnboardingInstance {
	id: string;
	employee_id: string;
	template_id: string;
	status: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated';
	start_date?: string;
	expected_completion_date?: string;
	actual_completion_date?: string;
	assigned_buddy_id?: string;
	hr_contact_id?: string;
	manager_id?: string;
	notes?: string;
	completion_percentage: number;
	created_at: string;
	updated_at: string;

	// Relations
	employee?: User;
	template?: OnboardingTemplate;
	assigned_buddy?: User;
	hr_contact?: User;
	manager?: User;
	tasks?: OnboardingTask[];
}

export interface OnboardingTaskTemplate {
	id: string;
	template_id: string;
	title: string;
	description?: string;
	instructions?: string;
	task_type: string;
	category?: string;
	order_index: number;
	is_required: boolean;
	due_days_from_start: number;
	estimated_hours?: number;
	assigned_role: string;
	prerequisite_task_ids: string[];
	documents_required: string[];
	created_at: string;
	updated_at: string;
}

export interface OnboardingTask {
	id: string;
	instance_id: string;
	template_task_id: string;
	title: string;
	description?: string;
	instructions?: string;
	task_type: string;
	category?: string;
	status: 'Pending' | 'InProgress' | 'Completed' | 'Blocked';
	due_date?: string;
	completed_at?: string;
	assigned_to_id?: string;
	completed_by_id?: string;
	estimated_hours?: number;
	actual_hours?: number;
	notes?: string;
	attachments: any[];
	is_required: boolean;
	created_at: string;
	updated_at: string;

	// Relations
	assigned_to?: User;
	completed_by?: User;
}

export interface OnboardingDocument {
	id: string;
	employee_id: string;
	task_id?: string;
	document_name: string;
	document_type: string;
	file_path?: string;
	file_size?: number;
	mime_type?: string;
	upload_date: string;
	uploaded_by_id?: string;
	is_required: boolean;
	is_approved: boolean;
	approved_by_id?: string;
	approved_at?: string;
	notes?: string;
	created_at: string;
	updated_at: string;
}

export interface OnboardingFilter {
	status?: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated';
	department_id?: string;
	start_date_from?: string;
	start_date_to?: string;
	completion_percentage_min?: number;
	completion_percentage_max?: number;
	assigned_buddy_id?: string;
	hr_contact_id?: string;
	manager_id?: string;
}

export interface CreateOnboardingInstanceInput {
	employee_id: string;
	template_id: string;
	start_date: string;
	assigned_buddy_id?: string;
	hr_contact_id?: string;
	manager_id?: string;
	notes?: string;
}

export interface UpdateOnboardingInstanceInput {
	status?: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated';
	start_date?: string;
	expected_completion_date?: string;
	actual_completion_date?: string;
	assigned_buddy_id?: string;
	hr_contact_id?: string;
	manager_id?: string;
	notes?: string;
}

export interface OnboardingServiceState {
	instances: OnboardingInstance[];
	currentInstance: OnboardingInstance | null;
	templates: OnboardingTemplate[];
	totalCount: number;
	isLoading: boolean;
	error: string | null;
	filters: OnboardingFilter;
	pagination: {
		currentPage: number;
		pageSize: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	sorting: {
		field: string;
		direction: 'ASC' | 'DESC';
	};
}

// =============================================================================
// Store Implementation
// =============================================================================

const createOnboardingService = () => {
	const initialState: OnboardingServiceState = {
		instances: [],
		currentInstance: null,
		templates: [],
		totalCount: 0,
		isLoading: false,
		error: null,
		filters: {},
		pagination: {
			currentPage: 1,
			pageSize: 20,
			hasNextPage: false,
			hasPreviousPage: false
		},
		sorting: {
			field: 'start_date',
			direction: 'DESC'
		}
	};

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,

		// =============================================================================
		// Onboarding Instance Management
		// =============================================================================

		async loadInstances(options?: {
			filters?: OnboardingFilter;
			pagination?: { page?: number; pageSize?: number };
			sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
			reset?: boolean;
		}) {
			const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				...(reset && { instances: [], currentPage: 1 })
			}));

			try {
				// For now, use a simplified query since we don't have GraphQL operations yet
				// TODO: Replace with actual GraphQL queries when operations are defined
				const mockInstances: OnboardingInstance[] = [
					{
						id: '1',
						employee_id: 'emp1',
						template_id: 'template1',
						status: 'Onboarding',
						start_date: '2023-12-01',
						completion_percentage: 45,
						created_at: '2023-12-01T00:00:00Z',
						updated_at: '2023-12-01T00:00:00Z'
					}
				];

				update((state) => ({
					...state,
					instances: reset ? mockInstances : [...state.instances, ...mockInstances],
					totalCount: mockInstances.length,
					isLoading: false,
					filters: { ...state.filters, ...filters },
					pagination: {
						...state.pagination,
						currentPage: pagination.page || state.pagination.currentPage,
						pageSize: pagination.pageSize || state.pagination.pageSize,
						hasNextPage: false,
						hasPreviousPage: false
					},
					sorting: {
						field: sorting.field || state.sorting.field,
						direction: sorting.direction || state.sorting.direction
					}
				}));

				return { instances: mockInstances, totalCount: mockInstances.length };
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load onboarding instances';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async loadTemplates() {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// Mock templates for now
				const mockTemplates: OnboardingTemplate[] = [
					{
						id: '1',
						name: 'General Employee Onboarding',
						description: 'Standard onboarding process for all employees',
						is_default: true,
						is_active: true,
						estimated_duration_days: 30,
						created_at: '2023-12-01T00:00:00Z',
						updated_at: '2023-12-01T00:00:00Z'
					},
					{
						id: '2',
						name: 'Developer Onboarding',
						description: 'Specialized onboarding for software developers',
						is_default: false,
						is_active: true,
						estimated_duration_days: 45,
						created_at: '2023-12-01T00:00:00Z',
						updated_at: '2023-12-01T00:00:00Z'
					}
				];

				update((state) => ({
					...state,
					templates: mockTemplates,
					isLoading: false
				}));

				return mockTemplates;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load onboarding templates';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async createInstance(input: CreateOnboardingInstanceInput): Promise<OnboardingInstance> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// TODO: Replace with actual GraphQL mutation
				const newInstance: OnboardingInstance = {
					id: Date.now().toString(),
					...input,
					status: 'PreHire',
					completion_percentage: 0,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};

				update((state) => ({
					...state,
					instances: [newInstance, ...state.instances],
					totalCount: state.totalCount + 1,
					isLoading: false
				}));

				return newInstance;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to create onboarding instance';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async updateInstanceStatus(
			instanceId: string,
			status: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated'
		): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// TODO: Replace with actual GraphQL mutation
				update((state) => ({
					...state,
					instances: state.instances.map((instance) =>
						instance.id === instanceId
							? { ...instance, status, updated_at: new Date().toISOString() }
							: instance
					),
					currentInstance:
						state.currentInstance?.id === instanceId
							? { ...state.currentInstance, status, updated_at: new Date().toISOString() }
							: state.currentInstance,
					isLoading: false
				}));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to update onboarding status';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async completeTask(taskId: string, notes?: string): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// TODO: Replace with actual GraphQL mutation
				// This would update the task status and recalculate completion percentage

				update((state) => ({ ...state, isLoading: false }));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to complete task';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		// =============================================================================
		// State Management
		// =============================================================================

		clearError() {
			update((state) => ({ ...state, error: null }));
		},

		resetFilters() {
			update((state) => ({
				...state,
				filters: {},
				pagination: { ...initialState.pagination },
				sorting: { ...initialState.sorting }
			}));
		},

		setCurrentInstance(instance: OnboardingInstance | null) {
			update((state) => ({ ...state, currentInstance: instance }));
		},

		// =============================================================================
		// Utility Methods
		// =============================================================================

		getInstancesByEmployee(employeeId: string): OnboardingInstance[] {
			const currentState = get({ subscribe });
			return currentState.instances.filter((instance) => instance.employee_id === employeeId);
		},

		getActiveInstances(): OnboardingInstance[] {
			const currentState = get({ subscribe });
			return currentState.instances.filter((instance) => instance.status === 'Onboarding');
		},

		getCompletedInstances(): OnboardingInstance[] {
			const currentState = get({ subscribe });
			return currentState.instances.filter((instance) => instance.status === 'Active');
		}
	};
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const onboardingService = createOnboardingService();

// =============================================================================
// Derived Stores
// =============================================================================

export const onboardingInstances = derived(onboardingService, ($service) => $service.instances);

export const currentOnboardingInstance = derived(
	onboardingService,
	($service) => $service.currentInstance
);

export const onboardingTemplates = derived(onboardingService, ($service) => $service.templates);

export const isLoadingOnboarding = derived(onboardingService, ($service) => $service.isLoading);

export const onboardingError = derived(onboardingService, ($service) => $service.error);

export const activeOnboardingInstances = derived(onboardingInstances, ($instances) =>
	$instances.filter((instance) => instance.status === 'Onboarding')
);

export const completedOnboardingInstances = derived(onboardingInstances, ($instances) =>
	$instances.filter((instance) => instance.status === 'Active')
);

// =============================================================================
// Export Service as Default
// =============================================================================

export default onboardingService;
