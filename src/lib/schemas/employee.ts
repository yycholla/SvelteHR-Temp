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

// Department schema for nested responses (uppercase fields)
export const nestedDepartmentSchema = z.object({
	ID: z.number(),
	Name: z.string(),
	Description: z.string().nullable().optional(),
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
}));

// Department schema for direct API responses (lowercase fields)
const departmentApiSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    managerId: z.number().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
}).transform((dept) => ({
    id: dept.id.toString(),
    name: dept.name,
    description: dept.description,
    managerId: dept.managerId?.toString(),
    createdAt: dept.createdAt,
    updatedAt: dept.updatedAt
}));

// Also accept already-transformed department objects from cache
const departmentTransformedSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    managerId: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

export const departmentSchema = z.union([
    departmentApiSchema,
    departmentTransformedSchema
]);

// Role schema (handles both uppercase and lowercase API response formats)
export const roleSchema = z.union([
	// Uppercase format (original)
	z.object({
		ID: z.number(),
		Name: z.string(),
		Description: z.string().nullable().optional(),
		Permissions: z.any().nullable().optional(),
		workosRoleSlug: z.string().nullable().optional(),
		isWorkosManaged: z.boolean().nullable().optional(),
		CreatedAt: z.string().optional(),
		UpdatedAt: z.string().optional()
	}).transform((role) => ({
		id: role.ID.toString(),
		name: role.Name,
		description: role.Description,
		workosRoleSlug: role.workosRoleSlug,
		isWorkosManaged: role.isWorkosManaged,
		createdAt: role.CreatedAt,
		updatedAt: role.UpdatedAt
	})),
	// Lowercase format (your API)
	z.object({
		id: z.number(),
		name: z.string(),
		description: z.string().nullable().optional(),
		permissions: z.any().nullable().optional(),
		workosRoleSlug: z.string().nullable().optional(),
		isWorkosManaged: z.boolean().nullable().optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional()
	}).transform((role) => ({
		id: role.id.toString(),
		name: role.name,
		description: role.description,
		workosRoleSlug: role.workosRoleSlug,
		isWorkosManaged: role.isWorkosManaged,
		createdAt: role.createdAt,
		updatedAt: role.updatedAt
	}))
]);

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
	DepartmentID: z.number().nullable().optional(),
	Department: nestedDepartmentSchema.nullable().optional()
});

// Personal information schema (nested in Employee)
export const personalInformationSchema = z.object({
	MiddleName: z.string().nullable().optional(),
	DateOfBirth: z.string().nullable().optional(),
	Gender: z.string().nullable().optional(),
	SSNEncrypted: z.string().nullable().optional()
});

// Flat structure (your API format) - put first to prioritize
const flatEmployeeSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	middleName: z.string().nullable().optional(),
	email: z.string(),
	phoneNumber: z.string().nullable().optional(),
	workPhoneNumber: z.string().nullable().optional(),
	addressStreet: z.string().nullable().optional(),
	addressCity: z.string().nullable().optional(),
	addressState: z.string().nullable().optional(),
	addressZip: z.string().nullable().optional(),
	emergencyContactName: z.string().nullable().optional(),
	emergencyContactRelationship: z.string().nullable().optional(),
	emergencyContactPhone: z.string().nullable().optional(),
	payType: z.string().nullable().optional(),
	payRate: z.number().nullable().optional(),
	bankName: z.string().nullable().optional(),
	bankAccountType: z.string().nullable().optional(),
	directDepositEnabled: z.boolean().nullable().optional(),
	taxWithholdingInfo: z.string().nullable().optional(),
	workAuthorizationStatus: z.string().nullable().optional(),
	trainingInfo: z.string().nullable().optional(),
	healthInsuranceInfo: z.string().nullable().optional(),
	retirementPlanInfo: z.string().nullable().optional(),
	departmentId: z.number().nullable().optional(),
	roleId: z.number(),
	jobTitle: z.string().nullable().optional(),
	hireDate: z.string().nullable().optional(),
	dateOfBirth: z.string().nullable().optional(),
	gender: z.string().nullable().optional(),
	employmentType: z.string().nullable().optional(),
	onboardingStatus: z.string().nullable().optional(),
	username: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	department: z.object({
		id: z.number(),
		name: z.string()
	}).nullable().optional(),
	role: roleSchema.nullable().optional()
});

// Nested structure (original format) - requires ContactInformation
const nestedEmployeeSchema = z.object({
	id: z.number(),
	username: z.string(),
	roleId: z.number(),
	role: roleSchema.nullable().optional(),
	firstName: z.string(),
	lastName: z.string(),
	ContactInformation: contactInformationSchema.nullable().optional(),
	Compensation: compensationSchema.nullable().optional(),
	JobInformation: jobInformationSchema.nullable().optional(),
	PersonalInformation: personalInformationSchema.nullable().optional(),
	TaxWithholdingInfo: z.string().nullable().optional(),
	WorkAuthorizationStatus: z.string().nullable().optional(),
	TrainingInfo: z.string().nullable().optional(),
	HealthInsuranceInfo: z.string().nullable().optional(),
	RetirementPlanInfo: z.string().nullable().optional(),
	OnboardingStatus: employeeStatusSchema.nullable().optional(),
	IsManager: z.boolean().nullable().optional(),
	migratedToWorkos: z.boolean().nullable().optional(),
	CreatedAt: z.string().optional(),
	UpdatedAt: z.string().optional()
});

// Employee schema (supports both nested and flat API response structures)
// Flat format first since that's what the API returns
export const employeeSchema = z.union([
	flatEmployeeSchema,
	nestedEmployeeSchema
]).transform((emp) => {
	// Check if this is the nested format or flat format
	const isNested = 'ContactInformation' in emp;
	
	if (!isNested) {
		// Handle flat format (your API) - this should be the primary path
		const flatEmp = emp as z.infer<typeof flatEmployeeSchema>;
		return {
			// Core fields
			id: flatEmp.id.toString(),
			employeeId: flatEmp.username || flatEmp.id.toString(),
			firstName: flatEmp.firstName,
			lastName: flatEmp.lastName,
			middleName: flatEmp.middleName,
			
			// Contact info
			email: flatEmp.email || '',
			phone: flatEmp.phoneNumber,
			phoneNumber: flatEmp.phoneNumber,
			workPhoneNumber: flatEmp.workPhoneNumber,
			
			// Address
			addressStreet: flatEmp.addressStreet,
			addressCity: flatEmp.addressCity,
			addressState: flatEmp.addressState,
			addressZip: flatEmp.addressZip,
			location: [flatEmp.addressCity, flatEmp.addressState].filter(Boolean).join(', ') || 'Remote',
			
			// Emergency contact
			emergencyContactName: flatEmp.emergencyContactName,
			emergencyContactRelationship: flatEmp.emergencyContactRelationship,
			emergencyContactPhone: flatEmp.emergencyContactPhone,
			
			// Job details
			jobTitle: flatEmp.jobTitle || '',
			hireDate: flatEmp.hireDate || '',
			employmentType: flatEmp.employmentType,
			departmentId: flatEmp.departmentId?.toString(),
			managerId: undefined, // Not in flat format
			
			// Compensation
			payType: flatEmp.payType,
			payRate: flatEmp.payRate,
			salary: flatEmp.payRate, // Alias for UI
			bankName: flatEmp.bankName,
			bankAccountType: flatEmp.bankAccountType,
			directDepositEnabled: flatEmp.directDepositEnabled,
			
			// Personal info
			dateOfBirth: flatEmp.dateOfBirth,
			gender: flatEmp.gender,
			
			// Status and role
			onboardingStatus: flatEmp.onboardingStatus || 'Active',
			status: flatEmp.onboardingStatus || 'Active', // Alias for UI
			roleId: flatEmp.roleId.toString(),
			isManager: false, // Not in flat format
			
			// Other info
			taxWithholdingInfo: flatEmp.taxWithholdingInfo,
			workAuthorizationStatus: flatEmp.workAuthorizationStatus,
			trainingInfo: flatEmp.trainingInfo,
			healthInsuranceInfo: flatEmp.healthInsuranceInfo,
			retirementPlanInfo: flatEmp.retirementPlanInfo,
			
			// Metadata
			username: flatEmp.username,
			createdAt: flatEmp.createdAt,
			updatedAt: flatEmp.updatedAt,
			
			// Nested objects for UI compatibility
			department: flatEmp.department ? {
				id: flatEmp.department.id.toString(),
				name: flatEmp.department.name,
				color: 'blue' // Default color for UI
			} : flatEmp.departmentId ? {
				id: flatEmp.departmentId.toString(),
				name: 'Unknown Department',
				color: 'gray' // Gray color for unknown departments
			} : undefined,
			
			position: flatEmp.role ? {
				id: flatEmp.role.id,
				title: flatEmp.jobTitle || flatEmp.role.name,
				level: 'N/A'
			} : {
				id: flatEmp.roleId.toString(),
				title: flatEmp.jobTitle || 'Unknown',
				level: 'N/A'
			},
			
			role: flatEmp.role,
			
			// Generated avatar
			avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(flatEmp.firstName + ' ' + flatEmp.lastName)}&background=random`
		};
	} else if (isNested) {
		// Handle nested format (original)
		const nestedEmp = emp as z.infer<typeof nestedEmployeeSchema>;
		const contact = nestedEmp.ContactInformation || {};
		const compensation = nestedEmp.Compensation || {};
		const jobInfo = nestedEmp.JobInformation || {};
		const personalInfo = nestedEmp.PersonalInformation || {};
		
		return {
			// Core fields
			id: nestedEmp.id.toString(),
			employeeId: nestedEmp.username || nestedEmp.id.toString(),
			firstName: nestedEmp.firstName,
			lastName: nestedEmp.lastName,
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
			onboardingStatus: nestedEmp.OnboardingStatus || 'Active',
			status: nestedEmp.OnboardingStatus || 'Active', // Alias for UI
			roleId: nestedEmp.roleId.toString(),
			isManager: nestedEmp.IsManager || false,
			
			// Other info
			taxWithholdingInfo: nestedEmp.TaxWithholdingInfo,
			workAuthorizationStatus: nestedEmp.WorkAuthorizationStatus,
			trainingInfo: nestedEmp.TrainingInfo,
			healthInsuranceInfo: nestedEmp.HealthInsuranceInfo,
			retirementPlanInfo: nestedEmp.RetirementPlanInfo,
			
			// Metadata
			username: nestedEmp.username,
			createdAt: nestedEmp.CreatedAt || new Date().toISOString(),
			updatedAt: nestedEmp.UpdatedAt || new Date().toISOString(),
			
			// Nested objects for UI compatibility
			department: jobInfo.Department ? {
				id: jobInfo.Department.id,
				name: jobInfo.Department.name,
				color: 'blue' // Default color for UI
			} : undefined,
			
			position: nestedEmp.role ? {
				id: nestedEmp.role.id,
				title: jobInfo.JobTitle || nestedEmp.role.name,
				level: 'N/A'
			} : {
				id: nestedEmp.roleId.toString(),
				title: jobInfo.JobTitle || 'Unknown',
				level: 'N/A'
			},
			
			role: nestedEmp.role,
			
			// Generated avatar
			avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nestedEmp.firstName + ' ' + nestedEmp.lastName)}&background=random`
		};
	}
});

// Create employee schema
export const createEmployeeSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().email().optional(),
	phoneNumber: z.string().optional(),
	roleId: z.number().min(1, 'Role is required'),
	departmentId: z.number().optional(),
	managerId: z.number().optional(),
	jobTitle: z.string().optional(),
	hireDate: z.string().optional(),
	employmentType: z.string().optional(),
	onboardingStatus: employeeStatusSchema.optional(),
	isManager: z.boolean().optional(),
});

// Update employee schema - explicit definition for better zod adapter compatibility
export const updateEmployeeSchema = z.object({
	id: z.number(),
	username: z.string().min(1, 'Username is required'),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().email().optional(),
	phoneNumber: z.string().optional(),
	roleId: z.number().min(1, 'Role is required'),
	departmentId: z.number().optional(),
	managerId: z.number().optional(),
	jobTitle: z.string().optional(),
	hireDate: z.string().optional(),
	employmentType: z.string().optional(),
	onboardingStatus: employeeStatusSchema.optional(),
	isManager: z.boolean().optional(),
});

// Employee filter schema
export const employeeFilterSchema = z.object({
	search: z.string().optional(),
	departmentId: z.string().optional(),
	status: employeeStatusSchema.optional(),
	managerId: z.string().optional(),
	roleId: z.string().optional(),
	employmentType: z.string().optional(),
	hiredAfter: z.string().optional(),
	hiredBefore: z.string().optional(),
	isManager: z.boolean().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['firstName', 'lastName', 'hireDate', 'department', 'jobTitle']).default('lastName'),
	order: z.enum(['ASC', 'DESC']).default('ASC'),
});

// Employee list response schemas supporting multiple API formats
const employeeListResponseBackendSchema = z.object({
    data: z.array(employeeSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
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

const employeeListResponseAltSchema = z.object({
    employees: z.array(employeeSchema),
    totalCount: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean()
});

export const employeeListResponseSchema = z.union([
    employeeListResponseBackendSchema,
    employeeListResponseAltSchema
]);

// Embedded schemas for UI compatibility
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

// Export types
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type PayType = z.infer<typeof payTypeSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;
export type EmbeddedDepartment = z.infer<typeof embeddedDepartmentSchema>;
export type EmbeddedPosition = z.infer<typeof embeddedPositionSchema>;