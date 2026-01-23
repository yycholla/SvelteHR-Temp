import { gql } from '@urql/svelte';

/**
 * Mutation: Create user (employee)
 * Backend: Rust idiomatic - createUser(input) returns User directly (no wrapper)
 *
 * @deprecated This GraphQL mutation is deprecated for employee creation.
 * Use EmployeeService.createEmployee() instead for employee CRUD operations.
 * See: docs/architecture/employee-module-migration.md
 * Migration: Task 18 (Week 4) - Employee create form migrated to domain service
 *
 * Benefits of using EmployeeService:
 * - Domain validation (Email, PersonName, HireDate value objects)
 * - Type safety throughout the stack
 * - Testability with MockRepository
 * - Business rule enforcement in domain layer
 */
export const CREATE_EMPLOYEE_MUTATION = gql`
	mutation CreateEmployee($input: CreateUserInput!) {
		createUser(input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			status
			isActive
			createdAt
			updatedAt
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Update user (employee)
 * Backend: Rust idiomatic - updateUser(id, input) returns User directly
 *
 * @deprecated This GraphQL mutation is deprecated for employee updates.
 * Use EmployeeService.updateEmployee() instead for employee CRUD operations.
 * See: docs/architecture/employee-module-migration.md
 * Migration: Not yet migrated (update form to be implemented)
 *
 * The domain service provides:
 * - Validation of updated fields (email format, name constraints, etc.)
 * - Business rule enforcement
 * - Type-safe updates
 */
export const UPDATE_EMPLOYEE_MUTATION = gql`
	mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			terminationDate
			status
			isActive
			updatedAt
			department {
				id
				name
			}
			manager {
				id
				fullName
			}
		}
	}
`;

/**
 * Mutation: Delete user (employee) - soft delete
 * Backend: Rust idiomatic - deleteUser(id) returns Boolean
 *
 * @deprecated This GraphQL mutation is deprecated for employee deletion.
 * Use EmployeeService.deleteEmployee() instead for employee CRUD operations.
 * See: docs/architecture/employee-module-migration.md
 * Migration: Not yet migrated (delete action to be implemented)
 *
 * Note: Both GraphQL mutation and domain service perform soft deletes
 * (sets status to Inactive, does not actually remove the record).
 */
export const DELETE_EMPLOYEE_MUTATION = gql`
	mutation DeleteEmployee($id: UUID!) {
		deleteUser(id: $id)
	}
`;
