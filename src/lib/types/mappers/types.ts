/**
 * User Type Mapper Types
 */

/**
 * UserGraphQL - Matches GraphQL API snake_case response structure
 * This represents the raw data returned from GraphQL queries
 */
export interface UserGraphQL {
	id: string;
	email: string;
	password_hash?: string;
	first_name?: string;
	last_name?: string;
	display_name?: string;
	full_name?: string;
	role?: string;
	phone_number?: string;
	alternate_phone?: string;
	job_title?: string;
	status?: string;
	department_id?: string;
	manager_id?: string;
	hire_date?: string;
	termination_date?: string;
	is_active?: boolean;
	failed_login_attempts?: number;
	locked_until?: string;
	last_login?: string;
	created_at?: string;
	updated_at?: string;
	deleted_at?: string;
	profile_image?: string;
	onboarding_status?: string;

	// Nested objects (also snake_case)
	job_info?: JobInfoGraphQL;
	contact_info?: ContactInfoGraphQL;
	personal_info?: PersonalInfoGraphQL;
	emergency_contacts?: EmergencyContactGraphQL[];
	addresses?: UserAddressGraphQL[];

	// Related entities
	department?: DepartmentGraphQL;
	manager?: UserGraphQL;
	role_assignments?: RoleAssignmentGraphQL[];
}

/**
 * JobInfoGraphQL - Job information from GraphQL (snake_case)
 */
export interface JobInfoGraphQL {
	title?: string;
	department?: string;
	manager?: string;
	hire_date?: string;
	employment_type?: string;
	salary?: number;
	currency?: string;
	is_remote?: boolean;
	pay_type?: string;
	start_date?: string;
	end_date?: string;
	job_title?: string;
	department_id?: string;
	manager_id?: string;
	employee_id?: string;
	reports_to?: string;
}

/**
 * ContactInfoGraphQL - Contact information from GraphQL (snake_case)
 */
export interface ContactInfoGraphQL {
	phone_number?: string;
	address?: string;
	emergency_contact_name?: string;
	emergency_contact_phone?: string;
	address_line_1?: string;
	address_line_2?: string;
	city?: string;
	state_province?: string;
	postal_code?: string;
	country?: string;
	employee_id?: string;
}

/**
 * PersonalInfoGraphQL - Personal information from GraphQL (snake_case)
 */
export interface PersonalInfoGraphQL {
	date_of_birth?: string;
	gender?: string;
	nationality?: string;
	marital_status?: string;
	social_security_number?: string;
	dependents?: number;
	pronouns?: string;
}

/**
 * EmergencyContactGraphQL - Emergency contact from GraphQL (snake_case)
 */
export interface EmergencyContactGraphQL {
	id: string;
	employee_id?: string;
	name: string;
	relationship: string;
	phone_number: string;
	email?: string;
	is_primary?: boolean;
}

/**
 * UserAddressGraphQL - User address from GraphQL (snake_case)
 */
export interface UserAddressGraphQL {
	id?: string;
	address_type?: string;
	is_primary?: boolean;
	address_line_1?: string;
	address_line_2?: string;
	city?: string;
	state_province?: string;
	postal_code?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
}

/**
 * DepartmentGraphQL - Department from GraphQL (snake_case)
 */
export interface DepartmentGraphQL {
	id: string;
	name: string;
	code?: string;
	description?: string;
	manager_id?: string;
	parent_department_id?: string;
	created_at?: string;
	updated_at?: string;
	is_active?: boolean;
	manager?: UserGraphQL;
	parent_department?: DepartmentGraphQL;
}

/**
 * RoleAssignmentGraphQL - Role assignment from GraphQL (snake_case)
 */
export interface RoleAssignmentGraphQL {
	role: {
		id: string;
		name: string;
		level?: number;
		description?: string;
		display_name?: string;
	};
}

/**
 * UserClient - Client-side camelCase interface used by components
 * This is what Svelte components expect to work with
 */
export interface UserClient {
	id: string;
	email: string;
	passwordHash?: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	fullName?: string;
	name?: string; // Alias for displayName or fullName
	username?: string; // Login username
	role?: string;
	roles?: Array<{ id: string; name: string; displayName?: string }>;
	phoneNumber?: string;
	alternatePhone?: string;
	jobTitle?: string;
	status?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	terminationDate?: string;
	isActive?: boolean;
	failedLoginAttempts?: number;
	lockedUntil?: string;
	lastLogin?: string;
	createdAt?: string;
	updatedAt?: string;
	deletedAt?: string;
	profileImage?: string;
	onboardingStatus?: string;

	// Nested objects (camelCase)
	jobInfo?: JobInfoClient;
	contactInfo?: ContactInfoClient;
	personalInfo?: PersonalInfoClient;
	emergencyContact?: EmergencyContactClient;
	emergencyContacts?: EmergencyContactClient[];
	addresses?: UserAddressClient[];
	address?: {
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};

	// Related entities
	department?: DepartmentClient;
	manager?: UserClient;
	roleAssignments?: Array<{
		role: {
			id: string;
			name: string;
		};
	}>;

	// Job information convenience access
	job_information?: {
		title?: string;
		department?: {
			id: string;
			name: string;
		};
		hire_date?: string;
		employment_type?: string;
	};
}

/**
 * JobInfoClient - Job information for client-side (camelCase)
 */
export interface JobInfoClient {
	title?: string;
	department?: string;
	manager?: string;
	hireDate?: string;
	employmentType?: string;
	salary?: number;
	currency?: string;
	isRemote?: boolean;
	payType?: string;
	startDate?: string;
	endDate?: string;
	jobTitle?: string;
	departmentId?: string;
	managerId?: string;
	employeeId?: string;
	reportsTo?: string;
}

/**
 * ContactInfoClient - Contact information for client-side (camelCase)
 */
export interface ContactInfoClient {
	phoneNumber?: string;
	address?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	stateProvince?: string;
	postalCode?: string;
	country?: string;
	employeeId?: string;
}

/**
 * PersonalInfoClient - Personal information for client-side (camelCase)
 */
export interface PersonalInfoClient {
	dateOfBirth?: string;
	gender?: string;
	nationality?: string;
	maritalStatus?: string;
	socialSecurityNumber?: string;
	dependents?: number;
	pronouns?: string;
}

/**
 * EmergencyContactClient - Emergency contact for client-side (camelCase)
 */
export interface EmergencyContactClient {
	id: string;
	employeeId?: string;
	name: string;
	relationship: string;
	phoneNumber: string;
	phone?: string; // Alias for phoneNumber
	email?: string;
	isPrimary?: boolean;
}

/**
 * UserAddressClient - User address for client-side (camelCase)
 */
export interface UserAddressClient {
	id?: string;
	addressType?: string;
	isPrimary?: boolean;
	addressLine1?: string;
	street?: string; // Alias for addressLine1
	addressLine2?: string;
	city?: string;
	stateProvince?: string;
	state?: string; // Alias for stateProvince
	postalCode?: string;
	zipCode?: string; // Alias for postalCode
	country?: string;
	latitude?: number;
	longitude?: number;
}

/**
 * DepartmentClient - Department for client-side (camelCase)
 */
export interface DepartmentClient {
	id: string;
	name: string;
	code?: string;
	description?: string;
	managerId?: string;
	parentDepartmentId?: string;
	createdAt?: string;
	updatedAt?: string;
	isActive?: boolean;
	manager?: UserClient;
	parentDepartment?: DepartmentClient;
	employeeCount?: number;
	budgetLimit?: number;
	costCenter?: string;
	location?: string;
	isRemoteEnabled?: boolean;
}
