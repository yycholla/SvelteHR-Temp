/**
 * Departments API Endpoint - Direct EdgeQL Implementation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { geldb } from '$lib/geldb/client';
import { authService } from '$lib/auth/service';

export const GET: RequestHandler = async ({ cookies, url }) => {
  // Verify authentication
  const token = cookies.get('auth-token');
  if (!token) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await authService.verifyToken(token);
  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Query departments with basic information
    const departments = await geldb.query<Array<{
      id: string;
      name: string;
      description?: string;
      budget?: number;
      is_active: boolean;
      employee_count: number;
      manager?: {
        id: string;
        display_name: string;
      };
    }>>(`
      SELECT default::Department {
        id,
        name,
        description,
        budget,
        is_active,
        employee_count,
        manager: {
          id,
          display_name
        }
      }
      FILTER .is_active = true
      ORDER BY .name
    `);

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

  const user = await authService.verifyToken(token);
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

    const department = await geldb.querySingle<{
      id: string;
      name: string;
      description?: string;
      budget?: number;
    }>(`
      INSERT default::Department {
        name := <str>$name,
        description := <optional str>$description,
        budget := <optional decimal>$budget,
        is_active := true
      }
    `, { name, description, budget });

    return json({ department }, { status: 201 });
  } catch (error) {
    console.error('Department creation error:', error);
    return json({ error: 'Failed to create department' }, { status: 500 });
  }
};