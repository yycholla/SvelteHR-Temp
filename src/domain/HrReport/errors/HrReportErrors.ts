/**
 * Domain error hierarchy for the HrReport module.
 *
 * HrReportError is the base class.
 * Specific error subclasses provide granular error codes for handling.
 */
export class HrReportError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'HrReportError';
	}
}

export class HrReportNotFoundError extends HrReportError {
	constructor(id: string) {
		super(`HR report not found: ${id}`, 'REPORT_NOT_FOUND');
		this.name = 'HrReportNotFoundError';
	}
}

export class InvalidHrReportError extends HrReportError {
	constructor(message: string) {
		super(message, 'INVALID_REPORT');
		this.name = 'InvalidHrReportError';
	}
}
