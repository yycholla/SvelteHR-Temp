import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiClient } from '$lib/api/client';
import { updateEmployeeSchema } from '$lib/schemas/employee';

export const PUT: RequestHandler = async ({ request, cookies, params }) => {
	try {
		// Get auth token from cookies
		const token = cookies.get('auth-token');
		
		if (!token) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Parse request body
		const data = await request.json();
		const { id, ...updateData } = updateEmployeeSchema.parse(data);

		// Create server-side API client with auth token
		const serverApiClient = apiClient.extend({
			hooks: {
				beforeRequest: [
					(request) => {
						request.headers.set('Authorization', `Bearer ${token}`);
						request.headers.set('Content-Type', 'application/json');
					}
				]
			}
		});

		// Update employee via backend API (using V2 endpoint)
		const employee = await serverApiClient.put(`v2/employees/${params.id}`, { json: updateData }).json();
		
		return json(employee);
	} catch (error: any) {
		console.error('Employee update error:', error);
		
		if (error.response?.status === 401) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		if (error.response?.status === 404) {
			return json({ error: 'Employee not found' }, { status: 404 });
		}
		
		return json(
			{ error: error.message || 'Failed to update employee' }, 
			{ status: 500 }
		);
	}
};