export class TimeOffBalanceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TimeOffBalanceError';
	}
}

export class BalanceHoursValidationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'BalanceHoursValidationError';
	}
}

export class AccrualRateValidationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'AccrualRateValidationError';
	}
}

export class LeaveTypeValidationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'LeaveTypeValidationError';
	}
}

export class BalancePeriodValidationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'BalancePeriodValidationError';
	}
}

export class CarryoverHoursValidationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'CarryoverHoursValidationError';
	}
}

export class TimeOffBalanceValidationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'TimeOffBalanceValidationError';
	}
}

export class TimeOffBalanceNotFoundError extends TimeOffBalanceError {
	constructor(balanceId: string) {
		super(`Time off balance not found: ${balanceId}`);
		this.name = 'TimeOffBalanceNotFoundError';
	}
}

export class InsufficientBalanceError extends TimeOffBalanceError {
	constructor(requested: number, available: number) {
		super(`Insufficient balance: requested ${requested} hours, only ${available} available`);
		this.name = 'InsufficientBalanceError';
	}
}

export class InvalidAccrualCalculationError extends TimeOffBalanceError {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidAccrualCalculationError';
	}
}
