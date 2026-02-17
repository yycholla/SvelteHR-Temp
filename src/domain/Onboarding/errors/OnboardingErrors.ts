export class OnboardingError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'OnboardingError';
	}
}

export class OnboardingModuleNotFoundError extends OnboardingError {
	constructor(id: string) {
		super(`Onboarding module not found: ${id}`, 'ONBOARDING_MODULE_NOT_FOUND');
		this.name = 'OnboardingModuleNotFoundError';
	}
}

export class InvalidOnboardingModuleError extends OnboardingError {
	constructor(message: string) {
		super(message, 'INVALID_ONBOARDING_MODULE');
		this.name = 'InvalidOnboardingModuleError';
	}
}

export class AssignmentNotFoundError extends OnboardingError {
	constructor(id: string) {
		super(`Onboarding assignment not found: ${id}`, 'ASSIGNMENT_NOT_FOUND');
		this.name = 'AssignmentNotFoundError';
	}
}

export class InvalidAssignmentError extends OnboardingError {
	constructor(message: string) {
		super(message, 'INVALID_ASSIGNMENT');
		this.name = 'InvalidAssignmentError';
	}
}
