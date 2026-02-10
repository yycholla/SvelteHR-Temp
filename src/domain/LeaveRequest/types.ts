/**
 * Data Transfer Objects and Interfaces for LeaveRequest domain
 */

// Input DTOs
export interface CreateLeaveRequestData {
	employeeId: string;
	leaveType: string;
	startDate: string; // ISO 8601 date string
	endDate: string; // ISO 8601 date string
	reason?: string;
}

export interface UpdateLeaveRequestData {
	status?: string;
	managerId?: string;
	managerComments?: string;
}

// Output DTOs
export interface LeaveRequestDTO {
	id: string;
	employeeId: string;
	managerId: string | null;
	leaveType: string;
	startDate: string; // ISO 8601
	endDate: string; // ISO 8601
	businessDays: number;
	reason: string;
	status: string;
	managerComments: string | null;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

// Filter/Query DTOs
export interface LeaveRequestFilters {
	employeeId?: string;
	managerId?: string;
	departmentId?: string;
	status?: string;
	leaveType?: string;
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
}

export interface LeaveRequestListResult {
	items: LeaveRequestDTO[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Statistics DTOs
export interface LeaveBalance {
	employeeId: string;
	year: number;
	total: number; // Total days allocated
	used: number; // Days used (approved leave)
	pending: number; // Days in pending requests
	remaining: number; // Available days
}

export interface LeaveStatistics {
	total: number;
	pending: number;
	approved: number;
	rejected: number;
	cancelled: number;
	totalDays: number;
	approvalRate: number;
	averageDuration: number;
}

export interface LeaveStatisticsFilters {
	employeeId?: string;
	managerId?: string;
	departmentId?: string;
	startDate?: string;
	endDate?: string;
}
