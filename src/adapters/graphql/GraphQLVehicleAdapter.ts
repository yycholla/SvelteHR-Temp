// src/adapters/graphql/GraphQLVehicleAdapter.ts
import { gql } from '@urql/core';
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
import type { VehicleRepository } from '$services/ports/VehicleRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for a vehicle
 */
interface GraphQLVehicle {
	id: string;
	employeeId: string;
	make: string;
	model: string;
	year: number;
	color: string | null;
	licensePlate: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLVehicleAdapter implements VehicleRepository port for GraphQL backend.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLVehicleAdapter(graphqlPort);
 * const result = await adapter.findByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // Vehicle[]
 * }
 * ```
 */
export class GraphQLVehicleAdapter implements VehicleRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<Vehicle | null, VehicleError>> {
		const query = gql`
			query GetVehicle($id: UUID!) {
				vehicle(id: $id) {
					id
					employeeId
					make
					model
					year
					color
					licensePlate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				vehicle: GraphQLVehicle | null;
			}>(query, { id });

			if (!result?.vehicle) {
				return Result.ok(null);
			}

			const vehicle = this.mapToEntity(result.vehicle);
			return Result.ok(vehicle);
		} catch {
			return Result.ok(null);
		}
	}

	async findByEmployeeId(employeeId: string): Promise<Result<Vehicle[], VehicleError>> {
		const query = gql`
			query GetVehiclesByEmployee($employeeId: UUID!) {
				vehiclesByEmployee(employeeId: $employeeId) {
					id
					employeeId
					make
					model
					year
					color
					licensePlate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				vehiclesByEmployee: GraphQLVehicle[];
			}>(query, { employeeId });

			const vehicles = (result?.vehiclesByEmployee ?? [])
				.map((v) => this.mapToEntity(v))
				.filter((v): v is Vehicle => v !== null);

			return Result.ok(vehicles);
		} catch (error) {
			return Result.error(
				new InvalidVehicleError(
					`Failed to fetch vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(vehicle: Vehicle): Promise<Result<Vehicle, VehicleError>> {
		const mutation = gql`
			mutation CreateVehicle($input: CreateVehicleInput!) {
				createVehicle(input: $input) {
					id
					employeeId
					make
					model
					year
					color
					licensePlate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				id: vehicle.id,
				employeeId: vehicle.employeeId,
				make: vehicle.make.value,
				model: vehicle.model.value,
				year: vehicle.year.value,
				color: vehicle.color?.value ?? null,
				licensePlate: vehicle.licensePlate.value
			};

			const result = await this.graphql.mutation<{
				createVehicle: GraphQLVehicle;
			}>(mutation, { input });

			if (!result?.createVehicle) {
				return Result.error(new InvalidVehicleError('Failed to create vehicle'));
			}

			const created = this.mapToEntity(result.createVehicle);
			if (!created) {
				return Result.error(
					new InvalidVehicleError('Invalid vehicle data returned from create')
				);
			}

			return Result.ok(created);
		} catch (error) {
			return Result.error(
				new InvalidVehicleError(
					`Failed to create vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(vehicle: Vehicle): Promise<Result<Vehicle, VehicleError>> {
		const mutation = gql`
			mutation UpdateVehicle($id: UUID!, $input: UpdateVehicleInput!) {
				updateVehicle(id: $id, input: $input) {
					id
					employeeId
					make
					model
					year
					color
					licensePlate
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				make: vehicle.make.value,
				model: vehicle.model.value,
				year: vehicle.year.value,
				color: vehicle.color?.value ?? null
			};

			const result = await this.graphql.mutation<{
				updateVehicle: GraphQLVehicle;
			}>(mutation, { id: vehicle.id, input });

			if (!result?.updateVehicle) {
				return Result.error(new InvalidVehicleError('Failed to update vehicle'));
			}

			const updated = this.mapToEntity(result.updateVehicle);
			if (!updated) {
				return Result.error(
					new InvalidVehicleError('Invalid vehicle data returned from update')
				);
			}

			return Result.ok(updated);
		} catch (error) {
			return Result.error(
				new InvalidVehicleError(
					`Failed to update vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, VehicleError>> {
		const mutation = gql`
			mutation DeleteVehicle($id: UUID!) {
				deleteVehicle(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteVehicle: boolean }>(mutation, {
				id
			});

			if (!result?.deleteVehicle) {
				return Result.error(new VehicleNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new VehicleNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL vehicle data to domain Vehicle entity.
	 * @private
	 * @returns Vehicle entity or null if data is invalid (resilient error handling)
	 */
	private mapToEntity(data: GraphQLVehicle): Vehicle | null {
		try {
			const makeResult = VehicleMake.create(data.make);
			if (makeResult.isError) return null;

			const modelResult = VehicleModel.create(data.model);
			if (modelResult.isError) return null;

			const yearResult = VehicleYear.create(data.year);
			if (yearResult.isError) return null;

			const plateResult = LicensePlate.create(data.licensePlate);
			if (plateResult.isError) return null;

			const colorResult = VehicleColor.create(data.color);
			if (colorResult.isError) return null;

			const createdAt = new Date(data.createdAt);
			const updatedAt = new Date(data.updatedAt);

			if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) return null;

			const vehicleResult = Vehicle.create({
				id: data.id,
				employeeId: data.employeeId,
				make: makeResult.value,
				model: modelResult.value,
				year: yearResult.value,
				color: colorResult.value,
				licensePlate: plateResult.value,
				createdAt,
				updatedAt
			});

			if (vehicleResult.isError) return null;

			return vehicleResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
