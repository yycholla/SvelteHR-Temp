// src/domain/Attendance/types.ts
import type { ClockInTime } from './ClockInTime';
import type { ClockOutTime } from './ClockOutTime';
import type { ShiftType } from './ShiftType';
import type { AttendanceStatus } from './AttendanceStatus';
import type { LateReason } from './LateReason';
import type { WorkHours } from './WorkHours';
import type { OvertimeHours } from './OvertimeHours';

export interface CreateAttendanceRecordData {
	id: string;
	employeeId: string;
	date: Date;
	clockInTime: ClockInTime;
	clockOutTime: ClockOutTime | null;
	shiftType: ShiftType;
	status: AttendanceStatus;
	lateReason: LateReason | null;
	workHours: WorkHours | null;
	overtimeHours: OvertimeHours | null;
}

export interface AttendanceRecordProps {
	id: string;
	employeeId: string;
	date: Date;
	clockInTime: ClockInTime;
	clockOutTime: ClockOutTime | null;
	shiftType: ShiftType;
	status: AttendanceStatus;
	lateReason: LateReason | null;
	workHours: WorkHours | null;
	overtimeHours: OvertimeHours | null;
}
