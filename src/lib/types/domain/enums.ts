// Enum Types

export enum OnboardingStatus {
	NOT_STARTED = 'NOT_STARTED',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	ON_HOLD = 'ON_HOLD'
}

export enum TaskStatus {
	TODO = 'TODO',
	IN_PROGRESS = 'IN_PROGRESS',
	BLOCKED = 'BLOCKED',
	REVIEW = 'REVIEW',
	DONE = 'DONE',
	CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

export enum ApprovalStatus {
	SUBMITTED = 'submitted',
	PENDING = 'pending',
	IN_REVIEW = 'in_review',
	MANAGER_APPROVED = 'manager_approved',
	HR_APPROVED = 'hr_approved',
	APPROVED = 'approved',
	REJECTED = 'rejected',
	CANCELLED = 'cancelled',
	ON_HOLD = 'on_hold'
}

export enum RequestUrgency {
	LOW = 'LOW',
	NORMAL = 'NORMAL',
	HIGH = 'HIGH',
	URGENT = 'URGENT',
	EMERGENCY = 'EMERGENCY'
}

export enum RequestPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

export enum AttendanceStatus {
	PRESENT = 'present',
	ABSENT = 'absent',
	LATE = 'late',
	EARLY_DEPARTURE = 'early_departure',
	PARTIAL_DAY = 'partial_day',
	ON_LEAVE = 'on_leave',
	HOLIDAY = 'holiday'
}

export enum WorkLocation {
	OFFICE = 'OFFICE',
	REMOTE = 'REMOTE',
	HYBRID = 'HYBRID',
	FIELD = 'FIELD',
	CLIENT_SITE = 'CLIENT_SITE'
}

export enum EmploymentType {
	FULL_TIME = 'FULL_TIME',
	PART_TIME = 'PART_TIME',
	CONTRACT = 'CONTRACT',
	INTERN = 'INTERN',
	TEMPORARY = 'TEMPORARY'
}

export enum MaritalStatus {
	SINGLE = 'SINGLE',
	MARRIED = 'MARRIED',
	DIVORCED = 'DIVORCED',
	WIDOWED = 'WIDOWED',
	SEPARATED = 'SEPARATED'
}

export enum PayType {
	HOURLY = 'HOURLY',
	SALARY = 'SALARY',
	COMMISSION = 'COMMISSION',
	CONTRACT = 'CONTRACT'
}

export enum DayOfWeek {
	MONDAY = 'MONDAY',
	TUESDAY = 'TUESDAY',
	WEDNESDAY = 'WEDNESDAY',
	THURSDAY = 'THURSDAY',
	FRIDAY = 'FRIDAY',
	SATURDAY = 'SATURDAY',
	SUNDAY = 'SUNDAY'
}

export enum HRRequestCategory {
	COMPENSATION = 'COMPENSATION',
	BENEFITS = 'BENEFITS',
	POLICY = 'POLICY',
	EQUIPMENT = 'EQUIPMENT',
	TRAINING = 'TRAINING',
	TRANSFER = 'TRANSFER',
	OTHER = 'OTHER'
}

export enum FieldType {
	TEXT = 'TEXT',
	NUMBER = 'NUMBER',
	EMAIL = 'EMAIL',
	DATE = 'DATE',
	BOOLEAN = 'BOOLEAN',
	SELECT = 'SELECT',
	MULTI_SELECT = 'MULTI_SELECT',
	TEXTAREA = 'TEXTAREA',
	FILE = 'FILE'
}

export enum VirusScanStatus {
	PENDING = 'PENDING',
	CLEAN = 'CLEAN',
	INFECTED = 'INFECTED',
	ERROR = 'ERROR'
}

export enum ActivityType {
	TASK_CREATED = 'TASK_CREATED',
	TASK_COMPLETED = 'TASK_COMPLETED',
	LEAVE_REQUESTED = 'LEAVE_REQUESTED',
	LEAVE_APPROVED = 'LEAVE_APPROVED',
	USER_CREATED = 'USER_CREATED',
	DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED'
}

export enum NotificationType {
	TASK_ASSIGNED = 'TASK_ASSIGNED',
	TASK_DUE = 'TASK_DUE',
	LEAVE_APPROVED = 'LEAVE_APPROVED',
	LEAVE_REJECTED = 'LEAVE_REJECTED',
	SYSTEM_ALERT = 'SYSTEM_ALERT',
	REMINDER = 'REMINDER'
}

export enum NotificationPriority {
	LOW = 'LOW',
	NORMAL = 'NORMAL',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

export enum ExportFormat {
	CSV = 'CSV',
	EXCEL = 'EXCEL',
	PDF = 'PDF',
	JSON = 'JSON'
}

export enum ExportJobStatus {
	QUEUED = 'QUEUED',
	PROCESSING = 'PROCESSING',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED',
	EXPIRED = 'EXPIRED'
}