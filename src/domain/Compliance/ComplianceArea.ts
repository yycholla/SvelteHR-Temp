// src/domain/Compliance/ComplianceArea.ts
import { Result } from '$domain/Result';
import { ComplianceAreaName } from './value-objects/ComplianceAreaName';
import { ComplianceScore } from './value-objects/ComplianceScore';
import { ComplianceStatus } from './value-objects/ComplianceStatus';
import { ReviewDate } from './value-objects/ReviewDate';
import { ComplianceError, InvalidComplianceError } from './errors/ComplianceErrors';

const MAX_DESCRIPTION_LENGTH = 500;

interface ComplianceAreaData {
	id: string;
	name: ComplianceAreaName;
	description?: string;
	score: ComplianceScore;
	status: ComplianceStatus;
	lastReviewDate: ReviewDate;
	nextReviewDate: ReviewDate;
	createdAt: Date;
	updatedAt: Date;
}

interface ComplianceAreaCreateInput {
	id: string;
	name: string;
	description?: string;
	score: number;
	status: string;
	lastReviewDate: Date | string;
	nextReviewDate: Date | string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * ComplianceArea is the aggregate root for the Compliance domain.
 *
 * Represents a specific compliance area (e.g., Data Privacy GDPR, Employment Law)
 * with its current score, status, and review schedule.
 *
 * Key business rules:
 * - Score must be 0-100 integer
 * - Status must be one of: compliant, warning, failed, pending
 * - Description is optional but must be at most 500 characters
 * - All Date fields use defensive copies to prevent mutation
 * - updateScore returns a new instance (immutable pattern)
 */
export class ComplianceArea {
	private constructor(private readonly _data: ComplianceAreaData) {}

	/**
	 * Create a ComplianceArea aggregate.
	 * @param input - Raw input data with primitives
	 * @returns Result containing ComplianceArea or ComplianceError
	 */
	static create(
		input: ComplianceAreaCreateInput
	): Result<ComplianceArea, ComplianceError> {
		// Validate name
		const nameResult = ComplianceAreaName.create(input.name);
		if (nameResult.isError) return Result.error(nameResult.error);

		// Validate description
		const description = input.description?.trim();
		if (description !== undefined && description !== '' && description.length > MAX_DESCRIPTION_LENGTH) {
			return Result.error(
				new InvalidComplianceError(
					`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters, got: ${description.length}`
				)
			);
		}

		// Validate score
		const scoreResult = ComplianceScore.create(input.score);
		if (scoreResult.isError) return Result.error(scoreResult.error);

		// Validate status
		const statusResult = ComplianceStatus.create(input.status);
		if (statusResult.isError) return Result.error(statusResult.error);

		// Validate lastReviewDate
		const lastReviewResult = ReviewDate.create(input.lastReviewDate);
		if (lastReviewResult.isError) return Result.error(lastReviewResult.error);

		// Validate nextReviewDate
		const nextReviewResult = ReviewDate.create(input.nextReviewDate);
		if (nextReviewResult.isError) return Result.error(nextReviewResult.error);

		return Result.ok(
			new ComplianceArea({
				id: input.id,
				name: nameResult.value,
				description: description || undefined,
				score: scoreResult.value,
				status: statusResult.value,
				lastReviewDate: lastReviewResult.value,
				nextReviewDate: nextReviewResult.value,
				createdAt: new Date(input.createdAt.getTime()),
				updatedAt: new Date(input.updatedAt.getTime())
			})
		);
	}

	/** Unique identifier for this compliance area */
	get id(): string {
		return this._data.id;
	}

	/** The name of this compliance area */
	get name(): ComplianceAreaName {
		return this._data.name;
	}

	/** Optional description of the compliance area */
	get description(): string | undefined {
		return this._data.description;
	}

	/** Current compliance score (0-100) */
	get score(): ComplianceScore {
		return this._data.score;
	}

	/** Current compliance status */
	get status(): ComplianceStatus {
		return this._data.status;
	}

	/** Date of the last review */
	get lastReviewDate(): ReviewDate {
		return this._data.lastReviewDate;
	}

	/** Date of the next scheduled review */
	get nextReviewDate(): ReviewDate {
		return this._data.nextReviewDate;
	}

	/** Timestamp when this record was created (defensive copy) */
	get createdAt(): Date {
		return new Date(this._data.createdAt.getTime());
	}

	/** Timestamp when this record was last updated (defensive copy) */
	get updatedAt(): Date {
		return new Date(this._data.updatedAt.getTime());
	}

	/**
	 * Returns true if the next review date has passed (is in the past).
	 */
	isDueForReview(): boolean {
		return this._data.nextReviewDate.isPast();
	}

	/**
	 * Returns a new ComplianceArea with updated score and status.
	 * Follows the immutable entity pattern.
	 *
	 * @param score - New compliance score
	 * @param status - New compliance status
	 * @returns New ComplianceArea instance with updated values
	 */
	updateScore(score: ComplianceScore, status: ComplianceStatus): ComplianceArea {
		return new ComplianceArea({
			...this._data,
			score,
			status,
			updatedAt: new Date()
		});
	}
}
