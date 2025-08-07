import { z } from 'zod';

// Compliance status enum (based on API schema)
export const complianceStatusSchema = z.enum([
	'Active',
	'ExpiringSoon',
	'Expired',
	'PendingReview'
]);

// Renewal period enum (based on API schema)
export const renewalPeriodSchema = z.enum([
	'None',
	'Monthly',
	'Quarterly',
	'SemiAnnually',
	'Yearly',
	'BiYearly'
]);

// Compliance item schema (based on actual API response structure)
export const complianceItemSchema = z.object({
	id: z.number(),
	employeeId: z.number(),
	itemType: z.string(),
	itemName: z.string(),
	authority: z.string().nullable().optional(),
	licenseNumber: z.string().nullable().optional(),
	expirationDate: z.string().nullable().optional(),
	status: complianceStatusSchema.nullable().optional(),
	effectiveDate: z.string(),
	renewalPeriod: renewalPeriodSchema.nullable().optional(),
	licenseType: z.string().nullable().optional(),
	issuingAuthority: z.string().nullable().optional(),
	autoRenewal: z.boolean().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

// Create compliance item schema
export const createComplianceItemSchema = complianceItemSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	employeeId: z.number().min(1, 'Employee ID is required'),
	itemType: z.string().min(1, 'Item type is required'),
	itemName: z.string().min(1, 'Item name is required'),
	effectiveDate: z.string().min(1, 'Effective date is required'),
});

// Update compliance item schema
export const updateComplianceItemSchema = createComplianceItemSchema.partial().extend({
	id: z.number(),
});

// Compliance filter schema
export const complianceFilterSchema = z.object({
	employeeId: z.number().optional(),
	itemType: z.string().optional(),
	status: complianceStatusSchema.optional(),
	expiringBefore: z.string().optional(),
	expiringAfter: z.string().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['itemName', 'expirationDate', 'status', 'createdAt']).default('expirationDate'),
	order: z.enum(['ASC', 'DESC']).default('ASC'),
});

// Compliance list response schema
export const complianceListResponseSchema = z.object({
	data: z.array(complianceItemSchema),
	page: z.number(),
	pageSize: z.number(),
	total: z.number(),
	totalPages: z.number(),
	hasMore: z.boolean()
}).transform((response) => ({
	complianceItems: response.data,
	totalCount: response.total,
	page: response.page,
	limit: response.pageSize,
	totalPages: response.totalPages,
	hasMore: response.hasMore
}));

// Compliance stats schema
export const complianceStatsSchema = z.object({
	totalItems: z.number(),
	activeItems: z.number(),
	expiredItems: z.number(),
	expiringSoonItems: z.number(),
	pendingReviewItems: z.number(),
	expiringThisMonth: z.number(),
	expiringNextMonth: z.number(),
	complianceRate: z.number(),
});

// Export types
export type ComplianceStatus = z.infer<typeof complianceStatusSchema>;
export type RenewalPeriod = z.infer<typeof renewalPeriodSchema>;
export type ComplianceItem = z.infer<typeof complianceItemSchema>;
export type CreateComplianceItemInput = z.infer<typeof createComplianceItemSchema>;
export type UpdateComplianceItemInput = z.infer<typeof updateComplianceItemSchema>;
export type ComplianceFilter = z.infer<typeof complianceFilterSchema>;
export type ComplianceListResponse = z.infer<typeof complianceListResponseSchema>;
export type ComplianceStats = z.infer<typeof complianceStatsSchema>;