import type { Result } from '$domain/Result';
import type { HrReport } from '$domain/HrReport/HrReport';
import type { HrReportError } from '$domain/HrReport/errors/HrReportErrors';

export interface CreateHrReportData {
	creatorId: string;
	departmentId: string;
	title: string;
	reportType: string;
	category: string;
	filters?: Record<string, unknown> | null;
	status?: string;
	scheduledAt?: string | null;
}

export interface UpdateHrReportData {
	title?: string;
	reportType?: string;
	category?: string;
	filters?: Record<string, unknown> | null;
	data?: Record<string, unknown> | null;
	status?: string;
	scheduledAt?: string | null;
}

export interface HrReportFilter {
	status?: string;
	reportType?: string;
	creatorId?: string;
	departmentId?: string;
}

/**
 * Port interface for HrReport persistence.
 *
 * Defines the contract that adapter implementations must fulfill.
 * Keeps the service layer decoupled from GraphQL/HTTP/DB details.
 */
export interface HrReportRepository {
	findById(id: string): Promise<Result<HrReport, HrReportError>>;
	findAll(filter?: HrReportFilter): Promise<Result<HrReport[], HrReportError>>;
	findByDepartment(
		departmentId: string,
		filter?: HrReportFilter
	): Promise<Result<HrReport[], HrReportError>>;
	create(data: CreateHrReportData): Promise<Result<HrReport, HrReportError>>;
	update(id: string, data: UpdateHrReportData): Promise<Result<HrReport, HrReportError>>;
	delete(id: string): Promise<Result<void, HrReportError>>;
	generate(id: string): Promise<Result<HrReport, HrReportError>>;
}
