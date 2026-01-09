export type WorkflowTriggerType =
	| 'DOCUMENT_SIGNED'
	| 'DOCUMENT_UPLOADED'
	| 'EMPLOYEE_HIRED'
	| 'EMPLOYEE_TERMINATED'
	| 'GOAL_COMPLETED'
	| 'GOAL_CREATED'
	| 'MANUAL_TRIGGER'
	| 'PAYROLL_PROCESSED'
	| 'REVIEW_COMPLETED'
	| 'REVIEW_CREATED'
	| 'SCHEDULED_TRIGGER'
	| 'TIME_OFF_APPROVED'
	| 'TIME_OFF_REJECTED'
	| 'TIME_OFF_REQUESTED'
	| 'USER_CREATED';

export interface WorkflowDefinitionWithStats {
	id: string;
	name: string;
	description?: string;
	category?: string | null;
	triggerType: WorkflowTriggerType;
	triggerConditions?: Record<string, any>;
	definition: Record<string, any>;
	isTemplate: boolean;
	timeoutMinutes?: number;
	maxRetries?: number;
	retryDelayMinutes?: number;
	status: 'draft' | 'active' | 'inactive';
	version: number;
	createdBy?: string;
	departmentId?: string | null;
	createdAt: string;
	updatedAt: string;
	// Stats
	instanceCount?: number;
	successRate?: number;
	userByCreatedBy?: {
		id: string;
		displayName: string;
		email: string;
	};
}

export interface WorkflowInstance {
	id: string;
	workflowDefinitionId: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	startedAt?: string;
	completedAt?: string;
	triggeredBy?: string;
	triggeredByUserId?: string;
	triggeredByEvent?: string;
	triggerData?: Record<string, any>;
	contextData?: Record<string, any>;
	currentStep?: string;
	currentStepId?: string;
	stepData?: Record<string, any>;
	error?: string;
	errorMessage?: string;
	instanceName?: string;
	retryCount?: number;
	workflowDefinition?: WorkflowDefinitionWithStats;
	// PostGraphile relationship fields
	workflowDefinitionByWorkflowDefinitionId?: WorkflowDefinitionWithStats;
	userByTriggeredByUserId?: {
		id: string;
		displayName?: string;
		email?: string;
	};
	createdAt: string;
	updatedAt: string;
}

export type WorkflowTaskStatus =
	| 'pending'
	| 'running'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'skipped';

export interface WorkflowTask {
	id: string;
	workflowInstanceId: string;
	stepName: string;
	stepType: string;
	status: WorkflowTaskStatus;
	assignedTo?: string;
	assignedToId?: string;
	assignedById?: string;
	priority?: string | null;
	title: string;
	description?: string;
	dueDate?: string;
	taskType?: string;
	taskData?: Record<string, any>;
	completionCriteria?: Record<string, any>;
	startedAt?: string;
	completedAt?: string;
	input?: Record<string, any>;
	output?: Record<string, any>;
	error?: string;
	workflowInstance?: WorkflowInstance;
	// PostGraphile relationship fields
	workflowInstanceByWorkflowInstanceId?: WorkflowInstance;
	userByAssignedToId?: {
		id: string;
		displayName?: string;
		email?: string;
	};
	userByAssignedById?: {
		id: string;
		displayName?: string;
		email?: string;
	};
	createdAt: string;
	updatedAt: string;
}

export interface WorkflowStats {
	totalDefinitions: number;
	activeDefinitions: number;
	totalInstances: number;
	runningInstances: number;
	completedInstances: number;
	failedInstances: number;
	averageSuccessRate: number;
	// Nested statistics for UI components
	definitions: {
		total: number;
		active: number;
		inactive: number;
		draft: number;
	};
	instances: {
		total: number;
		running: number;
		completed: number;
		failed: number;
		pending: number;
		cancelled: number;
		successRate: number;
	};
	tasks: {
		total: number;
		pending: number;
		inProgress: number;
		completed: number;
		failed: number;
		skipped: number;
		completionRate: number;
	};
}
