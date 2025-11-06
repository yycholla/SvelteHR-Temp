// GraphQL operations for user management

import { gql } from '@urql/svelte';

// Query to get all users with filtering and pagination
export const GET_USERS_QUERY = gql`
	query GetUsers($limit: Int = 50, $offset: Int = 0, $where: UsersBoolExp) {
		users(limit: $limit, offset: $offset, where: $where, orderBy: { created_at: DESC }) {
			id
			email
			first_name
			last_name
			display_name
			full_name
			role
			phone_number
			alternate_phone
			job_title
			status
			department_id
			manager_id
			hire_date
			termination_date
			is_active
			failed_login_attempts
			locked_until
			last_login
			created_at
			updated_at
			deleted_at
			department {
				id
				name
				description
			}
			manager {
				id
				full_name
				display_name
				email
			}
			role_assignments {
				role {
					id
					name
					level
					description
				}
			}
			addresses(where: { is_primary: { _eq: true } }) {
				id
				address_type
				is_primary
				address_line_1
				address_line_2
				city
				state_province
				postal_code
				country
			}
			emergency_contacts(where: { is_primary: { _eq: true } }) {
				id
				name
				relationship
				phone_number
				email
				is_primary
			}
		}
		users_aggregate(where: $where) {
			aggregate {
				count
			}
		}
	}
`;

// Query to get a single user by ID
export const GET_USER_QUERY = gql`
	query GetUser($id: UUID!) {
		user(id: $id) {
			id
			email
			first_name
			last_name
			display_name
			full_name
			role
			phone_number
			alternate_phone
			job_title
			status
			department_id
			manager_id
			hire_date
			termination_date
			is_active
			failed_login_attempts
			locked_until
			last_login
			created_at
			updated_at
			deleted_at
			department {
				id
				name
				description
			}
			manager {
				id
				full_name
				display_name
				email
			}
			role_assignments {
				role {
					id
					name
					level
					description
				}
			}
			addresses {
				id
				address_type
				is_primary
				address_line_1
				address_line_2
				city
				state_province
				postal_code
				country
				latitude
				longitude
			}
			emergency_contacts {
				id
				name
				relationship
				phone_number
				email
				is_primary
			}
			job_info {
				title
				hire_date
				employment_type
				is_remote
				work_schedule
				manager_id
				annual_salary
				currency
				pay_type
				last_review_date
				next_review_date
			}
			personal_info {
				date_of_birth
				social_security_number
				marital_status
				dependents
				pronouns
			}
		}
	}
`;

// Mutation to create a new user
export const CREATE_USER_MUTATION = gql`
	mutation CreateUser($input: CreateUserInput!) {
		createUser(input: $input) {
			user {
				id
				email
				first_name
				last_name
				display_name
				full_name
				role
				phone_number
				alternate_phone
				job_title
				status
				department_id
				manager_id
				hire_date
				termination_date
				is_active
				created_at
				updated_at
			}
		}
	}
`;

// Mutation to update an existing user
export const UPDATE_USER_MUTATION = gql`
	mutation UpdateUser($id: UUID!, $input: UpdateUserInput!) {
		updateUser(input: $input, id: $id) {
			user {
				id
				email
				first_name
				last_name
				display_name
				full_name
				role
				phone_number
				alternate_phone
				job_title
				status
				department_id
				manager_id
				hire_date
				termination_date
				is_active
				updated_at
			}
		}
	}
`;

// Mutation to delete a user
export const DELETE_USER_MUTATION = gql`
	mutation DeleteUser($id: UUID!) {
		deleteUser(id: $id) {
			deletedUserId
		}
	}
`;
