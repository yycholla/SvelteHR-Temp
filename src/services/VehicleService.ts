// src/services/VehicleService.ts
import { Result } from '$domain/Result';
import {
	Vehicle,
	VehicleMake,
	VehicleModel,
	VehicleYear,
	LicensePlate,
	VehicleColor,
	VehicleNotFoundError,
	InvalidVehicleError
} from '$domain/Vehicle';
import type { VehicleError } from '$domain/Vehicle';
import type { VehicleRepository } from './ports/VehicleRepository';

export interface CreateVehicleInput {
	id: string;
	employeeId: string;
	make: string;
	model: string;
	year: number;
	color?: string | null;
	licensePlate: string;
}

export interface UpdateVehicleInput {
	make: string;
	model: string;
	year: number;
	color?: string | null;
}

/**
 * Service for vehicle business operations.
 *
 * Orchestrates vehicle CRUD operations and business rules,
 * delegating data access to the VehicleRepository port.
 *
 * @example
 * ```typescript
 * const service = createVehicleService(event);
 * const result = await service.getByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // Vehicle[]
 * }
 * ```
 */
export class VehicleService {
	constructor(private readonly repository: VehicleRepository) {}

	/**
	 * Get a vehicle by ID.
	 * Returns VehicleNotFoundError if not found.
	 */
	async getById(id: string): Promise<Result<Vehicle, VehicleError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new VehicleNotFoundError(id));
			}

			return Result.ok(findResult.value);
		} catch {
			return Result.error(new VehicleNotFoundError(id));
		}
	}

	/**
	 * Get all vehicles registered to an employee.
	 */
	async getByEmployeeId(employeeId: string): Promise<Result<Vehicle[], VehicleError>> {
		try {
			return await this.repository.findByEmployeeId(employeeId);
		} catch {
			return Result.error(new VehicleNotFoundError(employeeId));
		}
	}

	/**
	 * Create a new vehicle.
	 * Validates all input data and creates domain entity before persisting.
	 */
	async create(input: CreateVehicleInput): Promise<Result<Vehicle, VehicleError>> {
		try {
			const makeResult = VehicleMake.create(input.make);
			if (makeResult.isError) return Result.error(makeResult.error);

			const modelResult = VehicleModel.create(input.model);
			if (modelResult.isError) return Result.error(modelResult.error);

			const yearResult = VehicleYear.create(input.year);
			if (yearResult.isError) return Result.error(yearResult.error);

			const plateResult = LicensePlate.create(input.licensePlate);
			if (plateResult.isError) return Result.error(plateResult.error);

			const colorResult = VehicleColor.create(input.color ?? null);
			if (colorResult.isError) return Result.error(colorResult.error);

			const now = new Date();
			const vehicleResult = Vehicle.create({
				id: input.id,
				employeeId: input.employeeId,
				make: makeResult.value,
				model: modelResult.value,
				year: yearResult.value,
				color: colorResult.value,
				licensePlate: plateResult.value,
				createdAt: now,
				updatedAt: now
			});

			if (vehicleResult.isError) return Result.error(vehicleResult.error);

			return await this.repository.create(vehicleResult.value);
		} catch {
			return Result.error(new InvalidVehicleError('Failed to create vehicle'));
		}
	}

	/**
	 * Update an existing vehicle's details (make, model, year, color).
	 * Fetches the existing vehicle first to preserve licensePlate and other immutable fields.
	 */
	async update(id: string, input: UpdateVehicleInput): Promise<Result<Vehicle, VehicleError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new VehicleNotFoundError(id));
			}

			const makeResult = VehicleMake.create(input.make);
			if (makeResult.isError) return Result.error(makeResult.error);

			const modelResult = VehicleModel.create(input.model);
			if (modelResult.isError) return Result.error(modelResult.error);

			const yearResult = VehicleYear.create(input.year);
			if (yearResult.isError) return Result.error(yearResult.error);

			const colorResult = VehicleColor.create(input.color ?? null);
			if (colorResult.isError) return Result.error(colorResult.error);

			const updated = findResult.value.updateDetails(
				makeResult.value,
				modelResult.value,
				yearResult.value,
				colorResult.value
			);

			return await this.repository.update(updated);
		} catch {
			return Result.error(new VehicleNotFoundError(id));
		}
	}

	/**
	 * Delete a vehicle by ID.
	 * Verifies the vehicle exists before attempting deletion.
	 */
	async delete(id: string): Promise<Result<void, VehicleError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new VehicleNotFoundError(id));
			}

			return await this.repository.delete(id);
		} catch {
			return Result.error(new VehicleNotFoundError(id));
		}
	}
}
