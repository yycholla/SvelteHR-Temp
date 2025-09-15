/**
 * Departments API Endpoint - Hasura GraphQL Implementation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasuraAuthService } from '$lib/auth/hasura-service';
import { HASURA_GRAPHQL_URL, HASURA_ADMIN_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ cookies, url }) => {
  // Verify authentication
  const token = cookies.get('auth-token');
  if (!token) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await hasuraAuthService.verifyToken(token);
  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Query departments with basic information using GraphQL

    const response = await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          query GetDepartments {
            departments(where: {is_active: {_eq: true}}, order_by: {name: asc}) {
              id
              name
              description
              budget
              is_active
              manager {
                id
                display_name
              }
              employees_aggregate {
                aggregate {
                  count
                }
              }
            }
          }
        `
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const departments = result.data.departments.map((dept: any) => ({
      ...dept,
      employee_count: dept.employees_aggregate.aggregate.count
    }));

    return json({ departments });
  } catch (error) {
    console.error('Departments query error:', error);
    return json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  // Verify authentication
  const token = cookies.get('auth-token');
  if (!token) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await hasuraAuthService.verifyToken(token);
  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  // Check if user has permission to create departments (admin role)
  const hasAdminRole = user.roles.some(role => role.name.includes('admin') || role.level >= 90);
  if (!hasAdminRole) {
    return json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { name, description, budget } = await request.json();

    if (!name) {
      return json({ error: 'Department name is required' }, { status: 400 });
    }

    // Create department using GraphQL

    const response = await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          mutation CreateDepartment($department: departments_insert_input!) {
            insert_departments_one(object: $department) {
              id
              name
              description
              budget
              is_active
            }
          }
        `,
        variables: {
          department: {
            name,
            description,
            budget,
            is_active: true
          }
        }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return json({ department: result.data.insert_departments_one }, { status: 201 });
  } catch (error) {
    console.error('Department creation error:', error);
    return json({ error: 'Failed to create department' }, { status: 500 });
  }
};