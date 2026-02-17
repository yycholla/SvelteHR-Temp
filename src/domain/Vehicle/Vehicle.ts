// src/domain/Vehicle/Vehicle.ts
import { Result } from '$domain/Result';
import { VehicleMake } from './value-objects/VehicleMake';
import { VehicleModel } from './value-objects/VehicleModel';
import { VehicleYear } from './value-objects/VehicleYear';
import { LicensePlate } from './value-objects/LicensePlate';
import { VehicleColor } from './value-objects/VehicleColor';
import { VehicleError, InvalidVehicleError } from './errors/VehicleErrors';

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export interface CreateVehicleData {
	id: string;
	employeeId: string;
	make: VehicleMake;
	model: VehicleModel;
	year: VehicleYear;
	color: VehicleColor | null;
	licensePlate: LicensePlate;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Vehicle aggregate root entity.
 *
 * Represents a vehicle registered to an employee.
 * Enforces business invariants:
 * - id and employeeId must be valid UUIDs
 * - make, model, year, and licensePlate are validated value objects
 * - color is optional (nullable value object)
 * - dates use defensive copies to prevent mutation
 *
 * @example
 * ```typescript
 * const makeResult = VehicleMake.create('Toyota');
 * const modelResult = VehicleModel.create('Camry');
 * const yearResult = VehicleYear.create(2023);
 * const plateResult = LicensePlate.create('ABC-1234');
 *
 * const vehicleResult = Vehicle.create({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   employeeId: '123e4567-e89b-12d3-a456-426614174001',
 *   make: makeResult.value,
 *   model: modelResult.value,
 *   year: yearResult.value,
 *   color: null,
 *   licensePlate: plateResult.value,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 * ```
 */
export class Vehicle {
	private constructor(
		private readonly _id: string,
		private readonly _employeeId: string,
		private readonly _make: VehicleMake,
		private readonly _model: VehicleModel,
		private readonly _year: VehicleYear,
		private readonly _color: VehicleColor | null,
		private readonly _licensePlate: LicensePlate,
		private readonly _createdAt: Date,
		private readonly _updatedAt: Date
	) {}

	/**
	 * Create a Vehicle entity.
	 * @param data - Vehicle creation data with validated value objects
	 * @returns Result containing Vehicle or VehicleError
	 */
	static create(data: CreateVehicleData): Result<Vehicle, VehicleError> {
		if (!isValidUUID(data.id)) {
			return Result.error(
				new InvalidVehicleError(`Invalid vehicle ID: "${data.id}"`)
			);
		}

		if (!isValidUUID(data.employeeId)) {
			return Result.error(
				new InvalidVehicleError(`Invalid employee ID: "${data.employeeId}"`)
			);
		}

		if (isNaN(data.createdAt.getTime())) {
			return Result.error(new InvalidVehicleError('createdAt must be a valid date'));
		}

		if (isNaN(data.updatedAt.getTime())) {
			return Result.error(new InvalidVehicleError('updatedAt must be a valid date'));
		}

		return Result.ok(
			new Vehicle(
				data.id,
				data.employeeId,
				data.make,
				data.model,
				data.year,
				data.color,
				data.licensePlate,
				new Date(data.createdAt), // defensive copy
				new Date(data.updatedAt) // defensive copy
			)
		);
	}

	get id(): string {
		return this._id;
	}

	get employeeId(): string {
		return this._employeeId;
	}

	get make(): VehicleMake {
		return this._make;
	}

	get model(): VehicleModel {
		return this._model;
	}

	get year(): VehicleYear {
		return this._year;
	}

	get color(): VehicleColor | null {
		return this._color;
	}

	get licensePlate(): LicensePlate {
		return this._licensePlate;
	}

	/** Returns a defensive copy of the creation date */
	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	/** Returns a defensive copy of the last updated date */
	get updatedAt(): Date {
		return new Date(this._updatedAt);
	}

	/**
	 * Returns a human-readable display name for the vehicle.
	 * Format: "{year} {make} {model}" (e.g. "2023 Toyota Camry")
	 */
	get displayName(): string {
		return `${this._year.value} ${this._make.value} ${this._model.value}`;
	}

	/**
	 * Update vehicle details (make, model, year, color).
	 * Returns a new Vehicle instance with updated values and refreshed updatedAt.
	 * @param make - New VehicleMake value object
	 * @param model - New VehicleModel value object
	 * @param year - New VehicleYear value object
	 * @param color - New VehicleColor value object or null
	 */
	updateDetails(
		make: VehicleMake,
		model: VehicleModel,
		year: VehicleYear,
		color: VehicleColor | null
	): Vehicle {
		return new Vehicle(
			this._id,
			this._employeeId,
			make,
			model,
			year,
			color,
			this._licensePlate,
			new Date(this._createdAt),
			new Date()
		);
	}
}
