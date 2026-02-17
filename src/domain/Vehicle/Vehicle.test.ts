// src/domain/Vehicle/Vehicle.test.ts
import { describe, it, expect } from 'vitest';
import { Vehicle } from './Vehicle';
import { VehicleMake } from './value-objects/VehicleMake';
import { VehicleModel } from './value-objects/VehicleModel';
import { VehicleYear } from './value-objects/VehicleYear';
import { LicensePlate } from './value-objects/LicensePlate';
import { VehicleColor } from './value-objects/VehicleColor';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174001';

function makeMake(value = 'Toyota') {
	return VehicleMake.create(value).value;
}

function makeModel(value = 'Camry') {
	return VehicleModel.create(value).value;
}

function makeYear(value = 2023) {
	return VehicleYear.create(value).value;
}

function makePlate(value = 'ABC-1234') {
	return LicensePlate.create(value).value;
}

function makeColor(value: string | null = 'Red') {
	return VehicleColor.create(value).value;
}

function makeVehicle(overrides: Partial<Parameters<typeof Vehicle.create>[0]> = {}) {
	return Vehicle.create({
		id: VALID_UUID,
		employeeId: VALID_EMPLOYEE_UUID,
		make: makeMake(),
		model: makeModel(),
		year: makeYear(),
		color: makeColor(),
		licensePlate: makePlate(),
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-15'),
		...overrides
	});
}

describe('Vehicle', () => {
	describe('create()', () => {
		it('should create a valid Vehicle', () => {
			const result = makeVehicle();
			expect(result.isOk).toBe(true);
		});

		it('should create a Vehicle with null color', () => {
			const result = makeVehicle({ color: null });
			expect(result.isOk).toBe(true);
			expect(result.value.color).toBeNull();
		});

		it('should reject an invalid id (not a UUID)', () => {
			const result = makeVehicle({ id: 'not-a-uuid' });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid vehicle ID');
		});

		it('should reject an invalid employeeId (not a UUID)', () => {
			const result = makeVehicle({ employeeId: 'bad-id' });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid employee ID');
		});

		it('should reject an invalid createdAt date', () => {
			const result = makeVehicle({ createdAt: new Date('not-a-date') });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('createdAt');
		});

		it('should reject an invalid updatedAt date', () => {
			const result = makeVehicle({ updatedAt: new Date('not-a-date') });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('updatedAt');
		});

		it('should have error code INVALID_VEHICLE on failure', () => {
			const result = makeVehicle({ id: 'bad' });
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_VEHICLE');
		});
	});

	describe('getters', () => {
		it('should return the correct id', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.id).toBe(VALID_UUID);
		});

		it('should return the correct employeeId', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.employeeId).toBe(VALID_EMPLOYEE_UUID);
		});

		it('should return the correct make', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.make.value).toBe('Toyota');
		});

		it('should return the correct model', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.model.value).toBe('Camry');
		});

		it('should return the correct year', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.year.value).toBe(2023);
		});

		it('should return the correct color', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.color?.value).toBe('Red');
		});

		it('should return the correct licensePlate', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.licensePlate.value).toBe('ABC-1234');
		});

		it('should return defensive copies of createdAt', () => {
			const original = new Date(2024, 0, 1); // Jan 1 2024 local time
			const vehicle = makeVehicle({ createdAt: original }).value;
			const date1 = vehicle.createdAt;
			date1.setFullYear(2000);
			const date2 = vehicle.createdAt;
			expect(date2.getFullYear()).toBe(2024);
		});

		it('should return defensive copies of updatedAt', () => {
			const original = new Date(2024, 0, 15); // Jan 15 2024 local time
			const vehicle = makeVehicle({ updatedAt: original }).value;
			const date1 = vehicle.updatedAt;
			date1.setFullYear(2000);
			const date2 = vehicle.updatedAt;
			expect(date2.getFullYear()).toBe(2024);
		});
	});

	describe('displayName', () => {
		it('should return "year make model" format', () => {
			const vehicle = makeVehicle().value;
			expect(vehicle.displayName).toBe('2023 Toyota Camry');
		});

		it('should include correct year in display name', () => {
			const vehicle = makeVehicle({ year: makeYear(1995) }).value;
			expect(vehicle.displayName).toContain('1995');
		});
	});

	describe('updateDetails()', () => {
		it('should return a new Vehicle with updated make, model, year, and color', () => {
			const vehicle = makeVehicle().value;
			const newMake = makeMake('Honda');
			const newModel = makeModel('Civic');
			const newYear = makeYear(2022);
			const newColor = makeColor('Blue');

			const updated = vehicle.updateDetails(newMake, newModel, newYear, newColor);

			expect(updated.make.value).toBe('Honda');
			expect(updated.model.value).toBe('Civic');
			expect(updated.year.value).toBe(2022);
			expect(updated.color?.value).toBe('Blue');
		});

		it('should preserve id, employeeId, and licensePlate when updating', () => {
			const vehicle = makeVehicle().value;
			const updated = vehicle.updateDetails(makeMake('BMW'), makeModel('3 Series'), makeYear(2021), null);
			expect(updated.id).toBe(vehicle.id);
			expect(updated.employeeId).toBe(vehicle.employeeId);
			expect(updated.licensePlate.value).toBe(vehicle.licensePlate.value);
		});

		it('should update color to null', () => {
			const vehicle = makeVehicle().value;
			const updated = vehicle.updateDetails(vehicle.make, vehicle.model, vehicle.year, null);
			expect(updated.color).toBeNull();
		});

		it('should not mutate the original vehicle', () => {
			const vehicle = makeVehicle().value;
			const originalMake = vehicle.make.value;
			vehicle.updateDetails(makeMake('Ford'), makeModel('Focus'), makeYear(2020), null);
			expect(vehicle.make.value).toBe(originalMake);
		});

		it('should update the updatedAt timestamp', () => {
			const before = new Date();
			const vehicle = makeVehicle().value;
			const updated = vehicle.updateDetails(vehicle.make, vehicle.model, vehicle.year, null);
			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
		});
	});
});
