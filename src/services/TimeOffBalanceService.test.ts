// src/services/TimeOffBalanceService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeOffBalanceService } from './TimeOffBalanceService';
import type { TimeOffBalanceRepository } from './ports/TimeOffBalanceRepository';
import { Result } from '$domain/Result';
import {
	TimeOffBalanceRecord,
	BalanceHours,
	LeaveType,
	BalancePeriod,
	AccrualRate,
	CarryoverHours,
	TimeOffBalanceNotFoundError,
	InvalidAccrualCalculationError,
	TimeOffBalanceValidationError,
	InsufficientBalanceError
} from '$domain/TimeOffBalance';

describe('TimeOffBalanceService', () => {
	let mockRepository: TimeOffBalanceRepository;
	let service: TimeOffBalanceService;
	let mockBalance: TimeOffBalanceRecord;

	beforeEach(() => {
		// Create valid test balance record
		const leaveTypeResult = LeaveType.create('vacation');
		if (leaveTypeResult.isError) throw new Error('Test setup failed: invalid leave type');
		const leaveType = leaveTypeResult.value;

		const periodResult = BalancePeriod.create(2026);
		if (periodResult.isError) throw new Error('Test setup failed: invalid period');
		const period = periodResult.value;

		const totalHoursResult = BalanceHours.create(160);
		if (totalHoursResult.isError) throw new Error('Test setup failed: invalid total hours');
		const totalHours = totalHoursResult.value;

		const usedHoursResult = BalanceHours.create(40);
		if (usedHoursResult.isError) throw new Error('Test setup failed: invalid used hours');
		const usedHours = usedHoursResult.value;

		const accrualRateResult = AccrualRate.create(5, 'month');
		if (accrualRateResult.isError) throw new Error('Test setup failed: invalid accrual rate');
		const accrualRate = accrualRateResult.value;

		const carryoverResult = CarryoverHours.create(20);
		if (carryoverResult.isError) throw new Error('Test setup failed: invalid carryover');
		const carryover = carryoverResult.value;

		const balanceResult = TimeOffBalanceRecord.create({
			id: '550e8400-e29b-41d4-a716-446655440000',
			employeeId: '660e8400-e29b-41d4-a716-446655440001',
			leaveType,
			period,
			totalHours,
			usedHours,
			accrualRate,
			carryoverHours: carryover
		});
		if (balanceResult.isError) throw new Error('Test setup failed: invalid balance');
		mockBalance = balanceResult.value;

		mockRepository = {
			findById: vi.fn(),
			findByEmployeeId: vi.fn(),
			findByEmployeeIdAndType: vi.fn(),
			findByPeriod: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		};

		service = new TimeOffBalanceService(mockRepository);
	});

	describe('getById', () => {
		it('should return balance record when found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(mockBalance));

			const result = await service.getById(mockBalance.id);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockBalance);
			expect(mockRepository.findById).toHaveBeenCalledWith(mockBalance.id);
		});

		it('should return error when balance not found', async () => {
			const error = new TimeOffBalanceNotFoundError('non-existent-id');
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.error(error));

			const result = await service.getById('non-existent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.getById(mockBalance.id);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch time off balance record');
		});
	});

	describe('getByEmployeeId', () => {
		it('should return all balances for employee', async () => {
			const balances = [mockBalance];
			vi.mocked(mockRepository.findByEmployeeId).mockResolvedValue(Result.ok(balances));

			const result = await service.getByEmployeeId(mockBalance.employeeId);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(balances);
			expect(mockRepository.findByEmployeeId).toHaveBeenCalledWith(mockBalance.employeeId);
		});

		it('should return empty array when no balances found', async () => {
			vi.mocked(mockRepository.findByEmployeeId).mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeId('some-employee-id');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should handle repository errors', async () => {
			const error = new InvalidAccrualCalculationError('Calculation failed');
			vi.mocked(mockRepository.findByEmployeeId).mockResolvedValue(Result.error(error));

			const result = await service.getByEmployeeId(mockBalance.employeeId);

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findByEmployeeId).mockRejectedValue(new Error('Database error'));

			const result = await service.getByEmployeeId(mockBalance.employeeId);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch employee balance records');
		});
	});

	describe('getByEmployeeIdAndType', () => {
		it('should return balances for employee and type', async () => {
			const balances = [mockBalance];
			vi.mocked(mockRepository.findByEmployeeIdAndType).mockResolvedValue(Result.ok(balances));

			const result = await service.getByEmployeeIdAndType(mockBalance.employeeId, 'vacation');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(balances);
			expect(mockRepository.findByEmployeeIdAndType).toHaveBeenCalledWith(
				mockBalance.employeeId,
				'vacation'
			);
		});

		it('should return empty array when no balances found', async () => {
			vi.mocked(mockRepository.findByEmployeeIdAndType).mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeIdAndType('some-employee-id', 'sick');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should handle repository errors', async () => {
			const error = new InvalidAccrualCalculationError('Calculation failed');
			vi.mocked(mockRepository.findByEmployeeIdAndType).mockResolvedValue(Result.error(error));

			const result = await service.getByEmployeeIdAndType(mockBalance.employeeId, 'vacation');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findByEmployeeIdAndType).mockRejectedValue(
				new Error('Database error')
			);

			const result = await service.getByEmployeeIdAndType(mockBalance.employeeId, 'vacation');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch balance records by type');
		});
	});

	describe('getByPeriod', () => {
		it('should return all balances for period', async () => {
			const balances = [mockBalance];
			vi.mocked(mockRepository.findByPeriod).mockResolvedValue(Result.ok(balances));

			const result = await service.getByPeriod(2026);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(balances);
			expect(mockRepository.findByPeriod).toHaveBeenCalledWith(2026);
		});

		it('should return empty array when no balances found', async () => {
			vi.mocked(mockRepository.findByPeriod).mockResolvedValue(Result.ok([]));

			const result = await service.getByPeriod(2025);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should handle repository errors', async () => {
			const error = new InvalidAccrualCalculationError('Calculation failed');
			vi.mocked(mockRepository.findByPeriod).mockResolvedValue(Result.error(error));

			const result = await service.getByPeriod(2026);

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findByPeriod).mockRejectedValue(new Error('Database error'));

			const result = await service.getByPeriod(2026);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch balance records by period');
		});
	});

	describe('getAllBalances', () => {
		it('should return all balances without filter', async () => {
			const balances = [mockBalance];
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok(balances));

			const result = await service.getAllBalances();

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(balances);
			expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
		});

		it('should return all balances with filter', async () => {
			const balances = [mockBalance];
			const filter = { employeeId: mockBalance.employeeId, year: 2026 };
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok(balances));

			const result = await service.getAllBalances(filter);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual(balances);
			expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
		});

		it('should return empty array when no balances found', async () => {
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([]));

			const result = await service.getAllBalances();

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should handle repository errors', async () => {
			const error = new InvalidAccrualCalculationError('Calculation failed');
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.error(error));

			const result = await service.getAllBalances();

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('Database error'));

			const result = await service.getAllBalances();

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch balance records');
		});
	});

	describe('createBalance', () => {
		const validData = {
			employeeId: '660e8400-e29b-41d4-a716-446655440001',
			leaveType: 'vacation',
			year: 2026,
			totalHours: 160,
			usedHours: 0,
			accrualRate: 5,
			accrualPeriod: 'month' as const,
			carryoverHours: 0
		};

		it('should create balance with valid data', async () => {
			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(mockBalance));

			const result = await service.createBalance(validData);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockBalance);
			expect(mockRepository.create).toHaveBeenCalledWith(validData);
		});

		it('should validate leave type before creating', async () => {
			const invalidData = { ...validData, leaveType: 'invalid-type' };

			const result = await service.createBalance(invalidData);

			expect(result.isError).toBe(true);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should validate year before creating', async () => {
			const invalidData = { ...validData, year: 1899 };

			const result = await service.createBalance(invalidData);

			expect(result.isError).toBe(true);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should validate total hours before creating', async () => {
			const invalidData = { ...validData, totalHours: -10 };

			const result = await service.createBalance(invalidData);

			expect(result.isError).toBe(true);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should validate accrual rate before creating', async () => {
			const invalidData = { ...validData, accrualRate: -5 };

			const result = await service.createBalance(invalidData);

			expect(result.isError).toBe(true);
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should use default values for optional fields', async () => {
			const minimalData = {
				employeeId: '660e8400-e29b-41d4-a716-446655440001',
				leaveType: 'vacation',
				year: 2026,
				totalHours: 160,
				accrualRate: 5,
				accrualPeriod: 'month' as const
			};
			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(mockBalance));

			const result = await service.createBalance(minimalData);

			expect(result.isOk).toBe(true);
			expect(mockRepository.create).toHaveBeenCalled();
		});

		it('should handle repository errors', async () => {
			const error = new TimeOffBalanceValidationError('Creation failed');
			vi.mocked(mockRepository.create).mockResolvedValue(Result.error(error));

			const result = await service.createBalance(validData);

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.create).mockRejectedValue(new Error('Database error'));

			const result = await service.createBalance(validData);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to create balance record');
		});
	});

	describe('updateBalance', () => {
		it('should update balance with valid data', async () => {
			const updateData = { totalHours: 200 };
			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(mockBalance));

			const result = await service.updateBalance(mockBalance.id, updateData);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockBalance);
			expect(mockRepository.update).toHaveBeenCalledWith(mockBalance.id, updateData);
		});

		it('should validate total hours if provided', async () => {
			const updateData = { totalHours: -50 };

			const result = await service.updateBalance(mockBalance.id, updateData);

			expect(result.isError).toBe(true);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should validate used hours if provided', async () => {
			const updateData = { usedHours: -10 };

			const result = await service.updateBalance(mockBalance.id, updateData);

			expect(result.isError).toBe(true);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should validate accrual rate if provided', async () => {
			const updateData = { accrualRate: -5, accrualPeriod: 'month' as const };

			const result = await service.updateBalance(mockBalance.id, updateData);

			expect(result.isError).toBe(true);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should validate carryover hours if provided', async () => {
			const updateData = { carryoverHours: -20 };

			const result = await service.updateBalance(mockBalance.id, updateData);

			expect(result.isError).toBe(true);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should handle repository not found error', async () => {
			const error = new TimeOffBalanceNotFoundError('balance-123');
			vi.mocked(mockRepository.update).mockResolvedValue(Result.error(error));

			const result = await service.updateBalance('balance-123', { totalHours: 200 });

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.update).mockRejectedValue(new Error('Database error'));

			const result = await service.updateBalance(mockBalance.id, { totalHours: 200 });

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to update balance record');
		});
	});

	describe('useBalance', () => {
		it('should delegate to entity useHours method', async () => {
			const hoursToUse = 8;
			const hoursResult = BalanceHours.create(hoursToUse);
			if (hoursResult.isError) throw new Error('Test setup failed');

			// Mock repository to return the balance
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(mockBalance));

			// Mock update to return updated balance
			const updatedUsedHoursResult = BalanceHours.create(48); // 40 + 8
			if (updatedUsedHoursResult.isError) throw new Error('Test setup failed');
			const updatedBalanceResult = TimeOffBalanceRecord.create({
				id: mockBalance.id,
				employeeId: mockBalance.employeeId,
				leaveType: mockBalance.leaveType,
				period: mockBalance.period,
				totalHours: mockBalance.totalHours,
				usedHours: updatedUsedHoursResult.value,
				accrualRate: mockBalance.accrualRate,
				carryoverHours: mockBalance.carryoverHours
			});
			if (updatedBalanceResult.isError) throw new Error('Test setup failed');
			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(updatedBalanceResult.value));

			const result = await service.useBalance(mockBalance.id, hoursToUse);

			expect(result.isOk).toBe(true);
			expect(mockRepository.findById).toHaveBeenCalledWith(mockBalance.id);
			expect(mockRepository.update).toHaveBeenCalledWith(mockBalance.id, { usedHours: 48 });
		});

		it('should return error when balance not found', async () => {
			const error = new TimeOffBalanceNotFoundError('non-existent-id');
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.error(error));

			const result = await service.useBalance('non-existent-id', 8);

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should return error when insufficient balance', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(mockBalance));

			const result = await service.useBalance(mockBalance.id, 200); // More than available

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InsufficientBalanceError);
		});

		it('should validate hours parameter', async () => {
			const result = await service.useBalance(mockBalance.id, -10);

			expect(result.isError).toBe(true);
			expect(mockRepository.findById).not.toHaveBeenCalled();
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.useBalance(mockBalance.id, 8);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to use balance hours');
		});
	});

	describe('addBalance', () => {
		it('should delegate to entity addHours method', async () => {
			const hoursToAdd = 40;
			const hoursResult = BalanceHours.create(hoursToAdd);
			if (hoursResult.isError) throw new Error('Test setup failed');

			// Mock repository to return the balance
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(mockBalance));

			// Mock update to return updated balance
			const updatedTotalHoursResult = BalanceHours.create(200); // 160 + 40
			if (updatedTotalHoursResult.isError) throw new Error('Test setup failed');
			const updatedBalanceResult = TimeOffBalanceRecord.create({
				id: mockBalance.id,
				employeeId: mockBalance.employeeId,
				leaveType: mockBalance.leaveType,
				period: mockBalance.period,
				totalHours: updatedTotalHoursResult.value,
				usedHours: mockBalance.usedHours,
				accrualRate: mockBalance.accrualRate,
				carryoverHours: mockBalance.carryoverHours
			});
			if (updatedBalanceResult.isError) throw new Error('Test setup failed');
			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(updatedBalanceResult.value));

			const result = await service.addBalance(mockBalance.id, hoursToAdd);

			expect(result.isOk).toBe(true);
			expect(mockRepository.findById).toHaveBeenCalledWith(mockBalance.id);
			expect(mockRepository.update).toHaveBeenCalledWith(mockBalance.id, { totalHours: 200 });
		});

		it('should return error when balance not found', async () => {
			const error = new TimeOffBalanceNotFoundError('non-existent-id');
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.error(error));

			const result = await service.addBalance('non-existent-id', 40);

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should validate hours parameter', async () => {
			const result = await service.addBalance(mockBalance.id, -40);

			expect(result.isError).toBe(true);
			expect(mockRepository.findById).not.toHaveBeenCalled();
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.addBalance(mockBalance.id, 40);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to add balance hours');
		});
	});

	describe('rolloverBalance', () => {
		it('should delegate to entity rollover method', async () => {
			const newPeriodResult = BalancePeriod.create(2027);
			if (newPeriodResult.isError) throw new Error('Test setup failed');
			const newPeriod = newPeriodResult.value;

			// Mock repository to return the balance
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(mockBalance));

			// Mock create to return new balance
			const availableHours = mockBalance.availableHours.value; // 120
			const annualAccrual = mockBalance.accrualRate.toAnnual(); // 60 (5 hours/month * 12)
			const newTotalHoursResult = BalanceHours.create(availableHours + annualAccrual); // 180
			if (newTotalHoursResult.isError) throw new Error('Test setup failed: invalid total hours');
			const newCarryoverResult = CarryoverHours.create(availableHours);
			if (newCarryoverResult.isError) throw new Error('Test setup failed: invalid carryover');
			const zeroHoursResult = BalanceHours.create(0);
			if (zeroHoursResult.isError) throw new Error('Test setup failed: invalid zero hours');
			const newBalanceResult = TimeOffBalanceRecord.create({
				id: '770e8400-e29b-41d4-a716-446655440000',
				employeeId: mockBalance.employeeId,
				leaveType: mockBalance.leaveType,
				period: newPeriod,
				totalHours: newTotalHoursResult.value,
				usedHours: zeroHoursResult.value,
				accrualRate: mockBalance.accrualRate,
				carryoverHours: newCarryoverResult.value
			});
			if (newBalanceResult.isError) {
				throw new Error(`Test setup failed: ${newBalanceResult.error.message}`);
			}
			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(newBalanceResult.value));

			const result = await service.rolloverBalance(mockBalance.id, 2027);

			expect(result.isOk).toBe(true);
			expect(mockRepository.findById).toHaveBeenCalledWith(mockBalance.id);
			expect(mockRepository.create).toHaveBeenCalled();
		});

		it('should return error when balance not found', async () => {
			const error = new TimeOffBalanceNotFoundError('non-existent-id');
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.error(error));

			const result = await service.rolloverBalance('non-existent-id', 2027);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Balance not found for rollover');
		});

		it('should validate year parameter', async () => {
			const result = await service.rolloverBalance(mockBalance.id, 1899);

			expect(result.isError).toBe(true);
			expect(mockRepository.findById).not.toHaveBeenCalled();
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.rolloverBalance(mockBalance.id, 2027);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to rollover balance');
		});
	});

	describe('deleteBalance', () => {
		it('should delete balance successfully', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteBalance(mockBalance.id);

			expect(result.isOk).toBe(true);
			expect(mockRepository.delete).toHaveBeenCalledWith(mockBalance.id);
		});

		it('should return error when balance not found', async () => {
			const error = new TimeOffBalanceNotFoundError('non-existent-id');
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.error(error));

			const result = await service.deleteBalance('non-existent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('should handle repository exceptions', async () => {
			vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Database error'));

			const result = await service.deleteBalance(mockBalance.id);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to delete balance record');
		});
	});
});
