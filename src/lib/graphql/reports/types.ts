export interface HrReportFilter {
	status?: {
		equalTo?: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
		in?: Array<'draft' | 'active' | 'scheduled' | 'completed' | 'failed'>;
	};
	reportType?: {
		equalTo?: string;
		in?: string[];
	};
	category?: {
		equalTo?: string;
		in?: string[];
	};
	creatorId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

// Rust backend input types (flat, no clientMutationId)
export interface CreateHrReportInput {
	creatorId: string;
	departmentId: string;
	title: string;
	reportType: string;
	category: string;
	filters?: Record<string, any>;
	data?: Record<string, any>;
	status?: 'draft' | 'active' | 'scheduled';
	scheduledAt?: string;
}

export interface UpdateHrReportInput {
	title?: string;
	reportType?: string;
	category?: string;
	filters?: Record<string, any>;
	data?: Record<string, any>;
	status?: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
	scheduledAt?: string;
}

// DeleteHrReportInput not needed - uses string id directly

export interface HrReport {
	id: string;
	creatorId: string;
	creator: {
		id: string;
		displayName: string;
		email: string;
	};
	departmentId: string;
	department: {
		id: string;
		name: string;
	};
	title: string;
	reportType: string;
	category: string;
	filters?: Record<string, any>;
	data?: Record<string, any>;
	status: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
	scheduledAt?: string;
	generatedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReportAnalytics {
	summary: {
		totalReports: number;
		activeReports: number;
		scheduledReports: number;
		completedReports: number;
		generatedToday: number;
		generatedThisWeek: number;
		generatedThisMonth: number;
		mostPopularType: string;
		avgRunTime: number;
	};
	typeBreakdown: Array<{
		type: string;
		count: number;
		percentage: number;
	}>;
	categoryBreakdown: Array<{
		category: string;
		count: number;
		percentage: number;
	}>;
	performanceMetrics: {
		successRate: number;
		errorRate: number;
	};
}
