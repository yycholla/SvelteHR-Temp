// src/adapters/graphql/GraphQLVehicleAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLVehicleAdapter } from './GraphQLVehicleAdapter';
import { Vehicle } from '$domain/Vehicle';
import { VehicleNotFoundError, InvalidVehicleError } from '$domain/Vehicle';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * Mock GraphQLPort for testing
 */
class MockGraphQLPort implements GraphQLPort {
	private mockData: Record<string, unknown> = {};
	private shouldThrow = false;

	setMockData(data: Record<string, unknown>) {
		this.mockData = data;
		this.shouldThrow = false;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	async query<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL query failed');
		}
		return this.mockData as T;
	}

	async mutation<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL mutation failed');
		}
		return this.mockData as T;
	}
}

/**
 * Helper to create valid GraphQL vehicle data
 */
function createGraphQLVehicle(
	overrides: Partial<{
		id: string;
		employeeId: string;
		make: string;
		model: string;
		year: number;
		color: string | null;
		licensePlate: string;
		createdAt: string;
		updatedAt: string;
	}> = {}
) {
	return {
		id: '123e4567-e89b-12d3-a456-426614174000',
		employeeId: '223e4567-e89b-12d3-a456-426614174001',
		make: 'Toyota',
		model: 'Camry',
		year: 2023,
		color: 'Red',
		licensePlate: 'ABC-1234',
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174001';

describe('GraphQLVehicleAdapter', () => {
	let adapter: GraphQLVehicleAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLVehicleAdapter(mockGraphQL);
	});

	describe('findById', () => {
		it('should return vehicle when found', async () => {
			const graphqlData = createGraphQLVehicle();
			mockGraphQL.setMockData({ vehicle: graphqlData });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(Vehicle);
			expect(result.value?.id).toBe(VALID_UUID);
		});

		it('should return null when vehicle not found', async () => {
			mockGraphQL.setMockData({ vehicle: null });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when GraphQL query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should map vehicle fields correctly', async () => {
			const graphqlData = createGraphQLVehicle({
				make: 'Honda',
				model: 'Civic',
				year: 2022,
				color: 'Blue',
				licensePlate: 'XYZ-567'
			});
			mockGraphQL.setMockData({ vehicle: graphqlData });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			const vehicle = result.value!;
			expect(vehicle.make.value).toBe('Honda');
			expect(vehicle.model.value).toBe('Civic');
			expect(vehicle.year.value).toBe(2022);
			expect(vehicle.color?.value).toBe('Blue');
			expect(vehicle.licensePlate.value).toBe('XYZ-567');
		});

		it('should return null for vehicle with invalid data (invalid year)', async () => {
			const graphqlData = createGraphQLVehicle({ year: 1800 }); // year too old
			mockGraphQL.setMockData({ vehicle: graphqlData });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('findByEmployeeId', () => {
		it('should return all vehicles for an employee', async () => {
			const vehicles = [
				createGraphQLVehicle(),
				createGraphQLVehicle({ id: '323e4567-e89b-12d3-a456-426614174002', licensePlate: 'DEF-456' })
			];
			mockGraphQL.setMockData({ vehiclesByEmployee: vehicles });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when employee has no vehicles', async () => {
			mockGraphQL.setMockData({ vehiclesByEmployee: [] });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid vehicles (resilient)', async () => {
			const vehicles = [
				createGraphQLVehicle(), // valid
				createGraphQLVehicle({ year: 1800, licensePlate: 'BAD' }) // invalid year but valid plate
			];
			mockGraphQL.setMockData({ vehiclesByEmployee: vehicles });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			// The second vehicle has year=1800 which is invalid, should be filtered
			expect(result.value).toHaveLength(1);
		});

		it('should handle null vehiclesByEmployee gracefully', async () => {
			mockGraphQL.setMockData({ vehiclesByEmployee: null });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return InvalidVehicleError when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidVehicleError);
		});

		it('should map vehicles with null color correctly', async () => {
			mockGraphQL.setMockData({
				vehiclesByEmployee: [createGraphQLVehicle({ color: null })]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value[0].color).toBeNull();
		});
	});

	describe('create', () => {
		it('should create and return a vehicle', async () => {
			const graphqlData = createGraphQLVehicle();
			mockGraphQL.setMockData({ createVehicle: graphqlData });

			// We need a domain Vehicle entity to pass in
			const { VehicleMake, VehicleModel, VehicleYear, LicensePlate, VehicleColor } = await import('$domain/Vehicle');
			const vehicleResult = Vehicle.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				make: VehicleMake.create('Toyota').value,
				model: VehicleModel.create('Camry').value,
				year: VehicleYear.create(2023).value,
				color: VehicleColor.create('Red').value,
				licensePlate: LicensePlate.create('ABC-1234').value,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01')
			});
			const vehicle = vehicleResult.value;

			const result = await adapter.create(vehicle);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(Vehicle);
		});

		it('should return InvalidVehicleError when mutation returns no data', async () => {
			mockGraphQL.setMockData({ createVehicle: null });

			const { VehicleMake, VehicleModel, VehicleYear, LicensePlate, VehicleColor } = await import('$domain/Vehicle');
			const vehicleResult = Vehicle.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				make: VehicleMake.create('Toyota').value,
				model: VehicleModel.create('Camry').value,
				year: VehicleYear.create(2023).value,
				color: VehicleColor.create(null).value,
				licensePlate: LicensePlate.create('ABC-1234').value,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01')
			});

			const result = await adapter.create(vehicleResult.value);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidVehicleError);
		});

		it('should return InvalidVehicleError when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const { VehicleMake, VehicleModel, VehicleYear, LicensePlate, VehicleColor } = await import('$domain/Vehicle');
			const vehicleResult = Vehicle.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				make: VehicleMake.create('Toyota').value,
				model: VehicleModel.create('Camry').value,
				year: VehicleYear.create(2023).value,
				color: VehicleColor.create(null).value,
				licensePlate: LicensePlate.create('ABC-1234').value,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01')
			});

			const result = await adapter.create(vehicleResult.value);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidVehicleError);
		});
	});

	describe('update', () => {
		it('should update and return the vehicle', async () => {
			const graphqlData = createGraphQLVehicle({ make: 'Honda', model: 'Accord' });
			mockGraphQL.setMockData({ updateVehicle: graphqlData });

			const { VehicleMake, VehicleModel, VehicleYear, LicensePlate, VehicleColor } = await import('$domain/Vehicle');
			const vehicleResult = Vehicle.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				make: VehicleMake.create('Honda').value,
				model: VehicleModel.create('Accord').value,
				year: VehicleYear.create(2022).value,
				color: VehicleColor.create(null).value,
				licensePlate: LicensePlate.create('ABC-1234').value,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01')
			});

			const result = await adapter.update(vehicleResult.value);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(Vehicle);
		});

		it('should return InvalidVehicleError when mutation returns no data', async () => {
			mockGraphQL.setMockData({ updateVehicle: null });

			const { VehicleMake, VehicleModel, VehicleYear, LicensePlate, VehicleColor } = await import('$domain/Vehicle');
			const vehicleResult = Vehicle.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				make: VehicleMake.create('Honda').value,
				model: VehicleModel.create('Accord').value,
				year: VehicleYear.create(2022).value,
				color: VehicleColor.create(null).value,
				licensePlate: LicensePlate.create('ABC-1234').value,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01')
			});

			const result = await adapter.update(vehicleResult.value);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidVehicleError);
		});

		it('should return InvalidVehicleError when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const { VehicleMake, VehicleModel, VehicleYear, LicensePlate, VehicleColor } = await import('$domain/Vehicle');
			const vehicleResult = Vehicle.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				make: VehicleMake.create('Toyota').value,
				model: VehicleModel.create('Camry').value,
				year: VehicleYear.create(2023).value,
				color: VehicleColor.create(null).value,
				licensePlate: LicensePlate.create('ABC-1234').value,
				createdAt: new Date('2025-01-01'),
				updatedAt: new Date('2025-01-01')
			});

			const result = await adapter.update(vehicleResult.value);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidVehicleError);
		});
	});

	describe('delete', () => {
		it('should successfully delete a vehicle', async () => {
			mockGraphQL.setMockData({ deleteVehicle: true });

			const result = await adapter.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
		});

		it('should return VehicleNotFoundError when delete returns false', async () => {
			mockGraphQL.setMockData({ deleteVehicle: false });

			const result = await adapter.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
		});

		it('should return VehicleNotFoundError when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
		});
	});

	describe('mapToEntity (resilient error handling)', () => {
		it('should return null for vehicle with invalid make (empty)', async () => {
			mockGraphQL.setMockData({
				vehicle: createGraphQLVehicle({ make: '' })
			});

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for vehicle with invalid license plate (special chars)', async () => {
			mockGraphQL.setMockData({
				vehicle: createGraphQLVehicle({ licensePlate: '!@#$%' })
			});

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for vehicle with invalid createdAt date', async () => {
			mockGraphQL.setMockData({
				vehicle: createGraphQLVehicle({ createdAt: 'not-a-date' })
			});

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle vehicle with null color', async () => {
			mockGraphQL.setMockData({
				vehicle: createGraphQLVehicle({ color: null })
			});

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(Vehicle);
			expect(result.value?.color).toBeNull();
		});
	});
});
