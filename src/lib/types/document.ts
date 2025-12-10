// TypeScript types for Secure Document Management (Feature 024)
// Auto-generated from database schema

export type FileType = 'PDF' | 'JPEG' | 'PNG' | 'GIF' | 'DOCX' | 'XLSX' | 'TXT' | 'CSV';

export type DocumentCategoryType =
	| 'Contract'
	| 'Policy'
	| 'Report'
	| 'Invoice'
	| 'Certificate'
	| 'Payslip'
	| 'License'
	| 'Other';

export type SensitivityLevel = 'Public' | 'Internal' | 'Confidential' | 'Sensitive-PII';

export type AccessType = 'view' | 'download' | 'preview';

export type AccessOutcome = 'success' | 'denied';

export type AssignmentStatus = 'active' | 'revoked';

export type DocumentRole = 'Admin' | 'HR' | 'Manager' | 'Employee';

export type SortField = 'uploaded_at' | 'filename' | 'category' | 'expiration_date' | 'file_size_bytes';

export type SortOrder = 'asc' | 'desc';

export type AssignmentType = 'employee' | 'department' | 'team';

// Main document entity
export interface Document {
	id: string; // UUID
	filename: string;
	file_type: FileType;
	file_size_bytes: number;
	storage_path: string;
	encryption_key_id: string; // UUID reference to EncryptionKey
	uploaded_by: string; // UUID reference to User
	uploaded_at: Date;
	category: string;
	sensitivity_level: SensitivityLevel;
	expiration_date?: Date;
	version_number: number;
	metadata_tags?: Record<string, unknown>; // JSONB
	is_deleted: boolean;
	deleted_at?: Date;
	deleted_by?: string; // UUID reference to User
	assigned_users?: Array<{ email: string; id: string }>; // JSON aggregated from document_assignments
	description?: string; // Added description field
}

// Document assignment to employee or department
export interface DocumentAssignment {
	id: string; // UUID
	document_id: string; // UUID reference to Document
	employee_id?: string; // UUID reference to User (null for department assignments)
	department_id?: string; // UUID reference to Department (null for individual assignments)
	team_id?: string; // UUID reference to Team (null for individual/dept assignments)
	assigned_by: string; // UUID reference to User
	assigned_at: Date;
	assignment_status: AssignmentStatus;
	assignment_reason?: string;
	assignment_type?: AssignmentType; // Added assignment_type for UI logic
}

// Access log entry for audit trail
export interface DocumentAccessLog {
	id: string; // UUID
	document_id: string; // UUID reference to Document
	user_id: string; // UUID reference to User
	access_type: AccessType;
	access_timestamp: Date;
	ip_address?: string; // INET
	user_agent?: string;
	access_outcome: AccessOutcome;
	denial_reason?: string;
}

// Document category reference data
export interface DocumentCategory {
	id: string; // UUID
	name: string;
	default_sensitivity_level: SensitivityLevel;
	retention_years: number;
	required_role?: DocumentRole;
	created_at: Date;
	updated_at: Date;
}

// Encryption key for client-side file encryption
export interface EncryptionKey {
	id: string; // UUID
	key_identifier: string; // Client-generated unique ID
	encrypted_key_data: ArrayBuffer; // BYTEA
	key_algorithm: 'AES-GCM-256' | 'AES-CBC-256';
	created_for_user: string; // UUID reference to User
	created_at: Date;
	rotated_at?: Date;
	is_active: boolean;
}

// Document version for history tracking
export interface DocumentVersion {
	id: string; // UUID
	document_id: string; // UUID reference to Document
	version_number: number;
	storage_path: string;
	encryption_key_id: string; // UUID reference to EncryptionKey
	version_created_by: string; // UUID reference to User
	version_created_at: Date;
	change_description?: string;
	file_size_bytes: number;
}

// ============================================================================
// METADATA & REQUEST/RESPONSE TYPES
// ============================================================================

// Metadata for document upload
export interface DocumentMetadata {
	filename: string;
	category: DocumentCategoryType;
	sensitivityLevel: SensitivityLevel;
	expirationDate?: Date;
	metadataTags?: Record<string, unknown>;
	assignToEmployees?: string[]; // Array of employee UUIDs
	assignToDepartments?: string[]; // Array of department UUIDs
}

// Upload result
export interface UploadResult {
	documentId: string;
	uploadedAt: Date;
	encryptionKeyId: string;
}

// Preview result
export interface PreviewResult {
	previewUrl: string;
	expiresAt: Date;
	previewFormat: 'PDF' | 'inline';
}

// Document filter criteria
export interface DocumentFilter {
	employeeId?: string;
	category?: string;
	sensitivityLevel?: SensitivityLevel;
	page?: number;
	limit?: number;
	searchQuery?: string;
}

// Paginated document response
export interface PaginatedDocuments {
	documents: Document[];
	totalCount: number;
	page: number;
	limit: number;
}

// Assignment payload
export interface AssignmentPayload {
	employeeIds?: string[];
	departmentIds?: string[];
	reason?: string;
}

// Access metadata for logging
export interface AccessMetadata {
	ipAddress?: string;
	userAgent?: string;
}

// File metadata for storage
export interface FileMetadata {
	documentId: string;
	filename: string;
	fileType: FileType;
	fileSizeBytes: number;
	encryptionKeyId: string;
}

// Encryption key registration
export interface KeyRegistration {
	keyIdentifier: string;
	encryptedKeyData: string; // Base64 encoded
	keyAlgorithm: 'AES-GCM-256';
}

// Encryption key retrieval response
export interface KeyRetrievalResponse {
	keyId: string;
	encryptedKeyData: string; // Base64 encoded
	keyAlgorithm: string;
	createdAt: Date;
}

// Document with extended data for detail view
export interface DocumentWithDetails extends Document {
	assignments: DocumentAssignment[];
	accessLogs?: DocumentAccessLog[];
	versions?: DocumentVersion[];
	uploader?: {
		id: string;
		full_name: string;
		email: string;
	};
}

// User permissions for document operations
export interface DocumentPermissions {
	canView: boolean;
	canDownload: boolean;
	canPreview: boolean;
	canAssign: boolean;
	canDelete: boolean;
	canUpload: boolean;
}

// Document upload progress
export interface UploadProgress {
	stage: 'encrypting' | 'uploading' | 'processing' | 'complete';
	progress: number; // 0-100
	message?: string;
}