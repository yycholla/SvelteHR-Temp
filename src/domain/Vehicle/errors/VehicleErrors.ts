// src/domain/Vehicle/errors/VehicleErrors.ts

/**
 * Base error class for all vehicle-related domain errors.
 */
export class VehicleError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'VehicleError';
	}
}

/**
 * Thrown when a vehicle cannot be found by the given ID.
 */
export class VehicleNotFoundError extends VehicleError {
	constructor(id: string) {
		super(`Vehicle not found: ${id}`, 'VEHICLE_NOT_FOUND');
		this.name = 'VehicleNotFoundError';
	}
}

/**
 * Thrown when vehicle data fails domain validation.
 */
export class InvalidVehicleError extends VehicleError {
	constructor(message: string) {
		super(message, 'INVALID_VEHICLE');
		this.name = 'InvalidVehicleError';
	}
}
