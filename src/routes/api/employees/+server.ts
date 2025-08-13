import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiClient } from '$lib/api/client';
import { createEmployeeSchema } from '$lib/schemas/employee';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Get auth token from cookies
		const token = cookies.get('auth-token');
		
		if (!token) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Parse request body
		const data = await request.json();
		const validatedData = createEmployeeSchema.parse(data);

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

		// Create employee via backend API
		const employee = await serverApiClient.post('employees', { json: validatedData }).json();
		
		return json(employee);
	} catch (error: any) {
		console.error('Employee creation error:', error);
		
		if (error.response?.status === 401) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		return json(
			{ error: error.message || 'Failed to create employee' }, 
			{ status: 500 }
		);
	}
};