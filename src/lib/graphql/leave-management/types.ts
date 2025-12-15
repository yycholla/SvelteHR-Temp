export interface LeaveRequest {
	id: string;
	employeeId: string;
	leaveTypeId: string;
	startDate: string;
	endDate: string;
	daysRequested: string; // Decimal as string
	reason?: string;
	status: 'pending' | 'approved' | 'rejected' | 'cancelled';
	managerId?: string;
	approvedAt?: string;
	managerComments?: string;
	createdAt: string;
	updatedAt: string;
	employee?: {
		id: string;
		displayName: string;
		fullName: string;
		email: string;
		department?: {
			id: string;
			name: string;
		};
	};
	manager?: {
		id: string;
		displayName: string;
		fullName: string;
		email: string;
	};
	leaveType?: {
		id: string;
		name: string;
		color?: string;
	};
}

export interface LeaveRequestFilter {
	status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
	employeeId?: string;
	startDate?: string;
	endDate?: string;
	employeeName?: string;
}

export interface CreateLeaveRequestInput {
	leaveTypeId: string;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	daysRequested: string; // Decimal as string
	reason?: string;
}

export interface UpdateLeaveRequestInput {
	startDate?: string;
	endDate?: string;
	daysRequested?: string;
	reason?: string;
}

export interface ApproveLeaveRequestInput {
	requestId: string;
}

export interface RejectLeaveRequestInput {
	requestId: string;
	rejectionReason: string; // REQUIRED
}

export interface LeaveStatistics {
	pendingCount: number;
	approvedCount: number;
	rejectedCount: number;
	totalCount: number;
	totalDaysRequested: number;
	averageRequestDays: number;
	approvalRate: number;
}
