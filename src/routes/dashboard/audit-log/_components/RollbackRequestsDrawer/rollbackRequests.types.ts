export interface RollbackRequest {
	id: string;
	activityLogId: string;
	requestedBy: {
		id: string;
		fullName: string;
		email: string;
		department: string;
	};
	requestedAt: string;
	reason: string;
	status: 'pending' | 'approved' | 'rejected';
	reviewedBy?: {
		id: string;
		fullName: string;
	};
	reviewedAt?: string;
	reviewReason?: string;
	activityLog: {
		action: 'CREATE' | 'UPDATE' | 'DELETE';
		resourceType: string;
		resourceId: string;
		beforeSnapshot: Record<string, unknown>;
		afterSnapshot: Record<string, unknown>;
	};
}

export interface RollbackRequestCardProps {
	request: RollbackRequest;
	userRole: string;
	onApprove?: (requestId: string, reason: string) => Promise<void>;
	onReject?: (requestId: string, reason: string) => Promise<void>;
}
