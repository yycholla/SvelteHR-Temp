// src/domain/Training/Training.ts
import { Result } from '$domain/Result';
import { TrainingTitle } from './value-objects/TrainingTitle';
import { InvalidTrainingError } from './errors/TrainingErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TrainingProps {
	id: string;
	title: TrainingTitle;
	description: string | null;
	startDate: Date | null;
	endDate: Date | null;
	tags: ReadonlyArray<string>;
	authorId: string;
}

export interface CreateTrainingData {
	id: string;
	title: TrainingTitle;
	description: string | null;
	startDate: Date | null;
	endDate: Date | null;
	tags: ReadonlyArray<string>;
	authorId: string;
}

/**
 * Training aggregate root entity.
 * Represents a course or training program in the system.
 * Immutable - business methods return new instances.
 */
export class Training {
	private constructor(private readonly props: TrainingProps) {}

	/**
	 * Create a Training entity with validation.
	 * Validates UUID formats and creates defensive Date copies.
	 */
	static create(data: CreateTrainingData): Result<Training, InvalidTrainingError> {
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(
				new InvalidTrainingError(`Invalid training ID format: "${data.id}"`)
			);
		}

		if (!data.authorId || !UUID_REGEX.test(data.authorId)) {
			return Result.error(
				new InvalidTrainingError(`Invalid author ID format: "${data.authorId}"`)
			);
		}

		return Result.ok(
			new Training({
				id: data.id,
				title: data.title,
				description: data.description,
				startDate: data.startDate !== null ? new Date(data.startDate.getTime()) : null,
				endDate: data.endDate !== null ? new Date(data.endDate.getTime()) : null,
				tags: [...data.tags],
				authorId: data.authorId
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get title(): TrainingTitle {
		return this.props.title;
	}

	get description(): string | null {
		return this.props.description;
	}

	get startDate(): Date | null {
		return this.props.startDate !== null ? new Date(this.props.startDate.getTime()) : null;
	}

	get endDate(): Date | null {
		return this.props.endDate !== null ? new Date(this.props.endDate.getTime()) : null;
	}

	get tags(): ReadonlyArray<string> {
		return [...this.props.tags];
	}

	get authorId(): string {
		return this.props.authorId;
	}

	/**
	 * Whether this training is currently active.
	 * A training is active if:
	 * - startDate is null OR startDate is in the past/present
	 * - endDate is null OR endDate is in the future/present
	 */
	isActive(): boolean {
		const now = new Date();
		const startOk = this.props.startDate === null || this.props.startDate <= now;
		const endOk = this.props.endDate === null || this.props.endDate >= now;
		return startOk && endOk;
	}

	/**
	 * Add a tag to this training, returning a new instance.
	 * If the tag already exists (after trimming), returns a copy without modification.
	 */
	addTag(tag: string): Training {
		const trimmedTag = tag.trim();
		if (this.props.tags.includes(trimmedTag)) {
			return new Training({
				...this.props,
				startDate: this.props.startDate !== null ? new Date(this.props.startDate.getTime()) : null,
				endDate: this.props.endDate !== null ? new Date(this.props.endDate.getTime()) : null,
				tags: [...this.props.tags]
			});
		}

		return new Training({
			...this.props,
			startDate: this.props.startDate !== null ? new Date(this.props.startDate.getTime()) : null,
			endDate: this.props.endDate !== null ? new Date(this.props.endDate.getTime()) : null,
			tags: [...this.props.tags, trimmedTag]
		});
	}

	/**
	 * Remove a tag from this training, returning a new instance.
	 * If the tag does not exist, returns a copy without modification.
	 */
	removeTag(tag: string): Training {
		const trimmedTag = tag.trim();
		return new Training({
			...this.props,
			startDate: this.props.startDate !== null ? new Date(this.props.startDate.getTime()) : null,
			endDate: this.props.endDate !== null ? new Date(this.props.endDate.getTime()) : null,
			tags: this.props.tags.filter((t) => t !== trimmedTag)
		});
	}
}
