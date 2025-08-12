import { z } from 'zod';

// Re-export schemas from the main schemas directory to maintain consistency
export { 
	createEmployeeSchema,
	updateEmployeeSchema,
	employeeFilterSchema,
	type CreateEmployeeInput,
	type UpdateEmployeeInput,
	type EmployeeFilter
} from '$lib/schemas/employee';

export { 
	createTaskSchema,
	updateTaskSchema,
	taskStatusUpdateSchema,
	taskFilterSchema,
	type CreateTaskInput,
	type UpdateTaskInput,
	type TaskFilter
} from '$lib/schemas/task';

export { 
	leaveBalanceSchema,
	leaveSchema,
	createLeaveBalanceSchema,
	createLeaveSchema,
	updateLeaveBalanceSchema,
	updateLeaveSchema,
	type LeaveBalance
} from '$lib/schemas/leave';

export { 
	complianceItemSchema,
	createComplianceItemSchema,
	updateComplianceItemSchema,
	type ComplianceItem
} from '$lib/schemas/compliance';

export { 
	documentSchema,
	createDocumentSchema,
	updateDocumentSchema,
	type Document
} from '$lib/schemas/document';

// Validation helpers
export function validateField<T>(schema: z.ZodSchema<T>, data: any): { success: boolean; errors: string[] } {
	try {
		schema.parse(data);
		return { success: true, errors: [] };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				errors: error.errors.map(err => err.message)
			};
		}
		return { success: false, errors: ['Validation failed'] };
	}
}

export function getFieldErrors(zodError: z.ZodError, fieldPath: string): string[] {
	return zodError.errors
		.filter(error => error.path.join('.') === fieldPath)
		.map(error => error.message);
}

export function formatZodErrors(zodError: z.ZodError): Record<string, string[]> {
	const errors: Record<string, string[]> = {};
	
	for (const error of zodError.errors) {
		const path = error.path.join('.');
		if (!errors[path]) {
			errors[path] = [];
		}
		errors[path].push(error.message);
	}
	
	return errors;
}

// Common validation patterns
export const patterns = {
	phone: /^[\+]?[1-9][\d]{0,15}$/,
	ssn: /^\d{3}-?\d{2}-?\d{4}$/,
	zipCode: /^\d{5}(-\d{4})?$/
};

// Custom validation functions
export function isValidDate(dateString: string): boolean {
	const date = new Date(dateString);
	return date instanceof Date && !isNaN(date.getTime());
}

export function isBusinessDay(dateString: string): boolean {
	const date = new Date(dateString);
	const day = date.getDay();
	return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
}

export function isFutureDate(dateString: string): boolean {
	const date = new Date(dateString);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return date > today;
}

export function isValidAge(birthDate: string, minAge: number = 16): boolean {
	const birth = new Date(birthDate);
	const today = new Date();
	const age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
		return age - 1 >= minAge;
	}
	
	return age >= minAge;
}