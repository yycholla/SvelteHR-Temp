// src/domain/PerformanceReview/errors/PerformanceReviewErrors.ts
export class PerformanceReviewError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PerformanceReviewError';
	}
}

export class ReviewStatusValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewStatusValidationError';
	}
}

export class RatingValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'RatingValidationError';
	}
}

export class ReviewPeriodValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewPeriodValidationError';
	}
}

export class ReviewDateValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'ReviewDateValidationError';
	}
}

export class PerformanceReviewNotFoundError extends PerformanceReviewError {
	constructor(id: string) {
		super(`Performance review not found: ${id}`);
		this.name = 'PerformanceReviewNotFoundError';
	}
}

export class PerformanceReviewValidationError extends PerformanceReviewError {
	constructor(message: string) {
		super(message);
		this.name = 'PerformanceReviewValidationError';
	}
}

export class InvalidStatusTransitionError extends PerformanceReviewError {
	constructor(from: string, to: string) {
		super(`Invalid status transition from ${from} to ${to}`);
		this.name = 'InvalidStatusTransitionError';
	}
}
