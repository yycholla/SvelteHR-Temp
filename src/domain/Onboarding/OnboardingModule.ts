// src/domain/Onboarding/OnboardingModule.ts
import { Result } from '$domain/Result';
import { ModuleTitle } from './value-objects/ModuleTitle';
import { ModuleCategory } from './value-objects/ModuleCategory';
import { InvalidOnboardingModuleError } from './errors/OnboardingErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OnboardingModuleProps {
	id: string;
	title: ModuleTitle;
	description: string | null;
	isActive: boolean;
	category: ModuleCategory;
	tags: ReadonlyArray<string>;
	authorId: string;
}

export interface CreateOnboardingModuleData {
	id: string;
	title: ModuleTitle;
	description: string | null;
	isActive: boolean;
	category: ModuleCategory;
	tags: ReadonlyArray<string>;
	authorId: string;
}

export class OnboardingModule {
	private constructor(private readonly props: OnboardingModuleProps) {}

	static create(
		data: CreateOnboardingModuleData
	): Result<OnboardingModule, InvalidOnboardingModuleError> {
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(
				new InvalidOnboardingModuleError(`Invalid onboarding module ID format: "${data.id}"`)
			);
		}

		if (!data.authorId || !UUID_REGEX.test(data.authorId)) {
			return Result.error(
				new InvalidOnboardingModuleError(`Invalid author ID format: "${data.authorId}"`)
			);
		}

		return Result.ok(
			new OnboardingModule({
				id: data.id,
				title: data.title,
				description: data.description,
				isActive: data.isActive,
				category: data.category,
				tags: [...data.tags],
				authorId: data.authorId
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get title(): ModuleTitle {
		return this.props.title;
	}

	get description(): string | null {
		return this.props.description;
	}

	get isActive(): boolean {
		return this.props.isActive;
	}

	get category(): ModuleCategory {
		return this.props.category;
	}

	get tags(): ReadonlyArray<string> {
		return [...this.props.tags];
	}

	get authorId(): string {
		return this.props.authorId;
	}

	// Business methods - return new instances for immutability

	activate(): OnboardingModule {
		return new OnboardingModule({
			...this.props,
			tags: [...this.props.tags],
			isActive: true
		});
	}

	deactivate(): OnboardingModule {
		return new OnboardingModule({
			...this.props,
			tags: [...this.props.tags],
			isActive: false
		});
	}

	addTag(tag: string): OnboardingModule {
		const trimmedTag = tag.trim();
		if (this.props.tags.includes(trimmedTag)) {
			return new OnboardingModule({
				...this.props,
				tags: [...this.props.tags]
			});
		}

		return new OnboardingModule({
			...this.props,
			tags: [...this.props.tags, trimmedTag]
		});
	}

	removeTag(tag: string): OnboardingModule {
		const trimmedTag = tag.trim();
		return new OnboardingModule({
			...this.props,
			tags: this.props.tags.filter((t) => t !== trimmedTag)
		});
	}
}
