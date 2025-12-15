import { gql } from '@urql/svelte';

// Query: Get all teams/departments with statistics
export const GET_ALL_TEAMS = gql`
	query GetAllTeams(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
		$filter: DepartmentFilter
	) {
		departments(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

// Query: Get single team/department by ID with detailed information
export const GET_TEAM_DETAILS = gql`
	query GetTeamDetails($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			parentDepartmentId
			parentDepartment {
				id
				name
			}
			departmentHead {
				id
				displayName
				email
				jobTitle
				phone
			}
			employees {
				nodes {
					id
					displayName
					email
					jobTitle
					isActive
					hireDate
					managerId
				}
				totalCount
			}
			activeEmployees: employees(condition: { isActive: true }) {
				totalCount
			}
			subDepartments: departmentsByParentDepartmentId {
				nodes {
					id
					name
					description
					employeeCount: employees {
						totalCount
					}
				}
				totalCount
			}
			createdAt
			updatedAt
		}
	}
`;

// Query: Get team hierarchy for org chart visualization
export const GET_TEAM_HIERARCHY = gql`
	query GetTeamHierarchy($rootDepartmentId: UUID) {
		departments(condition: { parentDepartmentId: $rootDepartmentId }, orderBy: [NAME_ASC]) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					nodes {
						id
						name
						employeeCount: employees {
							totalCount
						}
					}
				}
			}
		}
	}
`;

// Query: Search teams with advanced filtering
export const SEARCH_TEAMS = gql`
	query SearchTeams(
		$filter: DepartmentFilter
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
	) {
		departments(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
		}
	}
`;
