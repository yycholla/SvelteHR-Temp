export interface ActivityLogEntry {
	id: string;
	action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
	resourceType: string;
	resourceId: string;
	changes: Record<string, unknown>;
	performedBy: string;
	timestamp: string;
	rollbackStatus?: 'completed' | 'pending' | null;
	beforeSnapshot?: Record<string, unknown>;
	afterSnapshot?: Record<string, unknown>;
	employeeId?: string;
	employeeName?: string;
	isRollback?: boolean;
	rolledBackLogId?: string | null;
	createdAt?: string;
	reason?: string | null;
}

export interface ActivityFeedProps {
	logs: ActivityLogEntry[];
	onLoadMore?: () => void;
	hasMore?: boolean;
	loading?: boolean;
	selectedIds?: Set<string>;
	onSelectionChange?: (ids: Set<string>) => void;
	userRole?: string;
	onLogClick?: (logId: string) => void;
	onRollback?: (logId: string) => void;
}
