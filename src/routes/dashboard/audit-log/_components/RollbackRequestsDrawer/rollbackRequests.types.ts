export interface RollbackRequest {
	id: string;
	status: 'pending' | 'approved' | 'rejected';
	requestedBy: string;
	targetLogId: string;
	createdAt: string;
	reason?: string;
}

export interface RollbackRequestCardProps {
	request: RollbackRequest;
	currentUserRole: string;
	onApprove?: (requestId: string) => Promise<void>;
	onReject?: (requestId: string, reason: string) => Promise<void>;
}
