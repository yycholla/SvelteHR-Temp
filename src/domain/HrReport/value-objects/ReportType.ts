import { Result } from '$domain/Result';
import { InvalidHrReportError } from '../errors/HrReportErrors';

export type ReportTypeValue =
	| 'headcount'
	| 'turnover'
	| 'attendance'
	| 'performance'
	| 'leave'
	| 'compensation'
	| 'training'
	| 'custom';

const VALID_REPORT_TYPES: ReadonlySet<ReportTypeValue> = new Set([
	'headcount',
	'turnover',
	'attendance',
	'performance',
	'leave',
	'compensation',
	'training',
	'custom'
]);

/**
 * Value object representing the type of an HR report.
 *
 * Valid types: headcount, turnover, attendance, performance, leave, compensation, training, custom
 */
export class ReportType {
	private constructor(private readonly _value: ReportTypeValue) {}

	static create(type: string): Result<ReportType, InvalidHrReportError> {
		if (typeof type !== 'string') {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report type: "${String(type)}". Must be one of: ${Array.from(VALID_REPORT_TYPES).join(', ')}`
				)
			);
		}

		const trimmed = type.trim().toLowerCase();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report type: type cannot be empty. Must be one of: ${Array.from(VALID_REPORT_TYPES).join(', ')}`
				)
			);
		}

		if (!VALID_REPORT_TYPES.has(trimmed as ReportTypeValue)) {
			return Result.error(
				new InvalidHrReportError(
					`Invalid report type: "${type}". Must be one of: ${Array.from(VALID_REPORT_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new ReportType(trimmed as ReportTypeValue));
	}

	get value(): ReportTypeValue {
		return this._value;
	}

	equals(other: ReportType): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
