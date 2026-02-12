// src/domain/Goal/index.ts
// Value Objects
export { GoalStatus } from './value-objects/GoalStatus';
export { GoalPriority } from './value-objects/GoalPriority';
export { GoalTitle } from './value-objects/GoalTitle';
export { GoalDescription } from './value-objects/GoalDescription';
export { TargetDate } from './value-objects/TargetDate';
export { Progress } from './value-objects/Progress';
export { Quarter } from './value-objects/Quarter';

// Entities
export { Goal } from './entities/Goal';
export type { GoalProps } from './entities/Goal';

// Errors
export {
	GoalError,
	GoalValidationError,
	GoalStatusValidationError,
	GoalPriorityValidationError,
	GoalTitleValidationError,
	GoalDescriptionValidationError,
	TargetDateValidationError,
	ProgressValidationError,
	QuarterValidationError,
	GoalNotFoundError,
	InvalidStatusTransitionError,
	InvalidProgressError
} from './errors/GoalErrors';
