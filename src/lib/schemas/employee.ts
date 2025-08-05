import { z } from 'zod';

// Employee status enum
export const employeeStatusSchema = z.enum([
	'ACTIVE',
	'INACTIVE', 
	'TERMINATED',
	'ON_LEAVE',
	'PENDING'
]);

// Department schema
export const departmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	managerId: z.string().optional(),
	isActive: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

// Position/Job Title schema
export const positionSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	departmentId: z.string(),
	level: z.string().optional(),
	minSalary: z.number().optional(),
	maxSalary: z.number().optional(),
	isActive: z.boolean(),
});

// Employee schema (based on backend Employee model)
export const employeeSchema = z.object({
	id: z.string(),
	employeeId: z.string(), // Employee number/code
	userId: z.string().optional(), // Link to User account
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
	phone: z.string().optional(),
	dateOfBirth: z.string().date().optional(),
	hireDate: z.string().date(),
	terminationDate: z.string().date().optional(),
	status: employeeStatusSchema,
	departmentId: z.string(),
	positionId: z.string(),
	managerId: z.string().optional(),
	salary: z.number().optional(),
	currency: z.string().default('USD'),
	workLocation: z.string().optional(),
	workType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
	address: z.object({
		street: z.string(),
		city: z.string(),
		state: z.string(),
		zipCode: z.string(),
		country: z.string(),
	}).optional(),
	emergencyContact: z.object({
		name: z.string(),
		relationship: z.string(),
		phone: z.string(),
		email: z.string().email().optional(),
	}).optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

// Create employee form schema
export const createEmployeeSchema = employeeSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	// Make some fields required for creation
	email: z.string().email('Please enter a valid email address'),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	hireDate: z.string().date(),
	departmentId: z.string().min(1, 'Department is required'),
	positionId: z.string().min(1, 'Position is required'),
});

// Update employee schema
export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
	id: z.string(),
});

// Employee search/filter schema
export const employeeFilterSchema = z.object({
	search: z.string().optional(),
	departmentId: z.string().optional(),
	status: employeeStatusSchema.optional(),
	managerId: z.string().optional(),
	workType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
	hiredAfter: z.string().date().optional(),
	hiredBefore: z.string().date().optional(),
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(100).default(20),
	sortBy: z.enum(['firstName', 'lastName', 'hireDate', 'department', 'position']).default('lastName'),
	sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Employee list response schema
export const employeeListResponseSchema = z.object({
	employees: z.array(employeeSchema),
	totalCount: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
});

// Export types
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Position = z.infer<typeof positionSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;