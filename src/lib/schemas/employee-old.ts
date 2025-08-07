import { z } from 'zod';

// Employee status enum (based on actual API schema)
export const employeeStatusSchema = z.enum([
	'PreHire',
	'Onboarding', 
	'Active',
	'Terminated'
]);

// Employment type enum (keeping UI-friendly format)
export const employmentTypeSchema = z.enum([
	'Full-time',
	'Part-time',
	'Contract',
	'Intern'
]);

// Pay type enum (based on actual API schema)
export const payTypeSchema = z.enum([
	'Salary',
	'Hourly'
]);

// Department schema (handles both API formats)
export const departmentSchema = z.union([
	// Format 1: Direct departments API (lowercase)
	z.object({
		id: z.number(),
		name: z.string(),
		description: z.string().optional(),
		managerId: z.number().nullable().optional(),
		manager: z.any().nullable().optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional()
	}).transform((dept) => ({
		id: dept.id.toString(),
		name: dept.name,
		description: dept.description,
		managerId: dept.managerId?.toString(),
		createdAt: dept.createdAt,
		updatedAt: dept.updatedAt
	})),
	// Format 2: Nested in employee (uppercase)
	z.object({
		ID: z.number(),
		Name: z.string(),
		Description: z.string().optional(),
		ManagerID: z.number().nullable().optional(),
		Manager: z.any().nullable().optional(),
		CreatedAt: z.string().optional(),
		UpdatedAt: z.string().optional()
	}).transform((dept) => ({
		id: dept.ID.toString(),
		name: dept.Name,
		description: dept.Description,
		managerId: dept.ManagerID?.toString(),
		createdAt: dept.CreatedAt,
		updatedAt: dept.UpdatedAt
	}))
]);

// Role schema (based on actual API schema)
export const roleSchema = z.object({
	ID: z.number(),
	Name: z.string(),
	Description: z.string().optional(),
	Permissions: z.any().optional(),
	workosRoleSlug: z.string().optional(),
	isWorkosManaged: z.boolean().optional(),
	CreatedAt: z.string().optional(),
	UpdatedAt: z.string().optional()
}).transform((role) => ({
	id: role.ID.toString(), // Convert to string for UI consistency
	name: role.Name,
	description: role.Description,
	workosRoleSlug: role.workosRoleSlug,
	isWorkosManaged: role.isWorkosManaged
}));

// Position/Job Title schema (for compatibility - map from role)
export const positionSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	departmentId: z.string().optional(),
	level: z.string().optional(),
	minSalary: z.number().optional(),
	maxSalary: z.number().optional(),
	isActive: z.boolean().default(true),
});

// Embedded department and position schemas for UI compatibility
export const embeddedDepartmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string().optional(),
});

export const embeddedPositionSchema = z.object({
	id: z.string(),
	title: z.string(),
	level: z.string().optional(),
});

// Contact information schema (nested in Employee)
export const contactInformationSchema = z.object({
	Email: z.string().email().nullable().optional(),
	PhoneNumber: z.string().nullable().optional(),
	WorkPhoneNumber: z.string().nullable().optional(),
	AddressStreet: z.string().nullable().optional(),
	AddressCity: z.string().nullable().optional(),
	AddressState: z.string().nullable().optional(),
	AddressZip: z.string().nullable().optional(),
	EmergencyContactName: z.string().nullable().optional(),
	EmergencyContactRelationship: z.string().nullable().optional(),
	EmergencyContactPhone: z.string().nullable().optional()
});

// Compensation schema (nested in Employee)
export const compensationSchema = z.object({
	PayType: payTypeSchema.nullable().optional(),
	PayRate: z.number().nullable().optional(),
	BankName: z.string().nullable().optional(),
	BankAccountType: z.string().nullable().optional(),
	BankRoutingNumberEncrypted: z.string().nullable().optional(),
	BankAccountNumberEncrypted: z.string().nullable().optional(),
	DirectDepositEnabled: z.boolean().nullable().optional()
});

// Job information schema (nested in Employee)
export const jobInformationSchema = z.object({
	JobTitle: z.string().nullable().optional(),
	HireDate: z.string().nullable().optional(),
	EmploymentType: employmentTypeSchema.nullable().optional(),
	ManagerID: z.number().nullable().optional(),
	Manager: z.any().nullable().optional(), // Can be null or Employee
	DepartmentID: z.number().optional(),
	Department: departmentSchema.optional()
});

// Personal information schema (nested in Employee)
export const personalInformationSchema = z.object({
	MiddleName: z.string().nullable().optional(),
	DateOfBirth: z.string().nullable().optional(),
	Gender: z.string().nullable().optional(),
	SSNEncrypted: z.string().nullable().optional()
});

// Employee schema (based on actual API response structure)
export const employeeSchema = z.object({
	id: z.number(),
	username: z.string(),
	roleId: z.number(),
	role: roleSchema.optional(),
	firstName: z.string(),
	lastName: z.string(),
	ContactInformation: contactInformationSchema.optional(),
	Compensation: compensationSchema.optional(),
	JobInformation: jobInformationSchema.optional(),
	PersonalInformation: personalInformationSchema.optional(),
	TaxWithholdingInfo: z.string().nullable().optional(),
	WorkAuthorizationStatus: z.string().nullable().optional(),
	TrainingInfo: z.string().nullable().optional(),
	HealthInsuranceInfo: z.string().nullable().optional(),
	RetirementPlanInfo: z.string().nullable().optional(),
	OnboardingStatus: employeeStatusSchema.optional(),
	IsManager: z.boolean().optional(),
	migratedToWorkos: z.boolean().optional(),
	CreatedAt: z.string().optional(),
	UpdatedAt: z.string().optional()
}).transform((emp) => {
	// Transform API format to UI-compatible format
	const contact = emp.ContactInformation || {};
	const compensation = emp.Compensation || {};
	const jobInfo = emp.JobInformation || {};
	const personalInfo = emp.PersonalInformation || {};
	
	return {
		// Core fields
		id: emp.id.toString(),
		employeeId: emp.username || emp.id.toString(),
		firstName: emp.firstName,
		lastName: emp.lastName,
		middleName: personalInfo.MiddleName,
		
		// Contact info
		email: contact.Email || '',
		phone: contact.PhoneNumber,
		phoneNumber: contact.PhoneNumber,
		workPhoneNumber: contact.WorkPhoneNumber,
		
		// Address
		addressStreet: contact.AddressStreet,
		addressCity: contact.AddressCity,
		addressState: contact.AddressState,
		addressZip: contact.AddressZip,
		location: [contact.AddressCity, contact.AddressState].filter(Boolean).join(', ') || 'Remote',
		
		// Emergency contact
		emergencyContactName: contact.EmergencyContactName,
		emergencyContactRelationship: contact.EmergencyContactRelationship,
		emergencyContactPhone: contact.EmergencyContactPhone,
		
		// Job details
		jobTitle: jobInfo.JobTitle || '',
		hireDate: jobInfo.HireDate || '',
		employmentType: jobInfo.EmploymentType,
		departmentId: jobInfo.DepartmentID?.toString(),
		managerId: jobInfo.ManagerID?.toString(),
		
		// Compensation
		payType: compensation.PayType,
		payRate: compensation.PayRate,
		salary: compensation.PayRate, // Alias for UI
		bankName: compensation.BankName,
		bankAccountType: compensation.BankAccountType,
		directDepositEnabled: compensation.DirectDepositEnabled,
		
		// Personal info
		dateOfBirth: personalInfo.DateOfBirth,
		gender: personalInfo.Gender,
		
		// Status and role
		onboardingStatus: emp.OnboardingStatus || 'Active',
		status: emp.OnboardingStatus || 'Active', // Alias for UI
		roleId: emp.roleId.toString(),
		isManager: emp.IsManager || false,
		
		// Other info
		taxWithholdingInfo: emp.TaxWithholdingInfo,
		workAuthorizationStatus: emp.WorkAuthorizationStatus,
		trainingInfo: emp.TrainingInfo,
		healthInsuranceInfo: emp.HealthInsuranceInfo,
		retirementPlanInfo: emp.RetirementPlanInfo,
		
		// Metadata
		username: emp.username,
		createdAt: emp.CreatedAt || new Date().toISOString(),
		updatedAt: emp.UpdatedAt || new Date().toISOString(),
		
		// Nested objects for UI compatibility
		department: jobInfo.Department ? {
			id: jobInfo.Department.id.toString(),
			name: jobInfo.Department.name,
			color: 'blue' // Default color for UI
		} : undefined,
		
		position: emp.role ? {
			id: emp.role.id.toString(),
			title: jobInfo.JobTitle || emp.role.name,
			level: 'N/A'
		} : {
			id: emp.roleId.toString(),
			title: jobInfo.JobTitle || 'Unknown',
			level: 'N/A'
		},
		
		role: emp.role,
		
		// Generated avatar
		avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + ' ' + emp.lastName)}&background=random`
	};
});

// Base employee schema without transform for forms
const baseEmployeeSchema = z.object({
	id: z.number(),
	username: z.string(),
	roleId: z.number(),
	role: roleSchema.optional(),
	firstName: z.string(),
	lastName: z.string(),
	ContactInformation: contactInformationSchema.optional(),
	Compensation: compensationSchema.optional(),
	JobInformation: jobInformationSchema.optional(),
	PersonalInformation: personalInformationSchema.optional(),
	TaxWithholdingInfo: z.string().nullable().optional(),
	WorkAuthorizationStatus: z.string().nullable().optional(),
	TrainingInfo: z.string().nullable().optional(),
	HealthInsuranceInfo: z.string().nullable().optional(),
	RetirementPlanInfo: z.string().nullable().optional(),
	OnboardingStatus: employeeStatusSchema.optional(),
	IsManager: z.boolean().optional(),
	migratedToWorkos: z.boolean().optional(),
	CreatedAt: z.string().optional(),
	UpdatedAt: z.string().optional()
});

// Create employee form schema
export const createEmployeeSchema = baseEmployeeSchema.omit({
	id: true,
	CreatedAt: true,
	UpdatedAt: true,
}).extend({
	// Make some fields required for creation
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
});

// Update employee schema
export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
	id: z.number(),
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

// Employee list response schema (API returns paginated response)
export const employeeListResponseSchema = z.object({
	data: z.array(employeeSchema),
	page: z.number(),
	pageSize: z.number(),
	total: z.number(),
	totalPages: z.number(),
	hasMore: z.boolean()
}).transform((response) => ({
	employees: response.data,
	totalCount: response.total,
	page: response.page,
	limit: response.pageSize,
	totalPages: response.totalPages,
	hasMore: response.hasMore
}));

// Export types
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Position = z.infer<typeof positionSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;