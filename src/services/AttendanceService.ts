// src/services/AttendanceService.ts
import { Result } from '$domain/Result';
import {
	AttendanceRecord,
	ClockInTime,
	ClockOutTime,
	ShiftType,
	AttendanceStatus,
	LateReason,
	WorkHours,
	OvertimeHours
} from '$domain/Attendance';
import { AttendanceNotFoundError, AttendanceAlreadyExistsError, DomainError } from '$domain/errors';
import type { AttendanceRepository } from './AttendanceRepository';
import type { CreateAttendanceRecordData } from '$domain/Attendance';

export class AttendanceService {
	constructor(private readonly repository: AttendanceRepository) {}

	/**
	 * Create new attendance record
	 */
	async createAttendance(
		data: CreateAttendanceRecordData
	): Promise<Result<AttendanceRecord, DomainError>> {
		// Check for duplicate
		const exists = await this.repository.existsByEmployeeAndDate(data.employeeId, data.date);
		if (exists.isError) return Result.error(exists.error);

		if (exists.value) {
			return Result.error(
				new AttendanceAlreadyExistsError(data.employeeId, data.date.toISOString())
			);
		}

		// Create entity
		const recordResult = AttendanceRecord.create(data);
		if (recordResult.isError) return Result.error(recordResult.error);

		// Save to repository
		return await this.repository.save(recordResult.value);
	}

	/**
	 * Clock in employee
	 */
	async clockIn(
		id: string,
		employeeId: string,
		date: Date,
		time: Date,
		shiftType: string
	): Promise<Result<AttendanceRecord, DomainError>> {
		// Create clock in time
		const clockInResult = ClockInTime.create(time);
		if (clockInResult.isError) return Result.error(clockInResult.error);

		// Create shift type
		const shiftResult = ShiftType.create(shiftType);
		if (shiftResult.isError) return Result.error(shiftResult.error);

		// Create attendance status
		const statusResult = AttendanceStatus.create('present');
		if (statusResult.isError) return Result.error(statusResult.error);

		// Create attendance record
		const data: CreateAttendanceRecordData = {
			id,
			employeeId,
			date,
			clockInTime: clockInResult.value,
			clockOutTime: null,
			shiftType: shiftResult.value,
			status: statusResult.value,
			lateReason: null,
			workHours: null,
			overtimeHours: null
		};

		return await this.createAttendance(data);
	}

	/**
	 * Clock out employee
	 */
	async clockOut(recordId: string, time: Date): Promise<Result<AttendanceRecord, DomainError>> {
		// Find existing record
		const findResult = await this.repository.findById(recordId);
		if (findResult.isError) return Result.error(findResult.error);

		if (!findResult.value) {
			return Result.error(new AttendanceNotFoundError(recordId));
		}

		const record = findResult.value;

		// Create clock out time
		const clockOutResult = ClockOutTime.create(time, record.clockInTime);
		if (clockOutResult.isError) return Result.error(clockOutResult.error);

		// Clock out (entity handles work hours calculation)
		const updatedResult = record.clockOut(clockOutResult.value);
		if (updatedResult.isError) return Result.error(updatedResult.error);

		// Save to repository
		return await this.repository.save(updatedResult.value);
	}

	/**
	 * Mark attendance as late
	 */
	async markLate(
		recordId: string,
		reason: string | null
	): Promise<Result<AttendanceRecord, DomainError>> {
		// Find existing record
		const findResult = await this.repository.findById(recordId);
		if (findResult.isError) return Result.error(findResult.error);

		if (!findResult.value) {
			return Result.error(new AttendanceNotFoundError(recordId));
		}

		const record = findResult.value;

		// Create late reason
		let lateReason: LateReason | null = null;
		if (reason !== null) {
			const reasonResult = LateReason.create(reason);
			if (reasonResult.isError) return Result.error(reasonResult.error);
			lateReason = reasonResult.value;
		}

		// Mark late
		const updatedResult = record.markLate(lateReason);
		if (updatedResult.isError) return Result.error(updatedResult.error);

		// Save to repository
		return await this.repository.save(updatedResult.value);
	}

	/**
	 * Mark attendance as absent
	 */
	async markAbsent(recordId: string): Promise<Result<AttendanceRecord, DomainError>> {
		// Find existing record
		const findResult = await this.repository.findById(recordId);
		if (findResult.isError) return Result.error(findResult.error);

		if (!findResult.value) {
			return Result.error(new AttendanceNotFoundError(recordId));
		}

		const record = findResult.value;

		// Mark absent
		const updatedResult = record.markAbsent();
		if (updatedResult.isError) return Result.error(updatedResult.error);

		// Save to repository
		return await this.repository.save(updatedResult.value);
	}

	/**
	 * Get attendance by ID
	 */
	async getById(id: string): Promise<Result<AttendanceRecord, DomainError>> {
		const findResult = await this.repository.findById(id);
		if (findResult.isError) return Result.error(findResult.error);

		if (!findResult.value) {
			return Result.error(new AttendanceNotFoundError(id));
		}

		return Result.ok(findResult.value);
	}

	/**
	 * Get all attendance records for an employee
	 */
	async getByEmployeeId(employeeId: string): Promise<Result<AttendanceRecord[], DomainError>> {
		return await this.repository.findByEmployeeId(employeeId);
	}

	/**
	 * Get attendance records for date range
	 */
	async getByEmployeeAndDateRange(
		employeeId: string,
		startDate: Date,
		endDate: Date
	): Promise<Result<AttendanceRecord[], DomainError>> {
		return await this.repository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
	}

	/**
	 * Delete attendance record
	 */
	async deleteAttendance(id: string): Promise<Result<void, DomainError>> {
		// Verify exists
		const findResult = await this.repository.findById(id);
		if (findResult.isError) return Result.error(findResult.error);

		if (!findResult.value) {
			return Result.error(new AttendanceNotFoundError(id));
		}

		return await this.repository.delete(id);
	}

	/**
	 * Get all attendance records
	 */
	async getAllAttendance(): Promise<Result<AttendanceRecord[], DomainError>> {
		return await this.repository.findAll();
	}
}
