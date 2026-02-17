// src/domain/Training/TrainingContent.ts
import { Result } from '$domain/Result';
import { TrainingTitle } from './value-objects/TrainingTitle';
import { ContentType } from './value-objects/ContentType';
import { InvalidTrainingError } from './errors/TrainingErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TrainingContentProps {
	id: string;
	trainingId: string;
	title: TrainingTitle;
	type: ContentType;
	data: string;
	sequenceOrder: number;
}

export interface CreateTrainingContentData {
	id: string;
	trainingId: string;
	title: string;
	type: string;
	data: string;
	sequenceOrder: number;
}

/**
 * TrainingContent entity.
 * Represents a lesson or section within a Training program.
 */
export class TrainingContent {
	private constructor(private readonly props: TrainingContentProps) {}

	/**
	 * Create a TrainingContent entity with validation.
	 * Validates UUID formats, title, content type, and sequence order.
	 */
	static create(data: CreateTrainingContentData): Result<TrainingContent, InvalidTrainingError> {
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(
				new InvalidTrainingError(`Invalid content ID format: "${data.id}"`)
			);
		}

		if (!data.trainingId || !UUID_REGEX.test(data.trainingId)) {
			return Result.error(
				new InvalidTrainingError(`Invalid training ID format: "${data.trainingId}"`)
			);
		}

		const titleResult = TrainingTitle.create(data.title);
		if (titleResult.isError) {
			return Result.error(titleResult.error);
		}

		const typeResult = ContentType.create(data.type);
		if (typeResult.isError) {
			return Result.error(typeResult.error);
		}

		if (!Number.isInteger(data.sequenceOrder) || data.sequenceOrder < 1) {
			return Result.error(
				new InvalidTrainingError(
					`Invalid sequence order: "${data.sequenceOrder}". Must be a positive integer.`
				)
			);
		}

		return Result.ok(
			new TrainingContent({
				id: data.id,
				trainingId: data.trainingId,
				title: titleResult.value,
				type: typeResult.value,
				data: data.data,
				sequenceOrder: data.sequenceOrder
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get trainingId(): string {
		return this.props.trainingId;
	}

	get title(): TrainingTitle {
		return this.props.title;
	}

	get type(): ContentType {
		return this.props.type;
	}

	get data(): string {
		return this.props.data;
	}

	get sequenceOrder(): number {
		return this.props.sequenceOrder;
	}
}
