export interface AccessLog {
	accessed_at: string;
	document_id: string;
	document_title?: string;
	document_type?: string;
	user_id: string;
	user_email?: string;
	action: string;
	ip_address: string;
}

export interface AuditPageData {
	accessLogs: AccessLog[];
	totalCount: number;
	page: number;
	limit: number;
}
