import type { ReportStatus, ReportType, TeamReport } from '$lib/types/graphql';

export interface CreateTeamReportInput {
	clientMutationId?: string;
	teamReport: {
		title: string;
		reportType: ReportType;
		teamId?: string;
		generatedBy: string;
		dateFrom: string;
		dateTo: string;
		parameters?: any; // JSONB
		summary?: string;
		isScheduled?: boolean;
		scheduleCron?: string;
	};
}

export interface UpdateTeamReportInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		status?: ReportStatus;
		summary?: string;
		data?: any; // JSONB
		parameters?: any; // JSONB
		isScheduled?: boolean;
		scheduleCron?: string;
	};
}

export interface DeleteTeamReportInput {
	clientMutationId?: string;
	id: string;
}

export interface TeamReportFilter {
	teamId?: string;
	generatedBy?: string;
	reportType?: ReportType;
	status?: ReportStatus;
	isScheduled?: boolean;
	dateFrom?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	dateTo?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface ReportSearchFilter {
	searchTerm?: string;
	reportType?: ReportType;
	teamId?: string;
	generatedBy?: string;
	isScheduled?: boolean;
	status?: ReportStatus;
	dateRange?: {
		from: string;
		to: string;
	};
}

export interface FormattedReportData {
	summary: {
		title?: string;
		period?: string;
		generatedBy?: string;
		generatedAt?: string;
		keyMetrics?: Record<string, any>;
	};
	charts: Array<{
		id: string;
		title: string;
		type: string;
		data: any;
		config?: any;
	}>;
	tables: Array<{
		id: string;
		title: string;
		headers: string[];
		rows: any[][];
	}>;
	insights?: string[];
	recommendations?: string[];
}

export interface ReportTemplate {
	title: string;
	reportType: ReportType;
	parameters: {
		fields: string[];
		groupBy: string;
		chartTypes: string[];
		[key: string]: any;
	};
	structure: {
		sections: Array<{
			id: string;
			title: string;
			type: string;
			required: boolean;
		}>;
	};
}

export interface ReportStatistics {
	totals: {
		totalReports: number;
		completedReports: number;
		scheduledReports: number;
		failedReports: number;
		recentReports: number;
	};
	rates: {
		successRate: number;
		scheduleUtilization: number;
	};
	breakdowns: {
		byType: Array<{
			value: string;
			label: string;
			color: string;
			count: number;
		}>;
		byStatus: Array<{
			value: string;
			label: string;
			color: string;
			count: number;
		}>;
	};
	performance: {
		avgGenerationTime: string;
		peakUsageDays: string[];
		mostPopularType: {
			value: string;
			label: string;
			count: number;
		};
	};
}
