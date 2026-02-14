// src/services/AttendanceRepository.ts
import type { Result } from '$domain/Result';
import type { DomainError } from '$domain/errors';
import type { AttendanceRecord } from '$domain/Attendance';

/**
 * Port interface for attendance data access.
 * Implementations should be in the adapters layer.
 */
export interface AttendanceRepository {
	/**
	 * Find attendance record by ID
	 */
	findById(id: string): Promise<Result<AttendanceRecord | null, DomainError>>;

	/**
	 * Find all attendance records for an employee
	 */
	findByEmployeeId(employeeId: string): Promise<Result<AttendanceRecord[], DomainError>>;

	/**
	 * Find attendance records for an employee within date range
	 */
	findByEmployeeAndDateRange(
		employeeId: string,
		startDate: Date,
		endDate: Date
	): Promise<Result<AttendanceRecord[], DomainError>>;

	/**
	 * Find attendance record for an employee on a specific date
	 */
	findByEmployeeAndDate(
		employeeId: string,
		date: Date
	): Promise<Result<AttendanceRecord | null, DomainError>>;

	/**
	 * Get all attendance records
	 */
	findAll(): Promise<Result<AttendanceRecord[], DomainError>>;

	/**
	 * Save attendance record (create or update)
	 */
	save(record: AttendanceRecord): Promise<Result<AttendanceRecord, DomainError>>;

	/**
	 * Delete attendance record
	 */
	delete(id: string): Promise<Result<void, DomainError>>;

	/**
	 * Bulk save attendance records
	 */
	saveBulk(records: AttendanceRecord[]): Promise<Result<AttendanceRecord[], DomainError>>;

	/**
	 * Count attendance records by employee
	 */
	countByEmployeeId(employeeId: string): Promise<Result<number, DomainError>>;

	/**
	 * Check if attendance record exists for employee on date
	 */
	existsByEmployeeAndDate(employeeId: string, date: Date): Promise<Result<boolean, DomainError>>;
}
