// src/services/VehicleService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VehicleService } from './VehicleService';
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
import { Result } from '$domain/Result';
import type { VehicleRepository } from './ports/VehicleRepository';
import type { VehicleError } from '$domain/Vehicle';

const VALID_UUID_1 = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174001';

function createMockVehicle(
	overrides: Partial<{
		id: string;
		employeeId: string;
		make: string;
		model: string;
		year: number;
		color: string | null;
		licensePlate: string;
	}> = {}
): Vehicle {
	const data = {
		id: VALID_UUID_1,
		employeeId: VALID_UUID_2,
		make: 'Toyota',
		model: 'Camry',
		year: 2023,
		color: 'Red',
		licensePlate: 'ABC-1234',
		...overrides
	};

	const vehicleResult = Vehicle.create({
		id: data.id,
		employeeId: data.employeeId,
		make: VehicleMake.create(data.make).value,
		model: VehicleModel.create(data.model).value,
		year: VehicleYear.create(data.year).value,
		color: VehicleColor.create(data.color).value,
		licensePlate: LicensePlate.create(data.licensePlate).value,
		createdAt: new Date(2024, 0, 1),
		updatedAt: new Date(2024, 0, 1)
	});

	return vehicleResult.value;
}

class MockRepository implements VehicleRepository {
	findById = vi.fn<(id: string) => Promise<Result<Vehicle | null, VehicleError>>>();
	findByEmployeeId = vi.fn<(employeeId: string) => Promise<Result<Vehicle[], VehicleError>>>();
	create = vi.fn<(vehicle: Vehicle) => Promise<Result<Vehicle, VehicleError>>>();
	update = vi.fn<(vehicle: Vehicle) => Promise<Result<Vehicle, VehicleError>>>();
	delete = vi.fn<(id: string) => Promise<Result<void, VehicleError>>>();
}

describe('VehicleService', () => {
	let service: VehicleService;
	let mockRepo: MockRepository;

	beforeEach(() => {
		mockRepo = new MockRepository();
		service = new VehicleService(mockRepo);
	});

	describe('getById', () => {
		it('should return vehicle when found', async () => {
			const vehicle = createMockVehicle();
			mockRepo.findById.mockResolvedValue(Result.ok(vehicle));

			const result = await service.getById(VALID_UUID_1);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(vehicle);
		});

		it('should return VehicleNotFoundError when vehicle is null', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.getById(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
			expect(result.error.code).toBe('VEHICLE_NOT_FOUND');
		});

		it('should return error when repository returns error', async () => {
			mockRepo.findById.mockResolvedValue(
				Result.error(new InvalidVehicleError('DB error'))
			);

			const result = await service.getById(VALID_UUID_1);

			expect(result.isError).toBe(true);
		});

		it('should return VehicleNotFoundError when repository throws', async () => {
			mockRepo.findById.mockRejectedValue(new Error('network failure'));

			const result = await service.getById(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
		});
	});

	describe('getByEmployeeId', () => {
		it('should return all vehicles for an employee', async () => {
			const vehicles = [createMockVehicle(), createMockVehicle({ id: '323e4567-e89b-12d3-a456-426614174002' })];
			mockRepo.findByEmployeeId.mockResolvedValue(Result.ok(vehicles));

			const result = await service.getByEmployeeId(VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when employee has no vehicles', async () => {
			mockRepo.findByEmployeeId.mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeId(VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return VehicleNotFoundError when repository throws', async () => {
			mockRepo.findByEmployeeId.mockRejectedValue(new Error('timeout'));

			const result = await service.getByEmployeeId(VALID_UUID_2);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
		});
	});

	describe('create', () => {
		it('should create a vehicle with valid input', async () => {
			const vehicle = createMockVehicle();
			mockRepo.create.mockResolvedValue(Result.ok(vehicle));

			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				make: 'Toyota',
				model: 'Camry',
				year: 2023,
				color: 'Red',
				licensePlate: 'ABC-1234'
			});

			expect(result.isOk).toBe(true);
			expect(mockRepo.create).toHaveBeenCalledOnce();
		});

		it('should create a vehicle without color (null)', async () => {
			const vehicle = createMockVehicle({ color: null });
			mockRepo.create.mockResolvedValue(Result.ok(vehicle));

			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				make: 'Honda',
				model: 'Civic',
				year: 2022,
				licensePlate: 'XYZ-567'
			});

			expect(result.isOk).toBe(true);
		});

		it('should return error for invalid make', async () => {
			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				make: '',
				model: 'Camry',
				year: 2023,
				licensePlate: 'ABC-1234'
			});

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('empty');
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid year', async () => {
			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				make: 'Toyota',
				model: 'Camry',
				year: 1800,
				licensePlate: 'ABC-1234'
			});

			expect(result.isError).toBe(true);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid license plate', async () => {
			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				make: 'Toyota',
				model: 'Camry',
				year: 2023,
				licensePlate: ''
			});

			expect(result.isError).toBe(true);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid vehicle ID (not UUID)', async () => {
			const result = await service.create({
				id: 'not-a-uuid',
				employeeId: VALID_UUID_2,
				make: 'Toyota',
				model: 'Camry',
				year: 2023,
				licensePlate: 'ABC-1234'
			});

			expect(result.isError).toBe(true);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return InvalidVehicleError when repository throws', async () => {
			mockRepo.create.mockRejectedValue(new Error('DB write failed'));

			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				make: 'Toyota',
				model: 'Camry',
				year: 2023,
				licensePlate: 'ABC-1234'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidVehicleError);
		});
	});

	describe('update', () => {
		it('should update a vehicle with valid input', async () => {
			const existing = createMockVehicle();
			const updated = createMockVehicle({ make: 'Honda', model: 'Accord', year: 2022 });
			mockRepo.findById.mockResolvedValue(Result.ok(existing));
			mockRepo.update.mockResolvedValue(Result.ok(updated));

			const result = await service.update(VALID_UUID_1, {
				make: 'Honda',
				model: 'Accord',
				year: 2022,
				color: 'Blue'
			});

			expect(result.isOk).toBe(true);
			expect(mockRepo.update).toHaveBeenCalledOnce();
		});

		it('should return VehicleNotFoundError when vehicle not found', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.update(VALID_UUID_1, {
				make: 'Honda',
				model: 'Accord',
				year: 2022
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
			expect(mockRepo.update).not.toHaveBeenCalled();
		});

		it('should return error for invalid make on update', async () => {
			const existing = createMockVehicle();
			mockRepo.findById.mockResolvedValue(Result.ok(existing));

			const result = await service.update(VALID_UUID_1, {
				make: '',
				model: 'Accord',
				year: 2022
			});

			expect(result.isError).toBe(true);
			expect(mockRepo.update).not.toHaveBeenCalled();
		});

		it('should return VehicleNotFoundError when repository throws', async () => {
			mockRepo.findById.mockRejectedValue(new Error('timeout'));

			const result = await service.update(VALID_UUID_1, {
				make: 'Honda',
				model: 'Accord',
				year: 2022
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
		});
	});

	describe('delete', () => {
		it('should delete a vehicle that exists', async () => {
			const vehicle = createMockVehicle();
			mockRepo.findById.mockResolvedValue(Result.ok(vehicle));
			mockRepo.delete.mockResolvedValue(Result.ok(undefined));

			const result = await service.delete(VALID_UUID_1);

			expect(result.isOk).toBe(true);
			expect(mockRepo.delete).toHaveBeenCalledWith(VALID_UUID_1);
		});

		it('should return VehicleNotFoundError when vehicle does not exist', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.delete(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
			expect(mockRepo.delete).not.toHaveBeenCalled();
		});

		it('should return error when findById returns error', async () => {
			mockRepo.findById.mockResolvedValue(
				Result.error(new InvalidVehicleError('DB error'))
			);

			const result = await service.delete(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(mockRepo.delete).not.toHaveBeenCalled();
		});

		it('should return VehicleNotFoundError when repository throws', async () => {
			mockRepo.findById.mockRejectedValue(new Error('connection lost'));

			const result = await service.delete(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(VehicleNotFoundError);
		});
	});
});
