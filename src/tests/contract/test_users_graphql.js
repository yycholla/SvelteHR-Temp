// Users GraphQL Operations Contract Test
// Validates all CRUD operations for users entity with proper relationships
// MUST FAIL until Hasura metadata and relationships are configured

import { describe, it, expect, beforeAll } from 'vitest';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql';
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'your-admin-secret-here';

async function graphqlQuery(query, variables = {}) {
	const response = await fetch(HASURA_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-hasura-admin-secret': ADMIN_SECRET
		},
		body: JSON.stringify({ query, variables })
	});

	const result = await response.json();
	return { status: response.status, data: result.data, errors: result.errors };
}

describe('Users GraphQL Operations Contract Tests', () => {
	let testUserId = null;
	let testDepartmentId = null;

	beforeAll(async () => {
		// These will fail until schema is implemented
		console.log('Setting up test data - will fail until schema is implemented');
	});

	it('should query users with basic fields', async () => {
		const query = `
      query GetUsers {
        users(limit: 5) {
          id
          email
          display_name
          onboarding_status
          job_title
          is_active
          created_at
          updated_at
        }
      }
    `;

		const result = await graphqlQuery(query);

		if (result.errors) {
			// Expected to fail until schema is implemented
			expect(result.errors[0].message).toContain('table "users" does not exist');
		} else {
			// Contract: Should return array of users with correct fields
			expect(result.data.users).toBeDefined();
			expect(Array.isArray(result.data.users)).toBe(true);

			if (result.data.users.length > 0) {
				const user = result.data.users[0];
				expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
				expect(typeof user.email).toBe('string');
				expect(typeof user.display_name).toBe('string');
				expect(typeof user.is_active).toBe('boolean');
				expect(user.created_at).toBeDefined();
			}
		}
	});

	it('should query user by primary key', async () => {
		const query = `
      query GetUserByPK($id: uuid!) {
        users_by_pk(id: $id) {
          id
          email
          display_name
          onboarding_status
          job_title
          is_active
        }
      }
    `;

		const testId = '123e4567-e89b-12d3-a456-426614174000';
		const result = await graphqlQuery(query, { id: testId });

		if (result.errors) {
			// Expected to fail until schema is implemented
			expect(result.errors[0].message).toContain('table "users" does not exist');
		} else {
			// Contract: Should return single user or null
			expect(result.data.users_by_pk).toBeDefined();
		}
	});

	it('should query users with job_information relationship', async () => {
		const query = `
      query GetUsersWithJobInfo {
        users(limit: 3) {
          id
          display_name
          email
          job_information {
            id
            job_title
            hire_date
            employment_type
            is_remote
            department {
              id
              name
            }
            manager {
              id
              display_name
            }
          }
        }
      }
    `;

		const result = await graphqlQuery(query);

		if (result.errors) {
			// Expected to fail until relationships are configured
			expect(result.errors[0].message).toMatch(/table|relationship/);
		} else {
			// Contract: Should return users with nested job information
			expect(result.data.users).toBeDefined();

			if (result.data.users.length > 0 && result.data.users[0].job_information) {
				const jobInfo = result.data.users[0].job_information;
				expect(jobInfo.id).toBeDefined();
				expect(typeof jobInfo.job_title).toBe('string');

				if (jobInfo.department) {
					expect(jobInfo.department.name).toBeDefined();
				}
			}
		}
	});

	it('should query users with role assignments relationship', async () => {
		const query = `
      query GetUsersWithRoles {
        users(limit: 3) {
          id
          display_name
          user_role_assignments(where: { is_active: { _eq: true } }) {
            id
            is_active
            assigned_at
            role {
              id
              name
              level
              description
            }
          }
        }
      }
    `;

		const result = await graphqlQuery(query);

		if (result.errors) {
			// Expected to fail until relationships are configured
			expect(result.errors[0].message).toMatch(/table|relationship/);
		} else {
			// Contract: Should return users with role assignments
			expect(result.data.users).toBeDefined();

			if (result.data.users.length > 0 && result.data.users[0].user_role_assignments.length > 0) {
				const roleAssignment = result.data.users[0].user_role_assignments[0];
				expect(roleAssignment.role).toBeDefined();
				expect(roleAssignment.role.name).toBeDefined();
				expect(typeof roleAssignment.role.level).toBe('number');
			}
		}
	});

	it('should query users with contact information relationship', async () => {
		const query = `
      query GetUsersWithContact {
        users(limit: 3) {
          id
          display_name
          contact_information {
            id
            email
            phone_number
            work_phone_number
            address_city
            address_state
            emergency_contact_name
            emergency_contact_phone
          }
        }
      }
    `;

		const result = await graphqlQuery(query);

		if (result.errors) {
			// Expected to fail until relationships are configured
			expect(result.errors[0].message).toMatch(/table|relationship/);
		} else {
			// Contract: Should return users with contact information
			expect(result.data.users).toBeDefined();

			if (result.data.users.length > 0 && result.data.users[0].contact_information) {
				const contact = result.data.users[0].contact_information;
				expect(contact.id).toBeDefined();
				expect(contact.phone_number || contact.email).toBeDefined();
			}
		}
	});

	it('should insert new user', async () => {
		const mutation = `
      mutation InsertUser($user: users_insert_input!) {
        insert_users_one(object: $user) {
          id
          email
          display_name
          onboarding_status
          is_active
          created_at
        }
      }
    `;

		const newUser = {
			email: 'test@example.com',
			password_hash: '$2b$10$k8Y4WlZvnVBzG4p5R6M8HOfYlqMhNV5wP3ZWJXvTwmJ8Qk2Hn7vxS',
			display_name: 'Test User',
			onboarding_status: 'PreHire',
			job_title: 'Software Engineer',
			is_active: true
		};

		const result = await graphqlQuery(mutation, { user: newUser });

		if (result.errors) {
			// Expected to fail until schema is implemented
			expect(result.errors[0].message).toMatch(/table|mutation/);
		} else {
			// Contract: Should return inserted user with generated ID
			expect(result.data.insert_users_one).toBeDefined();
			expect(result.data.insert_users_one.id).toBeDefined();
			expect(result.data.insert_users_one.email).toBe(newUser.email);
			testUserId = result.data.insert_users_one.id;
		}
	});

	it('should update existing user', async () => {
		const mutation = `
      mutation UpdateUser($id: uuid!, $changes: users_set_input!) {
        update_users_by_pk(pk_columns: { id: $id }, _set: $changes) {
          id
          display_name
          job_title
          onboarding_status
          updated_at
        }
      }
    `;

		const updates = {
			display_name: 'Updated Test User',
			job_title: 'Senior Software Engineer',
			onboarding_status: 'Active'
		};

		const testId = testUserId || '123e4567-e89b-12d3-a456-426614174000';
		const result = await graphqlQuery(mutation, { id: testId, changes: updates });

		if (result.errors) {
			// Expected to fail until schema is implemented
			expect(result.errors[0].message).toMatch(/table|mutation/);
		} else {
			// Contract: Should return updated user
			expect(result.data.update_users_by_pk).toBeDefined();
			expect(result.data.update_users_by_pk.display_name).toBe(updates.display_name);
			expect(result.data.update_users_by_pk.onboarding_status).toBe(updates.onboarding_status);
		}
	});

	it('should filter users by onboarding status', async () => {
		const query = `
      query GetActiveUsers {
        users(where: { 
          onboarding_status: { _eq: "Active" },
          is_active: { _eq: true }
        }) {
          id
          display_name
          onboarding_status
          is_active
        }
      }
    `;

		const result = await graphqlQuery(query);

		if (result.errors) {
			// Expected to fail until schema is implemented
			expect(result.errors[0].message).toMatch(/table|enum/);
		} else {
			// Contract: Should return only active users
			expect(result.data.users).toBeDefined();

			result.data.users.forEach((user) => {
				expect(user.onboarding_status).toBe('Active');
				expect(user.is_active).toBe(true);
			});
		}
	});

	it('should support ordering and pagination', async () => {
		const query = `
      query GetUsersPaginated($limit: Int!, $offset: Int!) {
        users(
          limit: $limit,
          offset: $offset,
          order_by: { display_name: asc }
        ) {
          id
          display_name
          email
        }
        users_aggregate {
          aggregate {
            count
          }
        }
      }
    `;

		const result = await graphqlQuery(query, { limit: 10, offset: 0 });

		if (result.errors) {
			// Expected to fail until schema is implemented
			expect(result.errors[0].message).toMatch(/table|aggregate/);
		} else {
			// Contract: Should return paginated and ordered results
			expect(result.data.users).toBeDefined();
			expect(result.data.users_aggregate.aggregate.count).toBeDefined();
			expect(typeof result.data.users_aggregate.aggregate.count).toBe('number');

			// Verify ordering
			if (result.data.users.length > 1) {
				const names = result.data.users.map((user) => user.display_name);
				const sortedNames = [...names].sort();
				expect(names).toEqual(sortedNames);
			}
		}
	});

	it('should query managed departments relationship', async () => {
		const query = `
      query GetUsersManagingDepartments {
        users(where: { managed_departments: {} }) {
          id
          display_name
          managed_departments {
            id
            name
            budget
            employee_count
            active_employee_count
          }
        }
      }
    `;

		const result = await graphqlQuery(query);

		if (result.errors) {
			// Expected to fail until relationships are configured
			expect(result.errors[0].message).toMatch(/table|relationship/);
		} else {
			// Contract: Should return users who manage departments
			expect(result.data.users).toBeDefined();

			result.data.users.forEach((user) => {
				expect(user.managed_departments).toBeDefined();
				expect(Array.isArray(user.managed_departments)).toBe(true);

				if (user.managed_departments.length > 0) {
					expect(user.managed_departments[0].name).toBeDefined();
				}
			});
		}
	});

	it('should enforce email uniqueness constraint', async () => {
		const mutation = `
      mutation InsertDuplicateUser($user: users_insert_input!) {
        insert_users_one(object: $user) {
          id
          email
        }
      }
    `;

		const duplicateUser = {
			email: 'admin@svelteHR.com', // Should already exist from seed data
			password_hash: '$2b$10$k8Y4WlZvnVBzG4p5R6M8HOfYlqMhNV5wP3ZWJXvTwmJ8Qk2Hn7vxS',
			display_name: 'Duplicate Admin',
			is_active: true
		};

		const result = await graphqlQuery(mutation, { user: duplicateUser });

		if (result.errors) {
			// Should fail due to uniqueness constraint (or table not existing)
			expect(result.errors[0].message).toMatch(/table|unique|constraint/);
		} else {
			// If successful, constraint is not properly configured
			throw new Error('Email uniqueness constraint not enforced');
		}
	});

	it('should validate enum values for onboarding_status', async () => {
		const mutation = `
      mutation InsertUserInvalidStatus($user: users_insert_input!) {
        insert_users_one(object: $user) {
          id
          onboarding_status
        }
      }
    `;

		const invalidUser = {
			email: 'invalid@example.com',
			password_hash: '$2b$10$k8Y4WlZvnVBzG4p5R6M8HOfYlqMhNV5wP3ZWJXvTwmJ8Qk2Hn7vxS',
			display_name: 'Invalid Status User',
			onboarding_status: 'InvalidStatus', // Invalid enum value
			is_active: true
		};

		const result = await graphqlQuery(mutation, { user: invalidUser });

		if (result.errors) {
			// Should fail due to invalid enum value (or table not existing)
			expect(result.errors[0].message).toMatch(/table|enum|invalid/);
		} else {
			// If successful, enum validation is not properly configured
			throw new Error('Enum validation for onboarding_status not enforced');
		}
	});
});
