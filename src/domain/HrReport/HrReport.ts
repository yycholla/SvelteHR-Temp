import { Result } from '$domain/Result';
import { ReportTitle } from './value-objects/ReportTitle';
import { ReportType } from './value-objects/ReportType';
import { ReportStatus } from './value-objects/ReportStatus';
import { InvalidHrReportError } from './errors/HrReportErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface HrReportProps {
	id: string;
	creatorId: string;
	departmentId: string;
	title: ReportTitle;
	reportType: ReportType;
	category: string;
	status: ReportStatus;
	filters: Record<string, unknown> | null;
	data: Record<string, unknown> | null;
	scheduledAt: Date | null;
	generatedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateHrReportData {
	id: string;
	creatorId: string;
	departmentId: string;
	title: ReportTitle;
	reportType: ReportType;
	category: string;
	status: ReportStatus;
	filters: Record<string, unknown> | null;
	data: Record<string, unknown> | null;
	scheduledAt: Date | null;
	generatedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * HrReport aggregate root entity.
 *
 * Represents an HR report in the system with full lifecycle management.
 * Immutable - created via static factory method, business methods return new instances.
 */
export class HrReport {
	private constructor(private readonly props: HrReportProps) {}

	/**
	 * Create an HrReport entity with validation.
	 * Validates UUID formats and creates defensive Date copies.
	 */
	static create(data: CreateHrReportData): Result<HrReport, InvalidHrReportError> {
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(
				new InvalidHrReportError(`Invalid report ID format: "${data.id}"`)
			);
		}

		if (!data.creatorId || !UUID_REGEX.test(data.creatorId)) {
			return Result.error(
				new InvalidHrReportError(`Invalid creator ID format: "${data.creatorId}"`)
			);
		}

		if (!data.departmentId || !UUID_REGEX.test(data.departmentId)) {
			return Result.error(
				new InvalidHrReportError(`Invalid department ID format: "${data.departmentId}"`)
			);
		}

		const trimmedCategory = data.category.trim();
		if (trimmedCategory.length === 0) {
			return Result.error(
				new InvalidHrReportError('Invalid report category: category cannot be empty')
			);
		}

		if (trimmedCategory.length > 100) {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report category: category must be at most 100 characters, got ${trimmedCategory.length}`
				)
			);
		}

		return Result.ok(
			new HrReport({
				id: data.id,
				creatorId: data.creatorId,
				departmentId: data.departmentId,
				title: data.title,
				reportType: data.reportType,
				category: trimmedCategory,
				status: data.status,
				filters: data.filters,
				data: data.data,
				scheduledAt: data.scheduledAt !== null ? new Date(data.scheduledAt.getTime()) : null,
				generatedAt: data.generatedAt !== null ? new Date(data.generatedAt.getTime()) : null,
				createdAt: new Date(data.createdAt.getTime()),
				updatedAt: new Date(data.updatedAt.getTime())
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get creatorId(): string {
		return this.props.creatorId;
	}

	get departmentId(): string {
		return this.props.departmentId;
	}

	get title(): ReportTitle {
		return this.props.title;
	}

	get reportType(): ReportType {
		return this.props.reportType;
	}

	get category(): string {
		return this.props.category;
	}

	get status(): ReportStatus {
		return this.props.status;
	}

	get filters(): Record<string, unknown> | null {
		return this.props.filters;
	}

	get data(): Record<string, unknown> | null {
		return this.props.data;
	}

	get scheduledAt(): Date | null {
		return this.props.scheduledAt !== null ? new Date(this.props.scheduledAt.getTime()) : null;
	}

	get generatedAt(): Date | null {
		return this.props.generatedAt !== null ? new Date(this.props.generatedAt.getTime()) : null;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt.getTime());
	}

	get updatedAt(): Date {
		return new Date(this.props.updatedAt.getTime());
	}

	/**
	 * Whether this report has completed generation.
	 */
	isCompleted(): boolean {
		return this.props.status.isCompleted();
	}

	/**
	 * Whether this report has failed generation.
	 */
	isFailed(): boolean {
		return this.props.status.isFailed();
	}

	/**
	 * Whether this report is scheduled for future generation.
	 */
	isScheduled(): boolean {
		return this.props.status.isScheduled();
	}

	/**
	 * Whether this report can be deleted.
	 * Only draft or failed reports can be deleted.
	 */
	canBeDeleted(): boolean {
		const statusValue = this.props.status.value;
		return statusValue === 'draft' || statusValue === 'failed';
	}
}
