// src/adapters/GraphQLLeaveRequestAdapter.ts
import type { LeaveRequestRepository } from '$services';
import {
	LeaveRequest,
	type LeaveRequestFilters,
	type LeaveRequestListResult,
	type LeaveBalance,
	type LeaveStatistics,
	type LeaveStatisticsFilters,
	type CreateLeaveRequestData
} from '$domain';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { logger } from '$lib/utils/logger';

/**
 * GraphQL response types matching backend schema
 */
interface GraphQLLeaveRequest {
	id: string;
	employeeId: string;
	managerId: string | null;
	leaveType: string;
	startDate: string; // ISO 8601 date
	endDate: string; // ISO 8601 date
	daysRequested: number; // Backend field name
	status: string;
	reason: string | null;
	managerComments: string | null;
	createdAt: string; // ISO 8601 timestamp
	updatedAt: string; // ISO 8601 timestamp
}

/**
 * GraphQL adapter implementing LeaveRequestRepository
 * Translates between GraphQL API and domain entities
 *
 * Following hexagonal architecture: this is the adapter implementing the repository port.
 */
export class GraphQLLeaveRequestAdapter implements LeaveRequestRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	/**
	 * Find a leave request by ID
	 */
	async findById(id: string): Promise<LeaveRequest | null> {
		const query = `
			query GetLeaveRequestById($id: UUID!) {
				leaveRequest(id: $id) {
					id
					employeeId
					managerId
					leaveType
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ leaveRequest: GraphQLLeaveRequest | null }>(query, {
				id
			});

			if (!result?.leaveRequest) {
				return null;
			}

			return this.mapToDomain(result.leaveRequest);
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in findById',
				error instanceof Error ? error : undefined,
				{ id }
			);
			throw error;
		}
	}

	/**
	 * Find all leave requests with filters and pagination
	 * Note: Backend only supports employeeId filter, other filtering done client-side
	 */
	async findAll(filters?: LeaveRequestFilters): Promise<LeaveRequestListResult> {
		const query = `
			query GetLeaveRequests($employeeId: UUID, $limit: Int, $offset: Int) {
				leaveRequests(employeeId: $employeeId, limit: $limit, offset: $offset) {
					id
					employeeId
					managerId
					leaveType
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
				}
			}
		`;

		// Use large limit for client-side filtering
		const limit = filters?.limit ?? 1000;
		const page = filters?.page ?? 1;
		const offset = (page - 1) * limit;

		try {
			const result = await this.graphql.query<{ leaveRequests: GraphQLLeaveRequest[] }>(query, {
				employeeId: filters?.employeeId,
				limit,
				offset
			});

			if (!result?.leaveRequests) {
				return {
					items: [],
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit: filters?.limit ?? 20,
						total: 0,
						totalPages: 0
					}
				};
			}

			// Map to domain entities
			let leaveRequests = result.leaveRequests
				.map((req) => this.mapToDomain(req))
				.filter((req): req is LeaveRequest => req !== null);

			// Apply client-side filtering
			leaveRequests = this.applyFilters(leaveRequests, filters);

			const total = leaveRequests.length;
			const requestedLimit = filters?.limit ?? 20;
			const requestedPage = filters?.page ?? 1;
			const requestedOffset = (requestedPage - 1) * requestedLimit;

			// Apply pagination
			const paginatedItems = leaveRequests.slice(requestedOffset, requestedOffset + requestedLimit);

			return {
				items: paginatedItems.map((req) => req.toDTO()),
				pagination: {
					page: requestedPage,
					limit: requestedLimit,
					total,
					totalPages: Math.ceil(total / requestedLimit)
				}
			};
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in findAll',
				error instanceof Error ? error : undefined,
				{ filters }
			);
			throw error;
		}
	}

	/**
	 * Find leave requests by employee ID
	 */
	async findByEmployee(employeeId: string): Promise<LeaveRequest[]> {
		const query = `
			query GetLeaveRequestsByEmployee($employeeId: UUID!, $limit: Int) {
				leaveRequests(employeeId: $employeeId, limit: $limit, offset: 0) {
					id
					employeeId
					managerId
					leaveType
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ leaveRequests: GraphQLLeaveRequest[] }>(query, {
				employeeId,
				limit: 1000
			});

			if (!result?.leaveRequests) {
				return [];
			}

			return result.leaveRequests
				.map((req) => this.mapToDomain(req))
				.filter((req): req is LeaveRequest => req !== null);
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in findByEmployee',
				error instanceof Error ? error : undefined,
				{ employeeId }
			);
			throw error;
		}
	}

	/**
	 * Find leave requests by manager ID
	 * Note: Backend doesn't support managerId filter, so we fetch all and filter client-side
	 */
	async findByManager(managerId: string): Promise<LeaveRequest[]> {
		const query = `
			query GetAllLeaveRequests($limit: Int) {
				leaveRequests(limit: $limit, offset: 0) {
					id
					employeeId
					managerId
					leaveType
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ leaveRequests: GraphQLLeaveRequest[] }>(query, {
				limit: 1000
			});

			if (!result?.leaveRequests) {
				return [];
			}

			// Filter client-side by managerId
			return result.leaveRequests
				.filter((req) => req.managerId === managerId)
				.map((req) => this.mapToDomain(req))
				.filter((req): req is LeaveRequest => req !== null);
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in findByManager',
				error instanceof Error ? error : undefined,
				{ managerId }
			);
			throw error;
		}
	}

	/**
	 * Find overlapping leave requests
	 * Note: Overlap detection done client-side
	 */
	async findOverlapping(
		employeeId: string,
		startDate: string,
		endDate: string,
		excludeId?: string
	): Promise<LeaveRequest[]> {
		// Fetch all requests for the employee
		const allRequests = await this.findByEmployee(employeeId);

		// Filter for overlaps
		const start = new Date(startDate);
		const end = new Date(endDate);

		return allRequests.filter((req) => {
			if (excludeId && req.id === excludeId) {
				return false; // Exclude specified request
			}

			// Only consider pending or approved requests as overlaps
			if (!req.isPending() && !req.isApproved()) {
				return false;
			}

			// Check for date overlap
			return req.overlapsWith(req); // Using domain method (needs adjustment)
		});
	}

	/**
	 * Save a new leave request
	 */
	async save(leaveRequest: LeaveRequest): Promise<LeaveRequest> {
		const mutation = `
			mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
				createLeaveRequest(input: $input) {
					id
					employeeId
					managerId
					leaveType
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
				}
			}
		`;

		const input = {
			employeeId: leaveRequest.employeeId,
			managerId: leaveRequest.managerId,
			leaveType: leaveRequest.leaveType.toString(),
			startDate: leaveRequest.dateRange.startDate.toISOString().split('T')[0],
			endDate: leaveRequest.dateRange.endDate.toISOString().split('T')[0],
			daysRequested: leaveRequest.dateRange.businessDays,
			status: leaveRequest.status.toString(),
			reason: leaveRequest.reason || null
		};

		try {
			const result = await this.graphql.mutation<{ createLeaveRequest: GraphQLLeaveRequest }>(
				mutation,
				{ input }
			);

			if (!result?.createLeaveRequest) {
				throw new Error('Failed to create leave request');
			}

			const mapped = this.mapToDomain(result.createLeaveRequest);
			if (!mapped) {
				throw new Error('Failed to map created leave request');
			}

			return mapped;
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in save',
				error instanceof Error ? error : undefined,
				{ input }
			);
			throw error;
		}
	}

	/**
	 * Update an existing leave request
	 */
	async update(id: string, leaveRequest: LeaveRequest): Promise<LeaveRequest> {
		const mutation = `
			mutation UpdateLeaveRequest($input: UpdateLeaveRequestInput!) {
				updateLeaveRequest(input: $input) {
					id
					employeeId
					managerId
					leaveType
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
				}
			}
		`;

		const input = {
			id: leaveRequest.id,
			status: leaveRequest.status.toString(),
			managerComments: leaveRequest.managerComments
		};

		try {
			const result = await this.graphql.mutation<{ updateLeaveRequest: GraphQLLeaveRequest }>(
				mutation,
				{ input }
			);

			if (!result?.updateLeaveRequest) {
				throw new Error('Failed to update leave request');
			}

			const mapped = this.mapToDomain(result.updateLeaveRequest);
			if (!mapped) {
				throw new Error('Failed to map updated leave request');
			}

			return mapped;
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in update',
				error instanceof Error ? error : undefined,
				{ id, input }
			);
			throw error;
		}
	}

	/**
	 * Delete a leave request
	 */
	async delete(id: string): Promise<void> {
		const mutation = `
			mutation DeleteLeaveRequest($id: UUID!) {
				deleteLeaveRequest(id: $id)
			}
		`;

		try {
			await this.graphql.mutation<{ deleteLeaveRequest: boolean }>(mutation, { id });
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error in delete',
				error instanceof Error ? error : undefined,
				{ id }
			);
			throw error;
		}
	}

	/**
	 * Check if a leave request exists
	 */
	async exists(id: string): Promise<boolean> {
		const request = await this.findById(id);
		return request !== null;
	}

	/**
	 * Get leave balance for an employee
	 * Note: This is calculated client-side from leave requests
	 */
	async getLeaveBalance(employeeId: string, year?: number): Promise<LeaveBalance> {
		const targetYear = year ?? new Date().getFullYear();

		// Fetch all requests for employee
		const allRequests = await this.findByEmployee(employeeId);

		// Filter by year
		const yearRequests = allRequests.filter((req) => {
			const startYear = req.dateRange.startDate.getFullYear();
			return startYear === targetYear;
		});

		// Calculate totals
		const used = yearRequests
			.filter((req) => req.isApproved())
			.reduce((sum, req) => sum + req.getBusinessDays(), 0);

		const pending = yearRequests
			.filter((req) => req.isPending())
			.reduce((sum, req) => sum + req.getBusinessDays(), 0);

		// TODO: Get total allocated days from employee settings
		const total = 20; // Placeholder

		return {
			employeeId,
			year: targetYear,
			total,
			used,
			pending,
			remaining: total - used - pending
		};
	}

	/**
	 * Get aggregated statistics
	 * Note: Calculated client-side from leave requests
	 */
	async getStatistics(filters?: LeaveStatisticsFilters): Promise<LeaveStatistics> {
		// Fetch requests based on filters
		let requests: LeaveRequest[];

		if (filters?.employeeId) {
			requests = await this.findByEmployee(filters.employeeId);
		} else {
			// Fetch all requests
			const result = await this.findAll({ limit: 1000, page: 1 });
			requests = result.items.map((dto) => {
				// Reconstruct LeaveRequest from DTO
				// This is a workaround - ideally we'd have a fromDTO method
				const createResult = LeaveRequest.create({
					employeeId: dto.employeeId,
					leaveType: dto.leaveType,
					startDate: dto.startDate,
					endDate: dto.endDate,
					reason: dto.reason
				});
				return createResult.value!;
			});
		}

		// Apply date filters
		if (filters?.startDate || filters?.endDate) {
			requests = requests.filter((req) => {
				if (filters.startDate) {
					const filterStart = new Date(filters.startDate);
					if (req.dateRange.startDate < filterStart) return false;
				}
				if (filters.endDate) {
					const filterEnd = new Date(filters.endDate);
					if (req.dateRange.endDate > filterEnd) return false;
				}
				return true;
			});
		}

		// Calculate statistics
		const total = requests.length;
		const pending = requests.filter((r) => r.isPending()).length;
		const approved = requests.filter((r) => r.isApproved()).length;
		const rejected = requests.filter((r) => r.isRejected()).length;
		const cancelled = requests.filter((r) => r.isCancelled()).length;
		const totalDays = requests.reduce((sum, r) => sum + r.getBusinessDays(), 0);
		const approvalRate = total > 0 ? approved / total : 0;
		const averageDuration = total > 0 ? totalDays / total : 0;

		return {
			total,
			pending,
			approved,
			rejected,
			cancelled,
			totalDays,
			approvalRate,
			averageDuration
		};
	}

	/**
	 * Count leave requests by status
	 */
	async countByStatus(status: string, filters?: LeaveStatisticsFilters): Promise<number> {
		const stats = await this.getStatistics(filters);

		switch (status.toLowerCase()) {
			case 'pending':
				return stats.pending;
			case 'approved':
				return stats.approved;
			case 'rejected':
				return stats.rejected;
			case 'cancelled':
				return stats.cancelled;
			default:
				return 0;
		}
	}

	/**
	 * Get total business days of approved leave for employee in date range
	 */
	async getTotalDaysByEmployee(
		employeeId: string,
		startDate: string,
		endDate: string
	): Promise<number> {
		const allRequests = await this.findByEmployee(employeeId);

		const start = new Date(startDate);
		const end = new Date(endDate);

		return allRequests
			.filter((req) => {
				// Only count approved requests
				if (!req.isApproved()) return false;

				// Check if request overlaps with date range
				return req.dateRange.startDate <= end && req.dateRange.endDate >= start;
			})
			.reduce((sum, req) => sum + req.getBusinessDays(), 0);
	}

	// Private helper methods

	/**
	 * Map GraphQL response to domain entity
	 */
	private mapToDomain(gqlRequest: GraphQLLeaveRequest): LeaveRequest | null {
		try {
			// Create domain entity using factory method
			const createData: CreateLeaveRequestData = {
				employeeId: gqlRequest.employeeId,
				leaveType: gqlRequest.leaveType,
				startDate: gqlRequest.startDate.split('T')[0], // Extract date part
				endDate: gqlRequest.endDate.split('T')[0],
				reason: gqlRequest.reason || ''
			};

			const result = LeaveRequest.create(createData);

			if (result.isError) {
				logger.warn('[GraphQLLeaveRequestAdapter] Failed to create domain entity', {
					id: gqlRequest.id,
					error: result.error.message
				});
				return null;
			}

			// TODO: Apply status, manager info, timestamps from GraphQL response
			// For now, return the created entity
			return result.value;
		} catch (error) {
			logger.error(
				'[GraphQLLeaveRequestAdapter] Error mapping to domain',
				error instanceof Error ? error : undefined,
				{ gqlRequest }
			);
			return null;
		}
	}

	/**
	 * Apply client-side filters
	 */
	private applyFilters(requests: LeaveRequest[], filters?: LeaveRequestFilters): LeaveRequest[] {
		if (!filters) return requests;

		let filtered = requests;

		// Filter by status
		if (filters.status) {
			filtered = filtered.filter((req) => req.status.toString() === filters.status);
		}

		// Filter by leave type
		if (filters.leaveType) {
			filtered = filtered.filter((req) => req.leaveType.toString() === filters.leaveType);
		}

		// Filter by date range
		if (filters.startDate) {
			const filterStart = new Date(filters.startDate);
			filtered = filtered.filter((req) => req.dateRange.startDate >= filterStart);
		}

		if (filters.endDate) {
			const filterEnd = new Date(filters.endDate);
			filtered = filtered.filter((req) => req.dateRange.endDate <= filterEnd);
		}

		return filtered;
	}
}
