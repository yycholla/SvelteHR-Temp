// src/services/ports/VehicleRepository.ts
import type { Result } from '$domain/Result';
import type { Vehicle, VehicleError } from '$domain/Vehicle';

/**
 * Port interface for vehicle data access.
 *
 * Defines the contract that any vehicle persistence adapter must fulfil.
 * The service layer depends on this interface, not on any concrete implementation.
 */
export interface VehicleRepository {
	/**
	 * Find a vehicle by its unique ID.
	 * @param id - UUID of the vehicle
	 * @returns Result containing the Vehicle or null if not found, or an error
	 */
	findById(id: string): Promise<Result<Vehicle | null, VehicleError>>;

	/**
	 * Find all vehicles registered to a given employee.
	 * @param employeeId - UUID of the employee
	 * @returns Result containing an array of Vehicles (may be empty), or an error
	 */
	findByEmployeeId(employeeId: string): Promise<Result<Vehicle[], VehicleError>>;

	/**
	 * Persist a new vehicle.
	 * @param vehicle - Vehicle domain entity to persist
	 * @returns Result containing the created Vehicle (as returned by persistence layer), or an error
	 */
	create(vehicle: Vehicle): Promise<Result<Vehicle, VehicleError>>;

	/**
	 * Update an existing vehicle.
	 * @param vehicle - Vehicle domain entity with updated values
	 * @returns Result containing the updated Vehicle, or an error
	 */
	update(vehicle: Vehicle): Promise<Result<Vehicle, VehicleError>>;

	/**
	 * Delete a vehicle by its ID.
	 * @param id - UUID of the vehicle to delete
	 * @returns Result containing void on success, or an error
	 */
	delete(id: string): Promise<Result<void, VehicleError>>;
}
