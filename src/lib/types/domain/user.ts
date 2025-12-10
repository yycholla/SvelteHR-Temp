// User and Employee related types

export interface User {
	id: string;
	email: string;
	password_hash?: string;
	passwordHash?: string;
	first_name?: string;
	firstName?: string;
	last_name?: string;
	lastName?: string;
	display_name?: string;
	displayName?: string;
	full_name?: string;
	fullName?: string;
	name?: string; // Alias for display_name or full_name
	username?: string; // Login username
	role?: string;
	roles?: Array<{ id: string; name: string; displayName?: string }>;
	phone_number?: string;
	phoneNumber?: string;
	alternate_phone?: string;
	alternatePhone?: string;
	job_title?: string;
	jobTitle?: string;
	status?: string;
	department_id?: string;
	departmentId?: string;
	manager_id?: string;
	managerId?: string;
	hire_date?: string;
	hireDate?: string;
	termination_date?: string;
	terminationDate?: string;
	is_active?: boolean;
	isActive?: boolean;
	failed_login_attempts?: number;
	failedLoginAttempts?: number;
	locked_until?: string;
	lockedUntil?: string;
	last_login?: string;
	lastLogin?: string;
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;
	deleted_at?: string;
	deletedAt?: string;
	profile_image?: string;
	profileImage?: string; // Avatar/profile image URL
	// Nested objects from related tables
	job_info?: JobInfo;
	jobInfo?: JobInfo;
	job_information?: {
		title?: string;
		department?: {
			id: string;
			name: string;
		};
		hire_date?: string;
		employment_type?: string;
	};
	contact_info?: ContactInfo;
	contactInfo?: ContactInfo;
	personal_info?: PersonalInfo;
	personalInfo?: PersonalInfo;
	emergency_contact?: EmergencyContact;
	emergencyContact?: EmergencyContact;
	// Address support: both array and single object patterns
	addresses?: UserAddress[];
	address?: {
		// Single address object for convenience
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};
	// Relationship objects (populated from joins)
	department?: Department; // Populated department object
	manager?: User; // Populated manager object
	// Relations
	role_assignments?: Array<{
		role: {
			id: string;
			name: string;
		};
	}>;
}

export interface UserAddress {
	address_line_1?: string; // Added for backward compatibility
	street?: string;
	city?: string;
	state?: string;
	state_province?: string; // Added for backward compatibility
	zipCode?: string;
	postal_code?: string; // Added for backward compatibility
	country?: string;
}

export interface JobInfo {
	title?: string;
	department?: string;
	manager?: string;
	hire_date?: string;
	hireDate?: string;
	employment_type?: string;
	employmentType?: string;
	salary?: number;
	currency?: string;
	isRemote?: boolean;
	payType?: string;
}

export interface ContactInfo {
	phone_number?: string;
	phoneNumber?: string;
	address?: string;
	emergency_contact_name?: string;
	emergencyContactName?: string;
	emergency_contact_phone?: string;
	emergencyContactPhone?: string;
}

export interface PersonalInfo {
	date_of_birth?: string;
	dateOfBirth?: string;
	gender?: string;
	nationality?: string;
	marital_status?: string;
	maritalStatus?: string;
}

export interface EmergencyContact {
	id: string;
	employee_id?: string;
	employeeId?: string;
	name: string;
	relationship: string;
	phone_number: string;
	phoneNumber?: string;
	phone?: string; // Alias for phone_number
	email?: string;
	is_primary?: boolean;
	isPrimary?: boolean;
}

export interface Department {
	id: string;
	name: string;
	code?: string;
	description?: string;
	manager_id?: string;
	managerId?: string;
	parent_department_id?: string;
	parentDepartmentId?: string;
	manager?: User; // Populated manager object
	parent_department?: Department; // Populated parent department
	parentDepartment?: Department; // Alias for parent_department
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;
	isActive?: boolean;
	employeeCount?: number;
	budgetLimit?: number;
	costCenter?: string;
	location?: string;
	isRemoteEnabled?: boolean;
}

// Input types for mutations
export interface CreateUserInput {
	firstName: string;
	lastName: string;
	email: string;
	password?: string;
	role?: string;
	jobTitle?: string;
	departmentId?: string;
	managerId?: string;
	startDate?: string;
}

export interface UpdateUserInput {
	firstName?: string;
	lastName?: string;
	email?: string;
	jobTitle?: string;
	departmentId?: string;
	managerId?: string;
	isActive?: boolean;
}

export interface CreateDepartmentInput {
	name: string;
	description?: string;
	managerId?: string;
	parentDepartmentId?: string;
}

export interface UpdateDepartmentInput {
	name?: string;
	description?: string;
	managerId?: string;
	parentDepartmentId?: string;
	isActive?: boolean;
}

export interface DepartmentFilter {
	isActive?: boolean;
	search?: string;
}
