import { z } from 'zod';

// Leave balance schema (based on actual API response structure)
export const leaveBalanceSchema = z.object({
	id: z.number(),
	employeeId: z.number(),
	leaveType: z.string(),
	balance: z.number(),
	accruedYTD: z.number().nullable().optional(),
	usedYTD: z.number().nullable().optional(),
	lastUpdated: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

// Leave request schema (based on actual API response structure)
export const leaveSchema = z.object({
	id: z.number(),
	leaveBalanceId: z.number(),
	startDate: z.string(),
	endDate: z.string(),
	status: z.string(),
	reason: z.string().nullable().optional(),
	approverId: z.number().nullable().optional(),
	approvedAt: z.string().nullable().optional(),
	comments: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

// Create leave balance schema
export const createLeaveBalanceSchema = leaveBalanceSchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.extend({
		employeeId: z.number().min(1, 'Employee ID is required'),
		leaveType: z.string().min(1, 'Leave type is required'),
		balance: z.number().min(0, 'Balance must be non-negative')
	});

// Update leave balance schema
export const updateLeaveBalanceSchema = createLeaveBalanceSchema.partial().extend({
	id: z.number()
});

// Create leave request schema
export const createLeaveSchema = leaveSchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true,
		approvedAt: true
	})
	.extend({
		leaveBalanceId: z.number().min(1, 'Leave balance ID is required'),
		startDate: z.string().min(1, 'Start date is required'),
		endDate: z.string().min(1, 'End date is required'),
		status: z.string().default('Pending')
	});

// Update leave request schema
export const updateLeaveSchema = createLeaveSchema.partial().extend({
	id: z.number()
});

// Leave balance filter schema
export const leaveBalanceFilterSchema = z.object({
	employeeId: z.number().optional(),
	leaveType: z.string().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['leaveType', 'balance', 'lastUpdated']).default('leaveType'),
	order: z.enum(['ASC', 'DESC']).default('ASC')
});

// Leave request filter schema
export const leaveFilterSchema = z.object({
	employeeId: z.number().optional(),
	status: z.string().optional(),
	startDateAfter: z.string().optional(),
	startDateBefore: z.string().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['startDate', 'status', 'createdAt']).default('startDate'),
	order: z.enum(['ASC', 'DESC']).default('DESC')
});

// Leave balance list response schema
export const leaveBalanceListResponseSchema = z
	.object({
		data: z.array(leaveBalanceSchema),
		page: z.number(),
		pageSize: z.number(),
		total: z.number(),
		totalPages: z.number(),
		hasMore: z.boolean()
	})
	.transform((response) => ({
		leaveBalances: response.data,
		totalCount: response.total,
		page: response.page,
		limit: response.pageSize,
		totalPages: response.totalPages,
		hasMore: response.hasMore
	}));

// Leave request list response schema
export const leaveListResponseSchema = z
	.object({
		data: z.array(leaveSchema),
		page: z.number(),
		pageSize: z.number(),
		total: z.number(),
		totalPages: z.number(),
		hasMore: z.boolean()
	})
	.transform((response) => ({
		leaves: response.data,
		totalCount: response.total,
		page: response.page,
		limit: response.pageSize,
		totalPages: response.totalPages,
		hasMore: response.hasMore
	}));

// Export types
export type LeaveBalance = z.infer<typeof leaveBalanceSchema>;
export type Leave = z.infer<typeof leaveSchema>;
export type CreateLeaveBalanceInput = z.infer<typeof createLeaveBalanceSchema>;
export type UpdateLeaveBalanceInput = z.infer<typeof updateLeaveBalanceSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;
export type LeaveBalanceFilter = z.infer<typeof leaveBalanceFilterSchema>;
export type LeaveFilter = z.infer<typeof leaveFilterSchema>;
export type LeaveBalanceListResponse = z.infer<typeof leaveBalanceListResponseSchema>;
export type LeaveListResponse = z.infer<typeof leaveListResponseSchema>;
