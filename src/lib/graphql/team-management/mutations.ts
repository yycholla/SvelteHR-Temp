import { gql } from '@urql/svelte';

// Mutation: Create new team/department
export const CREATE_TEAM = gql`
	mutation CreateTeam($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update team/department
export const UPDATE_TEAM = gql`
	mutation UpdateTeam($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete team/department
export const DELETE_TEAM = gql`
	mutation DeleteTeam($input: DeleteDepartmentInput!) {
		deleteDepartment(input: $input) {
			deletedDepartmentId
			clientMutationId
		}
	}
`;

// Mutation: Assign department head
export const ASSIGN_DEPARTMENT_HEAD = gql`
	mutation AssignDepartmentHead($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Move employee to different team
export const MOVE_EMPLOYEE_TO_TEAM = gql`
	mutation MoveEmployeeToTeam($input: UpdateUserInput!) {
		updateUser(input: $input) {
			user {
				id
				displayName
				department {
					id
					name
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;
