import type { User } from './user';
import type { EmergencyContact } from './nested';
import type { Attachment, ApprovalWorkflow } from './hr-request';
import type { ApprovalStatus, RequestUrgency } from './enums';

export interface LeaveType {
	id: string;
	name: string;
	code: string;
	maxDaysPerYear: number;
	carryOverLimit: number;
	requiresApproval: boolean;
	allowsNegativeBalance: boolean;
	description?: string;
	isActive: boolean;
}

export interface LeaveRequest {
	id: string;
	requestNumber: string;
	employee: User;
	leaveType: LeaveType | null;
	startDate: string;
	endDate: string;
	totalDays: number;
	daysRequested?: number; // Alias for totalDays
	reason: string;
	status: ApprovalStatus;
	urgency: RequestUrgency;
	isEmergency: boolean;
	emergencyContact?: EmergencyContact;
	submittedAt: string;
	createdAt?: string; // Alias for submittedAt
	approvedAt?: string;
	approver?: User;
	rejectedAt?: string;
	rejectedBy?: User;
	rejectionReason?: string;
	approvalWorkflow: ApprovalWorkflow;
	medicalCertificateRequired: boolean;
	attachments: Attachment[];
}

export interface LeaveBalance {
	id: string;
	employee: User;
	leaveType: LeaveType;
	totalDaysAllocated: number;
	daysUsed: number;
	daysRemaining: number;
	daysCarriedOver: number;
	accruedThisYear: number;
	lastAccrualDate?: string;
	expirationDate?: string;
}
