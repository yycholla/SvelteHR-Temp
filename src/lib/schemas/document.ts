import { z } from 'zod';

// Document schema (based on actual API response structure)
export const documentSchema = z.object({
	id: z.number(),
	title: z.string(),
	filePath: z.string(),
	fileType: z.string().nullable().optional(),
	fileSize: z.number().nullable().optional(),
	employeeId: z.number().nullable().optional(),
	departmentId: z.number().nullable().optional(),
	version: z.number().nullable().optional(),
	isVerified: z.boolean().nullable().optional(),
	uploadDate: z.string(),
	uploadedByEmployeeId: z.number(),
	documentCategory: z.string().nullable().optional(),
	securityLevel: z.string().nullable().optional(),
	isEncrypted: z.boolean().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

// Create document schema (for upload metadata)
export const createDocumentSchema = documentSchema.omit({
	id: true,
	filePath: true, // This is generated on upload
	uploadDate: true, // This is set server-side
	createdAt: true,
	updatedAt: true,
}).extend({
	title: z.string().min(1, 'Title is required'),
	uploadedByEmployeeId: z.number().min(1, 'Uploader ID is required'),
});

// Update document schema
export const updateDocumentSchema = createDocumentSchema.partial().extend({
	id: z.number(),
});

// Document filter schema
export const documentFilterSchema = z.object({
	employeeId: z.number().optional(),
	departmentId: z.number().optional(),
	documentCategory: z.string().optional(),
	securityLevel: z.string().optional(),
	uploadedByEmployeeId: z.number().optional(),
	isVerified: z.boolean().optional(),
	fileType: z.string().optional(),
	uploadedAfter: z.string().optional(),
	uploadedBefore: z.string().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['title', 'uploadDate', 'fileSize', 'documentCategory']).default('uploadDate'),
	order: z.enum(['ASC', 'DESC']).default('DESC'),
});

// Document list response schema
export const documentListResponseSchema = z.object({
	data: z.array(documentSchema),
	page: z.number(),
	pageSize: z.number(),
	total: z.number(),
	totalPages: z.number(),
	hasMore: z.boolean()
}).transform((response) => ({
	documents: response.data,
	totalCount: response.total,
	page: response.page,
	limit: response.pageSize,
	totalPages: response.totalPages,
	hasMore: response.hasMore
}));

// Document upload response schema
export const documentUploadResponseSchema = z.object({
	success: z.boolean(),
	document: documentSchema.optional(),
	message: z.string().optional(),
	error: z.string().optional(),
});

// Document categories enum (common categories)
export const documentCategorySchema = z.enum([
	'Personal',
	'Contract',
	'Compliance',
	'Training',
	'Performance',
	'Benefits',
	'Policy',
	'Other'
]);

// Security levels enum
export const securityLevelSchema = z.enum([
	'Public',
	'Internal',
	'Confidential',
	'Restricted'
]);

// Export types
export type Document = z.infer<typeof documentSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentFilter = z.infer<typeof documentFilterSchema>;
export type DocumentListResponse = z.infer<typeof documentListResponseSchema>;
export type DocumentUploadResponse = z.infer<typeof documentUploadResponseSchema>;
export type DocumentCategory = z.infer<typeof documentCategorySchema>;
export type SecurityLevel = z.infer<typeof securityLevelSchema>;