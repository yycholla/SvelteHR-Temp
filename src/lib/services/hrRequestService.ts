import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type {
	HRRequest,
	User,
	PaginationInput,
	SortInput,
	FilterInput,
	Connection,
	HRRequestType,
	HRRequestStatus,
	HRRequestPriority,
	Document
} from '$lib/types';
import {
	GET_HR_REQUESTS_QUERY,
	GET_HR_REQUEST_DETAILS_QUERY,
	CREATE_HR_REQUEST_MUTATION,
	UPDATE_HR_REQUEST_MUTATION,
	PROCESS_HR_REQUEST_MUTATION,
	ASSIGN_HR_REQUEST_MUTATION,
	UPLOAD_HR_DOCUMENT_MUTATION,
	GET_HR_REQUEST_ANALYTICS_QUERY,
	SUBSCRIBE_HR_REQUEST_UPDATES,
	buildPaginationVariables,
	buildSortVariables,
	buildFilterVariables,
	extractEdges,
	extractPageInfo
} from '$lib/graphql/operations';

/**
 * HR Request Management Service for MountainHR
 *
 * Provides comprehensive HR request management including:
 * - Request submission and tracking
 * - Approval workflow management
 * - Document attachment handling
 * - Analytics and reporting
 * - Real-time status updates
 * - SLA monitoring
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface HRRequestFilter {
	status?: HRRequestStatus[];
	type?: HRRequestType[];
	priority?: HRRequestPriority[];
	requesterId?: string;
	assigneeId?: string;
	departmentId?: string;
	dateRange?: {
		start?: string;
		end?: string;
	};
	searchQuery?: string;
	isOverdue?: boolean;
	requiresApproval?: boolean;
}

export interface CreateHRRequestInput {
	type: HRRequestType;
	title: string;
	description: string;
	priority: HRRequestPriority;
	departmentId?: string;
	requestedFor?: string; // Employee ID if requesting for someone else
	dueDate?: string;
	additionalData?: Record<string, any>; // Type-specific data
	attachments?: string[]; // Document IDs
}

export interface UpdateHRRequestInput {
	title?: string;
	description?: string;
	priority?: HRRequestPriority;
	dueDate?: string;
	additionalData?: Record<string, any>;
	attachments?: string[];
}

export interface ProcessHRRequestInput {
	action: 'approve' | 'reject' | 'complete' | 'cancel' | 'request_info';
	comment?: string;
	nextAssignee?: string;
	additionalData?: Record<string, any>;
}

export interface HRRequestServiceState {
	requests: HRRequest[];
	currentRequest: HRRequest | null;
	myRequests: HRRequest[];
	assignedRequests: HRRequest[];
	totalCount: number;
	isLoading: boolean;
	error: string | null;
	filters: HRRequestFilter;
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
	subscriptions: {
		updates: boolean;
	};
}

// =============================================================================
// Store Implementation
// =============================================================================

const createHRRequestService = () => {
	const initialState: HRRequestServiceState = {
		requests: [],
		currentRequest: null,
		myRequests: [],
		assignedRequests: [],
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
			field: 'createdAt',
			direction: 'DESC'
		},
		subscriptions: {
			updates: false
		}
	};

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,

		// =============================================================================
		// Request Listing and Search
		// =============================================================================

		async loadHRRequests(options?: {
			filters?: HRRequestFilter;
			pagination?: { page?: number; pageSize?: number };
			sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
			reset?: boolean;
		}) {
			const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				...(reset && { requests: [], currentPage: 1 })
			}));

			try {
				const currentState = get({ subscribe });

				const variables = {
					...buildFilterVariables(filters),
					...buildPaginationVariables(
						pagination.page || currentState.pagination.currentPage,
						pagination.pageSize || currentState.pagination.pageSize
					),
					...buildSortVariables(
						sorting.field || currentState.sorting.field,
						sorting.direction || currentState.sorting.direction
					)
				};

				const result = await client.query(GET_HR_REQUESTS_QUERY, variables).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load HR requests');
				}

				const requests = extractEdges<HRRequest>(result.data.hrRequests);
				const pageInfo = extractPageInfo(result.data.hrRequests);

				update((state) => ({
					...state,
					requests: reset ? requests : [...state.requests, ...requests],
					totalCount: result.data.hrRequests.totalCount,
					isLoading: false,
					filters: { ...state.filters, ...filters },
					pagination: {
						...state.pagination,
						currentPage: pagination.page || state.pagination.currentPage,
						pageSize: pagination.pageSize || state.pagination.pageSize,
						hasNextPage: pageInfo.hasNextPage,
						hasPreviousPage: pageInfo.hasPreviousPage
					},
					sorting: {
						field: sorting.field || state.sorting.field,
						direction: sorting.direction || state.sorting.direction
					}
				}));

				return { requests, totalCount: result.data.hrRequests.totalCount };
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load HR requests';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async loadMyRequests() {
			return this.loadHRRequests({
				filters: { requesterId: 'current_user' }, // Server will resolve current user
				reset: true
			});
		},

		async loadAssignedRequests() {
			return this.loadHRRequests({
				filters: { assigneeId: 'current_user' }, // Server will resolve current user
				reset: true
			});
		},

		async searchHRRequests(query: string) {
			return this.loadHRRequests({
				filters: { searchQuery: query },
				reset: true
			});
		},

		async filterHRRequests(filters: HRRequestFilter) {
			return this.loadHRRequests({
				filters,
				pagination: { page: 1 },
				reset: true
			});
		},

		async sortHRRequests(field: string, direction: 'ASC' | 'DESC' = 'DESC') {
			return this.loadHRRequests({
				sorting: { field, direction },
				pagination: { page: 1 },
				reset: true
			});
		},

		async loadNextPage() {
			const currentState = get({ subscribe });
			if (!currentState.pagination.hasNextPage) return;

			return this.loadHRRequests({
				pagination: { page: currentState.pagination.currentPage + 1 }
			});
		},

		// =============================================================================
		// Individual Request Management
		// =============================================================================

		async getHRRequestDetails(requestId: string): Promise<HRRequest> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client
					.query(GET_HR_REQUEST_DETAILS_QUERY, {
						id: requestId
					})
					.toPromise();

				if (result.error) {
					throw new Error(
						result.error.graphQLErrors[0]?.message || 'Failed to load request details'
					);
				}

				const request = result.data.hrRequest;

				update((state) => ({
					...state,
					currentRequest: request,
					isLoading: false
				}));

				return request;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load request details';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async createHRRequest(input: CreateHRRequestInput): Promise<HRRequest> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client.mutation(CREATE_HR_REQUEST_MUTATION, { input }).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to create HR request');
				}

				const newRequest = result.data.createHRRequest;

				update((state) => ({
					...state,
					requests: [newRequest, ...state.requests],
					myRequests: [newRequest, ...state.myRequests],
					totalCount: state.totalCount + 1,
					isLoading: false
				}));

				return newRequest;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to create HR request';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async updateHRRequest(requestId: string, input: UpdateHRRequestInput): Promise<HRRequest> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client
					.mutation(UPDATE_HR_REQUEST_MUTATION, {
						id: requestId,
						input
					})
					.toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to update HR request');
				}

				const updatedRequest = result.data.updateHRRequest;

				update((state) => ({
					...state,
					requests: state.requests.map((request) =>
						request.id === requestId ? { ...request, ...updatedRequest } : request
					),
					myRequests: state.myRequests.map((request) =>
						request.id === requestId ? { ...request, ...updatedRequest } : request
					),
					assignedRequests: state.assignedRequests.map((request) =>
						request.id === requestId ? { ...request, ...updatedRequest } : request
					),
					currentRequest:
						state.currentRequest?.id === requestId
							? { ...state.currentRequest, ...updatedRequest }
							: state.currentRequest,
					isLoading: false
				}));

				return updatedRequest;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to update HR request';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async processHRRequest(requestId: string, input: ProcessHRRequestInput): Promise<HRRequest> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client
					.mutation(PROCESS_HR_REQUEST_MUTATION, {
						id: requestId,
						input
					})
					.toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to process HR request');
				}

				const processedRequest = result.data.processHRRequest;

				update((state) => ({
					...state,
					requests: state.requests.map((request) =>
						request.id === requestId ? { ...request, ...processedRequest } : request
					),
					assignedRequests: state.assignedRequests.map((request) =>
						request.id === requestId ? { ...request, ...processedRequest } : request
					),
					currentRequest:
						state.currentRequest?.id === requestId
							? { ...state.currentRequest, ...processedRequest }
							: state.currentRequest,
					isLoading: false
				}));

				return processedRequest;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to process HR request';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async assignHRRequest(
			requestId: string,
			assigneeId: string,
			comment?: string
		): Promise<HRRequest> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client
					.mutation(ASSIGN_HR_REQUEST_MUTATION, {
						id: requestId,
						assigneeId,
						comment
					})
					.toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to assign HR request');
				}

				const assignedRequest = result.data.assignHRRequest;

				update((state) => ({
					...state,
					requests: state.requests.map((request) =>
						request.id === requestId ? { ...request, ...assignedRequest } : request
					),
					assignedRequests:
						assigneeId === 'current_user'
							? [assignedRequest, ...state.assignedRequests]
							: state.assignedRequests.filter((req) => req.id !== requestId),
					currentRequest:
						state.currentRequest?.id === requestId
							? { ...state.currentRequest, ...assignedRequest }
							: state.currentRequest,
					isLoading: false
				}));

				return assignedRequest;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to assign HR request';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		// =============================================================================
		// Document Management
		// =============================================================================

		async uploadDocument(requestId: string, file: File, description?: string): Promise<Document> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const formData = new FormData();
				formData.append('file', file);
				if (description) formData.append('description', description);

				const result = await client
					.mutation(UPLOAD_HR_DOCUMENT_MUTATION, {
						requestId,
						file: formData
					})
					.toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to upload document');
				}

				const document = result.data.uploadHRDocument;

				update((state) => ({
					...state,
					currentRequest:
						state.currentRequest?.id === requestId
							? {
									...state.currentRequest,
									attachments: [...(state.currentRequest.attachments || []), document]
								}
							: state.currentRequest,
					isLoading: false
				}));

				return document;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to upload document';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		// =============================================================================
		// Analytics and Reporting
		// =============================================================================

		async getHRRequestAnalytics(filters?: {
			departmentId?: string;
			timeRange?: { startDate: string; endDate: string };
			requestTypes?: HRRequestType[];
		}) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client
					.query(GET_HR_REQUEST_ANALYTICS_QUERY, {
						filters
					})
					.toPromise();

				if (result.error) {
					throw new Error(
						result.error.graphQLErrors[0]?.message || 'Failed to load HR request analytics'
					);
				}

				update((state) => ({ ...state, isLoading: false }));

				return result.data.hrRequestAnalytics;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load HR request analytics';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		// =============================================================================
		// Real-time Updates
		// =============================================================================

		subscribeToUpdates() {
			const currentState = get({ subscribe });
			if (currentState.subscriptions.updates) return;

			try {
				client.subscription(SUBSCRIBE_HR_REQUEST_UPDATES).subscribe((result) => {
					if (result.data?.hrRequestUpdate) {
						const updatedRequest = result.data.hrRequestUpdate;

						update((state) => ({
							...state,
							requests: state.requests.map((request) =>
								request.id === updatedRequest.id ? updatedRequest : request
							),
							myRequests: state.myRequests.map((request) =>
								request.id === updatedRequest.id ? updatedRequest : request
							),
							assignedRequests: state.assignedRequests.map((request) =>
								request.id === updatedRequest.id ? updatedRequest : request
							),
							currentRequest:
								state.currentRequest?.id === updatedRequest.id
									? updatedRequest
									: state.currentRequest
						}));
					}
				});

				update((state) => ({
					...state,
					subscriptions: { ...state.subscriptions, updates: true }
				}));
			} catch (error: any) {
				console.error('Failed to subscribe to HR request updates:', error);
			}
		},

		unsubscribeFromUpdates() {
			update((state) => ({
				...state,
				subscriptions: { ...state.subscriptions, updates: false }
			}));
		},

		// =============================================================================
		// Bulk Operations
		// =============================================================================

		async bulkAssignRequests(requestIds: string[], assigneeId: string): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const assignmentPromises = requestIds.map((requestId) =>
					this.assignHRRequest(requestId, assigneeId)
				);

				await Promise.all(assignmentPromises);

				update((state) => ({ ...state, isLoading: false }));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to bulk assign requests';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async bulkUpdateStatus(
			requestIds: string[],
			action: ProcessHRRequestInput['action']
		): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const updatePromises = requestIds.map((requestId) =>
					this.processHRRequest(requestId, { action })
				);

				await Promise.all(updatePromises);

				update((state) => ({ ...state, isLoading: false }));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to bulk update request status';
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

		clearCurrentRequest() {
			update((state) => ({ ...state, currentRequest: null }));
		},

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

		setPageSize(pageSize: number) {
			update((state) => ({
				...state,
				pagination: { ...state.pagination, pageSize, currentPage: 1 }
			}));
		},

		// =============================================================================
		// Utility Methods
		// =============================================================================

		getRequestById(requestId: string): HRRequest | undefined {
			const currentState = get({ subscribe });
			return currentState.requests.find((request) => request.id === requestId);
		},

		getRequestsByType(type: HRRequestType): HRRequest[] {
			const currentState = get({ subscribe });
			return currentState.requests.filter((request) => request.type === type);
		},

		getRequestsByStatus(status: HRRequestStatus): HRRequest[] {
			const currentState = get({ subscribe });
			return currentState.requests.filter((request) => request.status === status);
		},

		getPendingRequests(): HRRequest[] {
			const currentState = get({ subscribe });
			return currentState.requests.filter(
				(request) => request.status === 'PENDING' || request.status === 'IN_PROGRESS'
			);
		},

		getOverdueRequests(): HRRequest[] {
			const currentState = get({ subscribe });
			const now = new Date();
			return currentState.requests.filter(
				(request) =>
					request.dueDate &&
					new Date(request.dueDate) < now &&
					request.status !== 'COMPLETED' &&
					request.status !== 'CANCELLED'
			);
		},

		getHighPriorityRequests(): HRRequest[] {
			const currentState = get({ subscribe });
			return currentState.requests.filter(
				(request) => request.priority === 'HIGH' || request.priority === 'URGENT'
			);
		},

		// Statistics
		getTotalRequests(): number {
			const currentState = get({ subscribe });
			return currentState.totalCount;
		},

		getMyRequestsCount(): number {
			const currentState = get({ subscribe });
			return currentState.myRequests.length;
		},

		getAssignedRequestsCount(): number {
			const currentState = get({ subscribe });
			return currentState.assignedRequests.length;
		}
	};
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const hrRequestService = createHRRequestService();

// =============================================================================
// Derived Stores
// =============================================================================

export const hrRequests = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.requests
);

export const currentHRRequest = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.currentRequest
);

export const myHRRequests = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.myRequests
);

export const assignedHRRequests = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.assignedRequests
);

export const isLoadingHRRequests = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.isLoading
);

export const hrRequestError = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.error
);

export const pendingHRRequests = derived(hrRequests, ($requests) =>
	$requests.filter((request) => request.status === 'PENDING' || request.status === 'IN_PROGRESS')
);

export const overdueHRRequests = derived(hrRequests, ($requests) => {
	const now = new Date();
	return $requests.filter(
		(request) =>
			request.dueDate &&
			new Date(request.dueDate) < now &&
			request.status !== 'COMPLETED' &&
			request.status !== 'CANCELLED'
	);
});

export const highPriorityHRRequests = derived(hrRequests, ($requests) =>
	$requests.filter((request) => request.priority === 'HIGH' || request.priority === 'URGENT')
);

export const hrRequestsPagination = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.pagination
);

export const hrRequestsFilters = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.filters
);

export const hrRequestsSorting = derived(
	hrRequestService,
	($hrRequestService) => $hrRequestService.sorting
);

// =============================================================================
// Reactive Search and Filters
// =============================================================================

export const createHRRequestSearch = () => {
	const searchQuery = writable('');
	const debounceTimeout = writable<NodeJS.Timeout | null>(null);

	return {
		searchQuery: { subscribe: searchQuery.subscribe },

		search: (query: string) => {
			searchQuery.set(query);

			const timeout = get(debounceTimeout);
			if (timeout) clearTimeout(timeout);

			const newTimeout = setTimeout(() => {
				if (query.trim()) {
					hrRequestService.searchHRRequests(query.trim());
				} else {
					hrRequestService.loadHRRequests({ reset: true });
				}
			}, 300);

			debounceTimeout.set(newTimeout);
		},

		clear: () => {
			searchQuery.set('');
			hrRequestService.resetFilters();
			hrRequestService.loadHRRequests({ reset: true });
		}
	};
};

// =============================================================================
// Export Service as Default
// =============================================================================

export default hrRequestService;
