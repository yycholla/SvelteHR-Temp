import type { FieldType } from './enums';

// =============================================================================
// Form validation types
// =============================================================================

export interface ValidationRule {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	min?: number;
	max?: number;
	custom?: (value: any) => boolean | string;
}

// =============================================================================
// Utility Types
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type EntityId = string;

export type DateTime = string;

export type Json = Record<string, any>;

// =============================================================================
// Component Props Types
// =============================================================================

export interface BaseComponentProps {
	id?: string;
	className?: string;
	'data-testid'?: string;
}

export interface TableColumn<T> {
	key: keyof T;
	label: string;
	sortable?: boolean;
	width?: string;
	render?: (value: any, row: T) => any;
}

export interface TableProps<T> extends BaseComponentProps {
	data: T[];
	columns: TableColumn<T>[];
	loading?: boolean;
	error?: string;
	pagination?: {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		totalItems: number;
		onPageChange: (page: number) => void;
	};
	sorting?: {
		field: string;
		direction: 'ASC' | 'DESC';
		onSortChange: (field: string, direction: 'ASC' | 'DESC') => void;
	};
	selection?: {
		selectedItems: T[];
		onSelectionChange: (items: T[]) => void;
	};
}

export interface ModalProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	closeOnBackdrop?: boolean;
	showCloseButton?: boolean;
}

export interface FormProps extends BaseComponentProps {
	initialValues?: Record<string, any>;
	validationSchema?: Record<string, ValidationRule>;
	onSubmit: (values: Record<string, any>) => void | Promise<void>;
	loading?: boolean;
	disabled?: boolean;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
	data?: T;
	errors?: Array<{
		message: string;
		code?: string;
		path?: string[];
		extensions?: Record<string, any>;
	}>;
}

export interface MutationResponse {
	success: boolean;
	message?: string;
	errors?: string[];
}

export interface LoginResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	user: any; // Using any to avoid circular dependency, cast to User in usage
}

export interface RefreshTokenResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

// =============================================================================
// UI and Form Types
// =============================================================================

export interface PaginationInput {
	first?: number;
	after?: string;
	last?: number;
	before?: string;
}

export interface SortInput {
	field: string;
	direction: 'ASC' | 'DESC';
}

export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor?: string;
	endCursor?: string;
}

export interface Connection<T> {
	edges: Array<{
		node: T;
		cursor: string;
	}>;
	pageInfo: PageInfo;
	totalCount: number;
}

export interface FilterInput {
	[key: string]: any;
}

export interface FormField {
	name: string;
	label: string;
	type: FieldType;
	value?: any;
	error?: string;
	rules?: ValidationRule;
	options?: Array<{ value: any; label: string }>;
	disabled?: boolean;
	placeholder?: string;
	helpText?: string;
}

export interface FormState {
	fields: { [key: string]: FormField };
	isValid: boolean;
	isSubmitting: boolean;
	errors: { [key: string]: string };
	touched: { [key: string]: boolean };
}

// =============================================================================
// Export/Import Types
// =============================================================================

export interface ExportRequest {
	format: any; // Enum
	filters?: FilterInput;
	fields?: string[];
	options?: ExportOptions;
}

export interface ExportOptions {
	includeHeaders?: boolean;
	dateFormat?: string;
	timezone?: string;
	compression?: boolean;
	password?: string;
}

export interface ExportJob {
	id: string;
	status: any; // Enum
	progress: number;
	downloadUrl?: string;
	error?: string;
	createdAt: string;
	completedAt?: string;
	expiresAt?: string;
}
