import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MountainHRApiClient } from '$lib/api/client';
import { createEmployeeSchema } from '$lib/schemas/employee';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Get auth token from cookies
		const token = cookies.get('hr_token');

		if (!token) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Parse request body
		const data = await request.json();
		const validatedData = createEmployeeSchema.parse(data);

		// Create server-side API client with auth token
		const serverApiClient = new MountainHRApiClient();
		serverApiClient.setToken(token);

		// Transform frontend camelCase to backend snake_case
		const backendData = {
			username: validatedData.username,
			email: validatedData.email,
			first_name: validatedData.firstName,
			last_name: validatedData.lastName,
			job_title: validatedData.jobTitle,
			hire_date: validatedData.hireDate ? `${validatedData.hireDate}T00:00:00Z` : null,
			role_id: validatedData.roleId,
			department_id: validatedData.departmentId,
			status: validatedData.onboardingStatus
		};

		// Create employee via backend API using the proper method
		console.log('📤 Sending to backend:', backendData);
		const response = await serverApiClient.employees.create(backendData);
		console.log('📥 Backend response:', {
			success: response.success,
			status: response.status,
			error: response.error
		});

		if (!response.success) {
			console.error('🚨 Backend API error details:', response);
			return json(
				{ error: response.error || 'Failed to create employee' },
				{ status: response.status || 500 }
			);
		}

		return json(response.data);
	} catch (error: any) {
		console.error('Employee creation error:', error);

		return json({ error: error.message || 'Failed to create employee' }, { status: 500 });
	}
};
