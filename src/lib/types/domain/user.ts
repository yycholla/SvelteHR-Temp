import type { JobInfo, ContactInfo, PersonalInfo, EmergencyContact, UserAddress } from './nested';

export interface User {
	id: string;
	email: string;
	password_hash: string;
	first_name: string;
	last_name: string;
	display_name: string;
	full_name: string;
	role: string;
	phone_number?: string;
	alternate_phone?: string;
	job_title?: string;
	status?: string;
	department_id?: string;
	manager_id?: string;
	hire_date?: string;
	termination_date?: string;
	is_active: boolean;
	isActive?: boolean;
	failed_login_attempts: number;
	locked_until?: string;
	last_login?: string;
	created_at: string;
	updated_at: string;
	deleted_at?: string;
	username?: string;
	profile_image?: string;
	profileImage?: string;
	// CamelCase aliases for GraphQL compatibility
	firstName?: string;
	lastName?: string;
	displayName?: string;
	fullName?: string;
	hireDate?: string;
	avatarUrl?: string;
	jobTitle?: string;
	departmentId?: string; // Added alias
	managerId?: string; // Added alias
	// Nested objects from related tables
	job_info?: JobInfo;
	contact_info?: ContactInfo;
	personal_info?: PersonalInfo;
	emergency_contact?: EmergencyContact;
	addresses?: UserAddress[];
	job_information?: {
		department?: {
			id?: string;
			name?: string;
		};
	};
	// Relations
	role_assignments?: Array<{
		role: {
			id: string;
			name: string;
			level: number;
			description?: string;
		};
	}>;
	department?: {
		id: string;
		name?: string;
		code?: string;
		description?: string;
		manager?: {
			id: string;
			display_name?: string;
			displayName?: string;
			full_name?: string;
			fullName?: string;
			email?: string;
		};
	};
	manager?: {
		id: string;
		display_name?: string;
		displayName?: string;
		full_name?: string;
		fullName?: string;
		email?: string;
	};
}

export interface UserFilter {
	isActive?: boolean;
	onboardingStatus?: string[];
	departmentId?: string;
	roleId?: string;
	searchQuery?: string;
	hireDate?: {
		start?: string;
		end?: string;
	};
}

export interface CreateUserInput {
	email: string;
	username?: string;
	password?: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	roleIds?: string[];
	departmentId?: string;
	jobTitle?: string;
	hireDate?: string;
	phoneNumber?: string;
	addressStreet?: string;
	addressCity?: string;
	addressState?: string;
	addressZipCode?: string;
	employmentType?: string;
	isRemote?: boolean;
	managerId?: string;
	salary?: number;
	payType?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	emergencyContactRelationship?: string;
}

export interface UpdateUserInput {
	email?: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	roleIds?: string[];
	departmentId?: string;
	jobTitle?: string;
	phoneNumber?: string;
	addressStreet?: string;
	addressCity?: string;
	addressState?: string;
	addressZipCode?: string;
	managerId?: string;
	isActive?: boolean;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	emergencyContactRelationship?: string;
}
