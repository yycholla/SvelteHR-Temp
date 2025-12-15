import type { User } from './user';
import type { AttendanceStatus, WorkLocation } from './enums';

export interface AttendanceRecord {
	id: string;
	employee: User;
	date: string;
	clockInTime?: string;
	clockOutTime?: string;
	totalHours: number;
	regularHours: number;
	overtimeHours: number;
	breakDuration: number;
	status: AttendanceStatus;
	tardiness: number;
	earlyDeparture: number;
	workLocation: WorkLocation;
	notes?: string;
	approver?: User;
	adjustments: AttendanceAdjustment[];
}

export interface AttendanceAdjustment {
	id: string;
	originalClockIn?: string;
	originalClockOut?: string;
	adjustedClockIn?: string;
	adjustedClockOut?: string;
	reason: string;
	adjustedBy: User;
	adjustmentTime: string;
	approved: boolean;
	approver?: User;
}
