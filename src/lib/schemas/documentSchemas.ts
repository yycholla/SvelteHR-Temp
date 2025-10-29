// Zod validation schemas for Secure Document Management (Feature 024)
import { z } from 'zod';

// Enum schemas
export const fileTypeSchema = z.enum([
	'PDF',
	'JPEG',
	'PNG',
	'GIF',
	'DOCX',
	'XLSX',
	'TXT',
	'CSV'
]);

export const sensitivityLevelSchema = z.enum([
	'Public',
	'Internal',
	'Confidential',
	'Sensitive-PII'
]);

export const accessTypeSchema = z.enum(['view', 'download', 'preview']);

export const accessOutcomeSchema = z.enum(['success', 'denied']);

export const assignmentStatusSchema = z.enum(['active', 'revoked']);

// Document metadata validation
export const documentMetadataSchema = z.object({
	filename: z.string().min(1).max(255),
	category: z.string().min(1).max(100),
	sensitivityLevel: sensitivityLevelSchema,
	expirationDate: z.date().optional(),
	metadataTags: z.record(z.unknown()).optional(),
	assignToEmployees: z.array(z.string().uuid()).optional(),
	assignToDepartments: z.array(z.string().uuid()).optional()
});

// Document upload schema (includes file validation)
export const documentUploadSchema = z.object({
	file: z.any().refine(
		(file) => {
			if (typeof File !== 'undefined' && file instanceof File) {
				return file.size > 0 && file.size <= 52428800; // 50 MB max
			}
			return true; // Skip validation if File API not available (server-side)
		},
		{
			message: 'File size must be between 1 byte and 50 MB'
		}
	),
	metadata: documentMetadataSchema
});

// Document filter schema (for GET /api/documents)
export const documentFilterSchema = z.object({
	employeeId: z.string().uuid().optional(),
	category: z.string().optional(),
	sensitivityLevel: sensitivityLevelSchema.optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	searchQuery: z.string().optional()
});

// Assignment payload schema
export const assignmentPayloadSchema = z.object({
	employeeIds: z.array(z.string().uuid()).optional(),
	departmentIds: z.array(z.string().uuid()).optional(),
	reason: z.string().max(500).optional()
}).refine(
	(data) => {
		// At least one of employeeIds or departmentIds must be provided
		return (
			(data.employeeIds && data.employeeIds.length > 0) ||
			(data.departmentIds && data.departmentIds.length > 0)
		);
	},
	{
		message: 'Must provide at least one employee or department for assignment'
	}
);

// Document version schema
export const documentVersionSchema = z.object({
	documentId: z.string().uuid(),
	changeDescription: z.string().max(500).optional()
});

// Access log entry schema (for insertion)
export const accessLogEntrySchema = z.object({
	documentId: z.string().uuid(),
	userId: z.string().uuid(),
	accessType: accessTypeSchema,
	accessOutcome: accessOutcomeSchema,
	ipAddress: z.string().optional(), // TODO: Add IP validation regex for Zod v4 compatibility
	userAgent: z.string().max(500).optional(),
	denialReason: z.string().max(500).optional()
});

// Document category schema (for admin creation)
export const documentCategorySchema = z.object({
	name: z.string().min(1).max(100),
	defaultSensitivityLevel: sensitivityLevelSchema,
	retentionYears: z.number().int().min(1).max(50).default(3),
	requiredRole: z.enum(['Admin', 'HR', 'Manager', 'Employee']).optional()
});

// File type validation helper
export function validateFileType(filename: string): boolean {
	const extension = filename.split('.').pop()?.toUpperCase();
	const allowedExtensions = ['PDF', 'JPEG', 'JPG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'];
	return extension ? allowedExtensions.includes(extension) : false;
}

// MIME type mapping
export const MIME_TYPE_MAP: Record<string, string> = {
	PDF: 'application/pdf',
	JPEG: 'image/jpeg',
	JPG: 'image/jpeg',
	PNG: 'image/png',
	GIF: 'image/gif',
	DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	TXT: 'text/plain',
	CSV: 'text/csv'
};

// Validate MIME type matches file extension
export function validateMimeType(filename: string, mimeType: string): boolean {
	const extension = filename.split('.').pop()?.toUpperCase();
	if (!extension) return false;

	const expectedMime = MIME_TYPE_MAP[extension];
	if (!expectedMime) return false;

	return mimeType === expectedMime || (extension === 'JPEG' && mimeType === 'image/jpg');
}

// File size validation
export const MAX_FILE_SIZE_BYTES = 52428800; // 50 MB

export function validateFileSize(sizeBytes: number): boolean {
	return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}

// Sensitivity level escalation validation (can only increase, not decrease)
const sensitivityOrder = ['Public', 'Internal', 'Confidential', 'Sensitive-PII'];

export function canEscalateSensitivity(
	current: string,
	proposed: string
): boolean {
	const currentIndex = sensitivityOrder.indexOf(current);
	const proposedIndex = sensitivityOrder.indexOf(proposed);

	if (currentIndex === -1 || proposedIndex === -1) return false;

	// Can only escalate (increase) sensitivity, not decrease
	return proposedIndex >= currentIndex;
}

// Document update schema (for partial updates)
export const documentUpdateSchema = z.object({
	filename: z.string().min(1).max(255).optional(),
	category: z.string().min(1).max(100).optional(),
	sensitivityLevel: sensitivityLevelSchema.optional(),
	expirationDate: z.date().optional(),
	metadataTags: z.record(z.unknown()).optional(),
	isDeleted: z.boolean().optional()
});

// Soft delete schema
export const softDeleteSchema = z.object({
	documentId: z.string().uuid(),
	reason: z.string().max(500).optional()
});

// Restore document schema (un-soft-delete)
export const restoreDocumentSchema = z.object({
	documentId: z.string().uuid(),
	reason: z.string().max(500).optional()
});

// Document search/filter validation with sanitization
export const documentSearchSchema = z.object({
	query: z.string().max(200).optional(),
	category: z.string().max(100).optional(),
	sensitivityLevel: sensitivityLevelSchema.optional(),
	uploadedAfter: z.date().optional(),
	uploadedBefore: z.date().optional(),
	expiringBefore: z.date().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	sortBy: z.enum(['uploaded_at', 'filename', 'category', 'expiration_date']).default('uploaded_at'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Type exports for use in components
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type DocumentFilter = z.infer<typeof documentFilterSchema>;
export type AssignmentPayload = z.infer<typeof assignmentPayloadSchema>;
export type DocumentCategory = z.infer<typeof documentCategorySchema>;
export type AccessLogEntry = z.infer<typeof accessLogEntrySchema>;
export type DocumentSearch = z.infer<typeof documentSearchSchema>;
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;
