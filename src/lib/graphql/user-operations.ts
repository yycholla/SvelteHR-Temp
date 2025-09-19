import { client, executeQuery, executeMutation } from './client.js';

// GraphQL queries for user management
export const GET_ALL_USERS = `
  query GetAllUsers {
    allUsers {
      nodes {
        id
        email
        displayName
        jobTitle
        isActive
        createdAt
        hireDate
        lastLogin
        userRoleAssignmentsByUserId {
          nodes {
            userRoleByRoleId {
              name
              level
              description
            }
            isActive
            createdAt
          }
        }
      }
    }
  }
`;

export const GET_USER_BY_ID = `
  query GetUserById($id: UUID!) {
    userById(id: $id) {
      id
      email
      displayName
      jobTitle
      isActive
      createdAt
      hireDate
      lastLogin
      userRoleAssignmentsByUserId {
        nodes {
          userRoleByRoleId {
            name
            level
            description
          }
          isActive
          createdAt
        }
      }
    }
  }
`;

export const GET_USER_ROLES = `
  query GetUserRoles {
    allUserRoles {
      nodes {
        id
        name
        description
        level
        isActive
      }
    }
  }
`;

export const UPDATE_USER_STATUS = `
  mutation UpdateUserStatus($input: UpdateUserByIdInput!) {
    updateUserById(input: $input) {
      user {
        id
        isActive
        updatedAt
      }
    }
  }
`;

export const UPDATE_USER = `
  mutation UpdateUser($input: UpdateUserByIdInput!) {
    updateUserById(input: $input) {
      user {
        id
        email
        displayName
        isActive
        hireDate
        updatedAt
      }
    }
  }
`;

export const DELETE_USER = `
  mutation DeleteUser($input: DeleteUserByIdInput!) {
    deleteUserById(input: $input) {
      deletedUserId
    }
  }
`;

export const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        email
        displayName
        isActive
        createdAt
        hireDate
      }
    }
  }
`;

export const CREATE_USER_ROLE_ASSIGNMENT = `
  mutation CreateUserRoleAssignment($input: CreateUserRoleAssignmentInput!) {
    createUserRoleAssignment(input: $input) {
      userRoleAssignment {
        id
        userId
        roleId
        isActive
        createdAt
      }
    }
  }
`;

export const UPDATE_USER_ROLE_ASSIGNMENT = `
  mutation UpdateUserRoleAssignment($input: UpdateUserRoleAssignmentByIdInput!) {
    updateUserRoleAssignmentById(input: $input) {
      userRoleAssignment {
        id
        userId
        roleId
        isActive
        updatedAt
      }
    }
  }
`;

export const GET_USER_ROLE_ASSIGNMENTS = `
  query GetUserRoleAssignments($userId: UUID!) {
    allUserRoleAssignments(condition: { userId: $userId }) {
      nodes {
        id
        userId
        roleId
        isActive
        userRoleByRoleId {
          name
          level
          description
        }
      }
    }
  }
`;

export const GET_USER_ROLES_LIST = `
  query GetUserRoles {
    allUserRoles {
      nodes {
        id
        name
        level
        description
      }
    }
  }
`;

// TypeScript interfaces for type safety
export interface User {
	id: string;
	email: string;
	displayName?: string;
	jobTitle?: string;
	isActive: boolean;
	createdAt: string;
	hireDate?: string;
	lastLogin?: string;
	userRoleAssignmentsByUserId?: {
		nodes: Array<{
			userRoleByRoleId: {
				name: string;
				level: number;
				description?: string;
			};
			isActive: boolean;
			createdAt: string;
		}>;
	};
}

export interface UserRole {
	id: number;
	name: string;
	description?: string;
	level: number;
	isActive: boolean;
}

// Helper functions for user operations
export async function getAllUsers(): Promise<User[]> {
	try {
		const data = await executeQuery(client, GET_ALL_USERS);
		return data?.allUsers?.nodes || [];
	} catch (error) {
		console.error('Error fetching users:', error);
		throw error;
	}
}

export async function getUserById(id: string): Promise<User | null> {
	try {
		const data = await executeQuery(client, GET_USER_BY_ID, { id });
		return data?.userById || null;
	} catch (error) {
		console.error('Error fetching user:', error);
		throw error;
	}
}

export async function getUserRoles(): Promise<UserRole[]> {
	try {
		const data = await executeQuery(client, GET_USER_ROLES);
		return data?.allUserRoles?.nodes || [];
	} catch (error) {
		console.error('Error fetching user roles:', error);
		throw error;
	}
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
	try {
		const data = await executeMutation(client, UPDATE_USER_STATUS, {
			input: {
				id: userId,
				userPatch: { isActive }
			}
		});
		return !!data?.updateUserById?.user;
	} catch (error) {
		console.error('Error updating user status:', error);
		throw error;
	}
}

export async function deleteUser(userId: string): Promise<boolean> {
	try {
		const data = await executeMutation(client, DELETE_USER, {
			input: { id: userId }
		});
		return !!data?.deleteUserById?.deletedUserId;
	} catch (error) {
		console.error('Error deleting user:', error);
		throw error;
	}
}

// Format user role for display
export function formatUserRole(user: User): string {
	const roleAssignments = user.userRoleAssignmentsByUserId?.nodes;
	if (!roleAssignments || roleAssignments.length === 0) {
		return 'No Role';
	}

	const activeRoles = roleAssignments
		.filter((assignment) => assignment.isActive)
		.map((assignment) => assignment.userRoleByRoleId.name);

	return activeRoles.length > 0 ? activeRoles.join(', ') : 'No Active Role';
}

// Get user's highest role level
export function getUserRoleLevel(user: User): number {
	const roleAssignments = user.userRoleAssignmentsByUserId?.nodes;
	if (!roleAssignments || roleAssignments.length === 0) {
		return 0;
	}

	const activeRoles = roleAssignments
		.filter((assignment) => assignment.isActive)
		.map((assignment) => assignment.userRoleByRoleId.level);

	return Math.max(...activeRoles, 0);
}

// Format user status for display
export function formatUserStatus(user: User): { status: string; color: string } {
	if (user.isActive) {
		return { status: 'Active', color: 'text-green-600' };
	} else {
		return { status: 'Inactive', color: 'text-red-600' };
	}
}

// Get user's department (from role assignments or contact info)
export function getUserDepartment(user: User): string {
	// For now, derive from role name since we don't have department in the current schema
	const roleAssignments = user.userRoleAssignmentsByUserId?.nodes;
	if (!roleAssignments || roleAssignments.length === 0) {
		return 'Unassigned';
	}

	const activeRole = roleAssignments.find((assignment) => assignment.isActive);
	if (!activeRole) {
		return 'Unassigned';
	}

	// Map role names to departments
	const roleName = activeRole.userRoleByRoleId.name.toLowerCase();
	if (roleName.includes('hr')) return 'Human Resources';
	if (roleName.includes('admin')) return 'Administration';
	if (roleName.includes('manager')) return 'Management';
	if (roleName.includes('employee')) return 'General';

	return 'Other';
}

// Get available user roles
export async function getUserRolesList(): Promise<UserRole[]> {
	try {
		const data = await executeQuery(client, GET_USER_ROLES_LIST);
		return data?.allUserRoles?.nodes || [];
	} catch (error) {
		console.error('Error fetching user roles:', error);
		throw error;
	}
}

// Create role assignment for user
export async function createUserRoleAssignment(userId: string, roleId: string): Promise<any> {
	try {
		const data = await executeMutation(client, CREATE_USER_ROLE_ASSIGNMENT, {
			input: {
				userRoleAssignment: {
					userId: userId,
					roleId: roleId,
					isActive: true
				}
			}
		});
		return data?.createUserRoleAssignment?.userRoleAssignment;
	} catch (error) {
		console.error('Error creating role assignment:', error);
		throw error;
	}
}

// Get user's current role assignments
export async function getUserRoleAssignments(userId: string): Promise<any[]> {
	try {
		const data = await executeQuery(client, GET_USER_ROLE_ASSIGNMENTS, { userId });
		const allAssignments = data?.allUserRoleAssignments?.nodes || [];
		// Filter for active assignments on client side
		return allAssignments.filter((assignment: any) => assignment.isActive);
	} catch (error) {
		console.error('Error fetching user role assignments:', error);
		throw error;
	}
}

// Deactivate a role assignment
export async function deactivateUserRoleAssignment(assignmentId: string): Promise<boolean> {
	try {
		const data = await executeMutation(client, UPDATE_USER_ROLE_ASSIGNMENT, {
			input: {
				id: assignmentId,
				userRoleAssignmentPatch: {
					isActive: false
				}
			}
		});
		return !!data?.updateUserRoleAssignmentById?.userRoleAssignment;
	} catch (error) {
		console.error('Error deactivating role assignment:', error);
		throw error;
	}
}

// Update user role - deactivates old roles and assigns new role
export async function updateUserRole(userId: string, newRoleName: string): Promise<boolean> {
	try {
		// Get current active role assignments
		const currentAssignments = await getUserRoleAssignments(userId);

		// Deactivate all current role assignments
		for (const assignment of currentAssignments) {
			await deactivateUserRoleAssignment(assignment.id);
			console.log(`Deactivated role assignment: ${assignment.userRoleByRoleId.name}`);
		}

		// Get available roles to find the new role ID
		const roles = await getUserRolesList();
		const newRoleRecord = roles.find((r) => r.name === newRoleName);

		if (!newRoleRecord) {
			throw new Error(`Role ${newRoleName} not found`);
		}

		// Create new role assignment
		await createUserRoleAssignment(userId, newRoleRecord.id);
		console.log(`Assigned new role: ${newRoleName}`);

		return true;
	} catch (error) {
		console.error('Error updating user role:', error);
		throw error;
	}
}

// Create a new user with role assignment
export async function createUser(userData: {
	email: string;
	displayName: string;
	role?: string;
	isActive?: boolean;
	hireDate?: string;
}): Promise<User> {
	try {
		// Generate a temporary password hash - in production this should be properly hashed
		const tempPassword = 'TempPass123!';
		const passwordHash = `temp_${Date.now()}`; // Placeholder - should use proper bcrypt in production

		// Create the user first
		const data = await executeMutation(client, CREATE_USER, {
			input: {
				user: {
					email: userData.email,
					displayName: userData.displayName,
					passwordHash: passwordHash,
					isActive: userData.isActive ?? true,
					hireDate: userData.hireDate || new Date().toISOString().split('T')[0] // Default to today if not provided
				}
			}
		});

		const newUser = data?.createUser?.user;
		if (!newUser) {
			throw new Error('Failed to create user');
		}

		// Assign role if provided
		if (userData.role) {
			const roles = await getUserRolesList();
			const roleRecord = roles.find((r) => r.name === userData.role);

			if (roleRecord) {
				await createUserRoleAssignment(newUser.id, roleRecord.id);
				console.log(`Assigned role ${userData.role} to user ${newUser.email}`);
			} else {
				console.warn(`Role ${userData.role} not found, skipping role assignment`);
			}
		}

		return newUser;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

// Update an existing user
export async function updateUser(userData: {
	id: string;
	email?: string;
	displayName?: string;
	isActive?: boolean;
	hireDate?: string;
}): Promise<User> {
	try {
		const data = await executeMutation(client, UPDATE_USER, {
			input: {
				id: userData.id,
				userPatch: {
					email: userData.email,
					displayName: userData.displayName,
					isActive: userData.isActive,
					hireDate: userData.hireDate
				}
			}
		});
		return data?.updateUserById?.user;
	} catch (error) {
		console.error('Error updating user:', error);
		throw error;
	}
}
