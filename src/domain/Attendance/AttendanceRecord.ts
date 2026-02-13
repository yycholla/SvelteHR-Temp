// src/domain/Attendance/AttendanceRecord.ts
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';
import { ClockInTime } from './ClockInTime';
import { ClockOutTime } from './ClockOutTime';
import { ShiftType } from './ShiftType';
import { AttendanceStatus } from './AttendanceStatus';
import { LateReason } from './LateReason';
import { WorkHours } from './WorkHours';
import { OvertimeHours } from './OvertimeHours';
import type { CreateAttendanceRecordData, AttendanceRecordProps } from './types';

export class AttendanceRecord {
	private constructor(private readonly props: AttendanceRecordProps) {}

	static create(data: CreateAttendanceRecordData): Result<AttendanceRecord, DomainError> {
		// Validate ID format (must be UUID)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!data.id || !uuidRegex.test(data.id)) {
			return Result.error(
				new DomainError('Invalid attendance record ID format', 'invalid_uuid', {
					value: data.id
				})
			);
		}

		// Validate employeeId format
		if (!data.employeeId || !uuidRegex.test(data.employeeId)) {
			return Result.error(
				new DomainError('Invalid employee ID format', 'invalid_uuid', { value: data.employeeId })
			);
		}

		// Validate date
		if (isNaN(data.date.getTime())) {
			return Result.error(new DomainError('Invalid date', 'invalid_date', { value: data.date }));
		}

		// Create with defensive Date copying
		return Result.ok(
			new AttendanceRecord({
				...data,
				date: new Date(data.date.getTime())
			})
		);
	}

	// Getters
	get id(): string {
		return this.props.id;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get date(): Date {
		// Return defensive copy
		return new Date(this.props.date.getTime());
	}

	get clockInTime(): ClockInTime {
		return this.props.clockInTime;
	}

	get clockOutTime(): ClockOutTime | null {
		return this.props.clockOutTime;
	}

	get shiftType(): ShiftType {
		return this.props.shiftType;
	}

	get status(): AttendanceStatus {
		return this.props.status;
	}

	get lateReason(): LateReason | null {
		return this.props.lateReason;
	}

	get workHours(): WorkHours | null {
		return this.props.workHours;
	}

	get overtimeHours(): OvertimeHours | null {
		return this.props.overtimeHours;
	}

	get isComplete(): boolean {
		return this.props.clockOutTime !== null;
	}

	get hasOvertime(): boolean {
		return this.props.overtimeHours !== null && this.props.overtimeHours.value > 0;
	}

	// Business methods (return new instances for immutability)
	clockOut(clockOutTime: ClockOutTime): Result<AttendanceRecord, DomainError> {
		if (this.props.clockOutTime !== null) {
			return Result.error(
				new DomainError('Attendance record is already clocked out', 'already_clocked_out', {
					recordId: this.props.id
				})
			);
		}

		// Calculate work hours
		const workHoursResult = WorkHours.fromClockTimes(this.props.clockInTime, clockOutTime);
		if (workHoursResult.isError) {
			return Result.error(workHoursResult.error);
		}

		// Calculate overtime (assuming 8 hours standard)
		const overtimeResult = OvertimeHours.fromWorkHours(workHoursResult.value, 8);
		if (overtimeResult.isError) {
			return Result.error(overtimeResult.error);
		}

		return Result.ok(
			new AttendanceRecord({
				...this.props,
				clockOutTime,
				workHours: workHoursResult.value,
				overtimeHours: overtimeResult.value,
				date: new Date(this.props.date.getTime()) // Defensive copy
			})
		);
	}

	markLate(reason: LateReason | null): Result<AttendanceRecord, DomainError> {
		const lateStatus = AttendanceStatus.create('late');
		if (lateStatus.isError) {
			return Result.error(lateStatus.error);
		}

		return Result.ok(
			new AttendanceRecord({
				...this.props,
				status: lateStatus.value,
				lateReason: reason,
				date: new Date(this.props.date.getTime()) // Defensive copy
			})
		);
	}

	markAbsent(): Result<AttendanceRecord, DomainError> {
		const absentStatus = AttendanceStatus.create('absent');
		if (absentStatus.isError) {
			return Result.error(absentStatus.error);
		}

		return Result.ok(
			new AttendanceRecord({
				...this.props,
				status: absentStatus.value,
				date: new Date(this.props.date.getTime()) // Defensive copy
			})
		);
	}

	updateShiftType(shiftType: ShiftType): Result<AttendanceRecord, DomainError> {
		return Result.ok(
			new AttendanceRecord({
				...this.props,
				shiftType,
				date: new Date(this.props.date.getTime()) // Defensive copy
			})
		);
	}
}
