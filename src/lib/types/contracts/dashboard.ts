import type { DataRequest } from './core';

// =============================================================================
// Dashboard Operation Contracts
// =============================================================================

export interface GetCompleteDashboardDataVariables {
	userId: string;
	userRole: string;
}

export type GetCompleteDashboardDataRequest = DataRequest<GetCompleteDashboardDataVariables>;

export interface GetCompleteDashboardDataResponse {
	dashboardData: {
		metrics: DashboardMetrics;
		user: DashboardUser;
		activities: ActivityItem[];
		tasks: TaskItem[];
		upcomingEvents: UpcomingEvent[];
	};
}

export interface DashboardMetrics {
	attendanceRate: number;
	pendingRequests: number;
	taskCount: number;
	remainingVacationDays: number;
}

export interface DashboardUser {
	id: string;
	displayName: string;
	role: string;
	department?: string;
	profileImage?: string;
}

export interface ActivityItem {
	id: string;
	type: string;
	message: string;
	timestamp: string;
	severity: string;
}

export interface TaskItem {
	id: string;
	title: string;
	status: string;
	dueDate?: string;
	priority: string;
}

export interface UpcomingEvent {
	id: string;
	title: string;
	type: string;
	time: string;
	location?: string;
}
