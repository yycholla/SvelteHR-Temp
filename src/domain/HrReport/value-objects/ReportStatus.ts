import { Result } from '$domain/Result';
import { InvalidHrReportError } from '../errors/HrReportErrors';

export type ReportStatusValue = 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';

const VALID_STATUSES: ReadonlySet<ReportStatusValue> = new Set([
	'draft',
	'active',
	'scheduled',
	'completed',
	'failed'
]);

/**
 * Value object representing the status of an HR report.
 *
 * Valid statuses: draft, active, scheduled, completed, failed
 */
export class ReportStatus {
	private constructor(private readonly _value: ReportStatusValue) {}

	static create(status: string): Result<ReportStatus, InvalidHrReportError> {
		if (typeof status !== 'string') {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report status: "${String(status)}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		const trimmed = status.trim().toLowerCase();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report status: status cannot be empty. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		if (!VALID_STATUSES.has(trimmed as ReportStatusValue)) {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new ReportStatus(trimmed as ReportStatusValue));
	}

	get value(): ReportStatusValue {
		return this._value;
	}

	/**
	 * Whether this report has completed generation.
	 */
	isCompleted(): boolean {
		return this._value === 'completed';
	}

	/**
	 * Whether this report has failed generation.
	 */
	isFailed(): boolean {
		return this._value === 'failed';
	}

	/**
	 * Whether this report is scheduled for future generation.
	 */
	isScheduled(): boolean {
		return this._value === 'scheduled';
	}

	equals(other: ReportStatus): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
