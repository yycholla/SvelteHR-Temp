import type { User } from './user';
import type {
	HRRequestCategory,
	RequestPriority,
	ApprovalStatus,
	FieldType,
	VirusScanStatus
} from './enums';

export interface HRRequest {
	id: string;
	requestNumber: string;
	requestType: HRRequestType;
	employee: User;
	title: string;
	description: string;
	priority: RequestPriority;
	status: ApprovalStatus;
	requestData: Record<string, any>;
	attachments: Attachment[];
	submittedAt: string;
	dueDate?: string;
	isOverdue: boolean;
	approvalWorkflow: ApprovalWorkflow;
	completedAt?: string;
	timeline: RequestTimeline[];
}

export interface HRRequestType {
	id: string;
	name: string;
	category: HRRequestCategory;
	description?: string;
	approvalLevels: number;
	requiredFields: RequestField[];
	estimatedProcessingTime: number;
	isActive: boolean;
}

export interface RequestField {
	name: string;
	type: FieldType;
	label: string;
	required: boolean;
	validation?: string;
	options?: string[];
}

export interface ApprovalWorkflow {
	id: string;
	currentLevel: number;
	totalLevels: number;
	approvers: WorkflowApprover[];
	isComplete: boolean;
}

export interface WorkflowApprover {
	id: string;
	user: User;
	role: string;
	order: number;
	status: ApprovalStatus;
	approvedAt?: string;
	comments?: string;
	conditions?: string;
}

export interface RequestTimeline {
	id: string;
	step: string;
	status: string;
	actor: User;
	timestamp: string;
	comments?: string;
	duration: number;
	attachments: Attachment[];
}

export interface Attachment {
	id: string;
	filename: string;
	originalFilename: string;
	fileType: string;
	fileSize: number;
	url: string;
	uploadedBy: User;
	uploadedAt: string;
	virusScanStatus: VirusScanStatus;
	isPublic: boolean;
}
