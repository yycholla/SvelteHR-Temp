// src/services/CompensationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompensationService } from './CompensationService';
import type { CompensationRepository } from './ports/CompensationRepository';
import { Result } from '$domain/Result';
import {
	CompensationRecord,
	Salary,
	SalaryGrade,
	CompensationType,
	PaymentFrequency,
	EffectiveDate,
	CompensationNotFoundError,
	InvalidCompensationError,
	InvalidSalaryError
} from '$domain/Compensation';

describe('CompensationService', () => {
	let mockRepository: CompensationRepository;
	let service: CompensationService;
	let mockCompensation: CompensationRecord;

	beforeEach(() => {
		// Create valid test compensation record
		const salaryResult = Salary.create(75000, 'USD');
		if (salaryResult.isError) throw new Error('Test setup failed: invalid salary');
		const salary = salaryResult.value;

		const gradeResult = SalaryGrade.create('mid');
		if (gradeResult.isError) throw new Error('Test setup failed: invalid grade');
		const grade = gradeResult.value;

		const typeResult = CompensationType.create('salary');
		if (typeResult.isError) throw new Error('Test setup failed: invalid type');
		const type = typeResult.value;

		const frequencyResult = PaymentFrequency.create('monthly');
		if (frequencyResult.isError) throw new Error('Test setup failed: invalid frequency');
		const frequency = frequencyResult.value;

		const effectiveDateResult = EffectiveDate.create(new Date('2024-01-01'));
		if (effectiveDateResult.isError) throw new Error('Test setup failed: invalid date');
		const effectiveDate = effectiveDateResult.value;

		const compensationResult = CompensationRecord.create({
			id: '123e4567-e89b-12d3-a456-426614174000',
			employeeId: '123e4567-e89b-12d3-a456-426614174001',
			salary,
			salaryGrade: grade,
			compensationType: type,
			paymentFrequency: frequency,
			effectiveDate,
			endDate: null,
			notes: 'Annual review increase'
		});
		if (compensationResult.isError) throw new Error('Test setup failed: invalid compensation');
		mockCompensation = compensationResult.value;

		mockRepository = {
			findById: vi.fn(),
			findByEmployeeId: vi.fn(),
			findActiveByEmployeeId: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			terminate: vi.fn(),
			delete: vi.fn()
		};

		service = new CompensationService(mockRepository);
	});

	describe('getById', () => {
		it('should return compensation record when found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(mockCompensation));

			const result = await service.getById(mockCompensation.id);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockCompensation);
			expect(mockRepository.findById).toHaveBeenCalledWith(mockCompensation.id);
		});

		it('should return error when compensation not found', async () => {
			const error = new CompensationNotFoundError('non-existent-id');
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.error(error));

			const result = await service.getById('non-existent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.getById(mockCompensation.id);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch compensation record');
		});
	});

	describe('getByEmployeeId', () => {
		it('should return compensation records for employee', async () => {
			const records = [mockCompensation];
			vi.mocked(mockRepository.findByEmployeeId).mockResolvedValue(Result.ok(records));

			const result = await service.getByEmployeeId(mockCompensation.employeeId);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(records);
			expect(mockRepository.findByEmployeeId).toHaveBeenCalledWith(mockCompensation.employeeId);
		});

		it('should return empty array when no records found', async () => {
			vi.mocked(mockRepository.findByEmployeeId).mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeId('employee-id');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should handle repository errors', async () => {
			const error = new InvalidCompensationError('Invalid employee ID');
			vi.mocked(mockRepository.findByEmployeeId).mockResolvedValue(Result.error(error));

			const result = await service.getByEmployeeId('invalid-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});
	});

	describe('getActiveByEmployeeId', () => {
		it('should return active compensation record', async () => {
			vi.mocked(mockRepository.findActiveByEmployeeId).mockResolvedValue(
				Result.ok(mockCompensation)
			);

			const result = await service.getActiveByEmployeeId(mockCompensation.employeeId);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockCompensation);
		});

		it('should return null when no active compensation exists', async () => {
			vi.mocked(mockRepository.findActiveByEmployeeId).mockResolvedValue(Result.ok(null));

			const result = await service.getActiveByEmployeeId('employee-id');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('getAllCompensations', () => {
		it('should return all compensation records without filter', async () => {
			const records = [mockCompensation];
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok(records));

			const result = await service.getAllCompensations();

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(records);
			expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
		});

		it('should return filtered compensation records', async () => {
			const filter = { salaryGrade: 'mid', isActive: true };
			const records = [mockCompensation];
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok(records));

			const result = await service.getAllCompensations(filter);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(records);
			expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
		});
	});

	describe('createCompensation', () => {
		it('should create valid compensation record', async () => {
			const data = {
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			};

			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(mockCompensation));

			const result = await service.createCompensation(data);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockCompensation);
			expect(mockRepository.create).toHaveBeenCalledWith(data);
		});

		it('should reject invalid salary', async () => {
			const data = {
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				salary: -1000, // Invalid negative salary
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			};

			const result = await service.createCompensation(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidSalaryError);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should reject invalid salary grade', async () => {
			const data = {
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'INVALID', // Invalid grade
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			};

			const result = await service.createCompensation(data);

			expect(result.isError).toBe(true);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should reject invalid compensation type', async () => {
			const data = {
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'invalid-type', // Invalid type
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			};

			const result = await service.createCompensation(data);

			expect(result.isError).toBe(true);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should create with end date when provided', async () => {
			const data = {
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01',
				endDate: '2024-12-31'
			};

			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(mockCompensation));

			const result = await service.createCompensation(data);

			expect(result.isOk).toBe(true);
			expect(mockRepository.create).toHaveBeenCalledWith(data);
		});
	});

	describe('updateCompensation', () => {
		it('should update compensation record', async () => {
			const updates = {
				salary: 80000,
				currency: 'USD',
				salaryGrade: 'senior'
			};

			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(mockCompensation));

			const result = await service.updateCompensation(mockCompensation.id, updates);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockCompensation);
			expect(mockRepository.update).toHaveBeenCalledWith(mockCompensation.id, updates);
		});

		it('should reject invalid salary in update', async () => {
			const updates = {
				salary: -5000,
				currency: 'USD'
			};

			const result = await service.updateCompensation(mockCompensation.id, updates);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidSalaryError);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should update only provided fields', async () => {
			const updates = {
				notes: 'Updated notes'
			};

			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(mockCompensation));

			const result = await service.updateCompensation(mockCompensation.id, updates);

			expect(result.isOk).toBe(true);
			expect(mockRepository.update).toHaveBeenCalledWith(mockCompensation.id, updates);
		});

		it('should return error when compensation not found', async () => {
			const error = new CompensationNotFoundError('invalid-id');
			vi.mocked(mockRepository.update).mockResolvedValue(Result.error(error));

			const result = await service.updateCompensation('invalid-id', { notes: 'test' });

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});
	});

	describe('terminateCompensation', () => {
		it('should terminate compensation record with valid end date', async () => {
			vi.mocked(mockRepository.terminate).mockResolvedValue(Result.ok(mockCompensation));

			const result = await service.terminateCompensation(mockCompensation.id, '2024-12-31');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockCompensation);
			expect(mockRepository.terminate).toHaveBeenCalledWith(mockCompensation.id, '2024-12-31');
		});

		it('should reject invalid end date', async () => {
			const result = await service.terminateCompensation(mockCompensation.id, 'invalid-date');

			expect(result.isError).toBe(true);
			expect(mockRepository.terminate).not.toHaveBeenCalled();
		});

		it('should return error when compensation not found', async () => {
			const error = new CompensationNotFoundError('invalid-id');
			vi.mocked(mockRepository.terminate).mockResolvedValue(Result.error(error));

			const result = await service.terminateCompensation('invalid-id', '2024-12-31');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});
	});

	describe('deleteCompensation', () => {
		it('should delete compensation record', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteCompensation(mockCompensation.id);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
			expect(mockRepository.delete).toHaveBeenCalledWith(mockCompensation.id);
		});

		it('should return error when compensation not found', async () => {
			const error = new CompensationNotFoundError('invalid-id');
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.error(error));

			const result = await service.deleteCompensation('invalid-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Database error'));

			const result = await service.deleteCompensation(mockCompensation.id);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to delete compensation record');
		});
	});
});
