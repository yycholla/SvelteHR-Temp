import { DayOfWeek, EmploymentType, MaritalStatus, PayType } from './enums';

export interface JobInfo {
	title: string;
	hireDate: string;
	employmentType: EmploymentType;
	isRemote: boolean;
	workSchedule?: WorkSchedule;
	managerId?: string;
	salary?: number;
	payType?: string;
}

export interface ContactInfo {
	phoneNumber?: string;
	addressStreet?: string;
	addressCity?: string;
	addressState?: string;
	addressZipCode?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	emergencyContactRelationship?: string;
}

export interface PersonalInfo {
	dateOfBirth?: string;
	socialSecurityNumber?: string;
	maritalStatus?: MaritalStatus;
	dependents?: number;
	pronouns?: string;
}

export interface Compensation {
	payRate: number;
	payType: PayType;
	annualSalary: number;
	currency: string;
	lastReviewDate?: string;
	nextReviewDate?: string;
}

export interface WorkSchedule {
	id: string;
	name: string;
	startTime: string;
	endTime: string;
	workDays: DayOfWeek[];
	hoursPerDay: number;
	workDaysPerWeek: number;
	flexibleHours: boolean;
	breaks: ScheduleBreak[];
}

export interface ScheduleBreak {
	name: string;
	startTime: string;
	duration: number;
	isPaid: boolean;
}

export interface EmergencyContact {
	name: string;
	phone: string;
	relationship: string;
	isPrimary: boolean;
}

export interface UserAddress {
	id: string;
	user_id: string;
	address_type: string;
	is_primary: boolean;
	address_line_1: string;
	address_line_2?: string;
	city: string;
	state_province: string;
	postal_code: string;
	country: string;
	latitude?: number;
	longitude?: number;
	created_at: string;
	updated_at: string;
	deleted_at?: string;
}
