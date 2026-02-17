import { Result } from '$domain/Result';
import { HrReport } from '$domain/HrReport/HrReport';
import { ReportTitle } from '$domain/HrReport/value-objects/ReportTitle';
import { ReportType } from '$domain/HrReport/value-objects/ReportType';
import { ReportStatus } from '$domain/HrReport/value-objects/ReportStatus';
import {
	HrReportNotFoundError,
	InvalidHrReportError
} from '$domain/HrReport/errors/HrReportErrors';
import type { HrReportError } from '$domain/HrReport/errors/HrReportErrors';
import type {
	HrReportRepository,
	CreateHrReportData,
	UpdateHrReportData,
	HrReportFilter
} from '$services/ports/HrReportRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// GraphQL query/mutation constants
// Field names sourced from src/lib/graphql/reports/queries.ts and mutations.ts

const GET_REPORT_QUERY = `
	query GetHRReportById($id: UUID!) {
		hrReport(id: $id) {
			id
			creatorId
			departmentId
			title
			reportType
			category
			status
			filters
			data
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

const GET_REPORTS_QUERY = `
	query GetHRReports($limit: Int) {
		hrReports(limit: $limit, offset: 0) {
			id
			creatorId
			departmentId
			title
			reportType
			category
			status
			filters
			data
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

const CREATE_REPORT_MUTATION = `
	mutation CreateHRReport($input: CreateHrReportInput!) {
		createHrReport(input: $input) {
			id
			creatorId
			departmentId
			title
			reportType
			category
			status
			filters
			data
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

const UPDATE_REPORT_MUTATION = `
	mutation UpdateHRReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			id
			creatorId
			departmentId
			title
			reportType
			category
			status
			filters
			data
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

const DELETE_REPORT_MUTATION = `
	mutation DeleteHRReport($id: UUID!) {
		deleteHrReport(id: $id)
	}
`;

// GraphQL response shape interfaces

interface GraphQLHrReport {
	id: string;
	creatorId: string;
	departmentId: string | null;
	title: string;
	reportType: string;
	category: string | null;
	status: string;
	filters: Record<string, unknown> | null;
	data: Record<string, unknown> | null;
	scheduledAt: string | null;
	generatedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLHrReportAdapter implements HrReportRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * Note: findByDepartment uses client-side filtering since no dedicated GraphQL query exists.
 * Note: generate uses the update mutation to trigger generation (no dedicated mutation exists).
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLHrReportAdapter(graphqlPort);
 * const result = await adapter.findById('report-uuid');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLHrReportAdapter implements HrReportRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<HrReport, HrReportError>> {
		try {
			const result = await this.graphql.query<{ hrReport: GraphQLHrReport | null }>(
				GET_REPORT_QUERY,
				{ id }
			);

			if (!result?.hrReport) {
				return Result.error(new HrReportNotFoundError(id));
			}

			const report = this.mapToHrReport(result.hrReport);
			if (!report) {
				return Result.error(new HrReportNotFoundError(id));
			}

			return Result.ok(report);
		} catch {
			return Result.error(new HrReportNotFoundError(id));
		}
	}

	async findAll(filter?: HrReportFilter): Promise<Result<HrReport[], HrReportError>> {
		try {
			const result = await this.graphql.query<{ hrReports: GraphQLHrReport[] }>(GET_REPORTS_QUERY, {
				limit: 1000
			});

			let rawReports = result?.hrReports ?? [];

			// Apply client-side filtering if filters are provided
			if (filter) {
				if (filter.status) {
					rawReports = rawReports.filter(
						(r) => r.status?.toLowerCase() === filter.status?.toLowerCase()
					);
				}
				if (filter.reportType) {
					rawReports = rawReports.filter(
						(r) => r.reportType?.toLowerCase() === filter.reportType?.toLowerCase()
					);
				}
				if (filter.creatorId) {
					rawReports = rawReports.filter((r) => r.creatorId === filter.creatorId);
				}
				if (filter.departmentId) {
					rawReports = rawReports.filter((r) => r.departmentId === filter.departmentId);
				}
			}

			const reports = rawReports
				.map((r) => this.mapToHrReport(r))
				.filter((r): r is HrReport => r !== null);

			return Result.ok(reports);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to fetch reports: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findByDepartment(
		departmentId: string,
		filter?: HrReportFilter
	): Promise<Result<HrReport[], HrReportError>> {
		// Delegate to findAll with departmentId merged into filter
		return this.findAll({ ...filter, departmentId });
	}

	async create(data: CreateHrReportData): Promise<Result<HrReport, HrReportError>> {
		try {
			const result = await this.graphql.mutation<{
				createHrReport: GraphQLHrReport;
			}>(CREATE_REPORT_MUTATION, { input: data });

			if (!result?.createHrReport) {
				return Result.error(new InvalidHrReportError('Failed to create report'));
			}

			const report = this.mapToHrReport(result.createHrReport);
			if (!report) {
				return Result.error(new InvalidHrReportError('Invalid report data returned from create'));
			}

			return Result.ok(report);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to create report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateHrReportData): Promise<Result<HrReport, HrReportError>> {
		try {
			const result = await this.graphql.mutation<{
				updateHrReport: GraphQLHrReport | null;
			}>(UPDATE_REPORT_MUTATION, { input: { id, ...data } });

			if (!result?.updateHrReport) {
				return Result.error(new HrReportNotFoundError(id));
			}

			const report = this.mapToHrReport(result.updateHrReport);
			if (!report) {
				return Result.error(new InvalidHrReportError('Invalid report data returned from update'));
			}

			return Result.ok(report);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to update report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, HrReportError>> {
		try {
			const result = await this.graphql.mutation<{
				deleteHrReport: boolean;
			}>(DELETE_REPORT_MUTATION, { id });

			if (!result?.deleteHrReport) {
				return Result.error(new HrReportNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new HrReportNotFoundError(id));
		}
	}

	async generate(id: string): Promise<Result<HrReport, HrReportError>> {
		// Trigger generation by updating status to 'active';
		// the backend processes the report and returns the updated entity.
		try {
			const result = await this.graphql.mutation<{
				updateHrReport: GraphQLHrReport | null;
			}>(UPDATE_REPORT_MUTATION, { input: { id, status: 'active' } });

			if (!result?.updateHrReport) {
				return Result.error(new HrReportNotFoundError(id));
			}

			const report = this.mapToHrReport(result.updateHrReport);
			if (!report) {
				return Result.error(new InvalidHrReportError('Invalid report data returned from generate'));
			}

			return Result.ok(report);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Map raw GraphQL data to domain HrReport entity.
	 * Returns null on any validation failure (resilient error handling).
	 *
	 * @private
	 * @param data - Raw GraphQL report data
	 * @returns HrReport entity or null if data is invalid
	 */
	private mapToHrReport(data: unknown): HrReport | null {
		try {
			if (!data || typeof data !== 'object') return null;

			const raw = data as GraphQLHrReport;

			// Validate required string fields
			if (typeof raw.id !== 'string') return null;
			if (typeof raw.creatorId !== 'string') return null;
			if (typeof raw.title !== 'string') return null;
			if (typeof raw.reportType !== 'string') return null;
			if (typeof raw.status !== 'string') return null;
			if (typeof raw.createdAt !== 'string') return null;
			if (typeof raw.updatedAt !== 'string') return null;

			// Require a departmentId (UUID) - fallback to sentinel if null
			const departmentId =
				raw.departmentId && raw.departmentId.length > 0
					? raw.departmentId
					: '00000000-0000-0000-0000-000000000000';

			// Category defaults to 'general' if missing
			const categoryRaw = raw.category ?? 'general';

			// Validate title
			const titleResult = ReportTitle.create(raw.title);
			if (titleResult.isError) return null;

			// Validate reportType
			const reportTypeResult = ReportType.create(raw.reportType);
			if (reportTypeResult.isError) return null;

			// Validate status
			const statusResult = ReportStatus.create(raw.status);
			if (statusResult.isError) return null;

			// Parse dates
			const createdAt = new Date(raw.createdAt);
			if (isNaN(createdAt.getTime())) return null;

			const updatedAt = new Date(raw.updatedAt);
			if (isNaN(updatedAt.getTime())) return null;

			const scheduledAt = raw.scheduledAt ? new Date(raw.scheduledAt) : null;
			if (scheduledAt !== null && isNaN(scheduledAt.getTime())) return null;

			const generatedAt = raw.generatedAt ? new Date(raw.generatedAt) : null;
			if (generatedAt !== null && isNaN(generatedAt.getTime())) return null;

			const reportResult = HrReport.create({
				id: raw.id,
				creatorId: raw.creatorId,
				departmentId,
				title: titleResult.value,
				reportType: reportTypeResult.value,
				category: categoryRaw,
				status: statusResult.value,
				filters: raw.filters ?? null,
				data: raw.data ?? null,
				scheduledAt,
				generatedAt,
				createdAt,
				updatedAt
			});

			if (reportResult.isError) return null;

			return reportResult.value;
		} catch {
			return null; // Resilient - return null for any invalid data
		}
	}
}
