import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MountainHRApiClient } from '$lib/api/client';
import { updateEmployeeSchema } from '$lib/schemas/employee';

export const PUT: RequestHandler = async ({ request, cookies, params }) => {
	try {
		// Get auth token from cookies
		const token = cookies.get('hr_token');
		
		if (!token) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Parse request body
		const data = await request.json();
		const { id, ...updateData } = updateEmployeeSchema.parse(data);

		// Create server-side API client with auth token
		const serverApiClient = new MountainHRApiClient();
		serverApiClient.setToken(token);

		// Transform frontend camelCase to backend snake_case
		const backendData = {
			username: updateData.username,
			email: updateData.email,
			first_name: updateData.firstName,
			last_name: updateData.lastName,
			job_title: updateData.jobTitle,
			hire_date: updateData.hireDate,
			role_id: updateData.roleId,
			department_id: updateData.departmentId,
			status: updateData.onboardingStatus
		};

		// Update employee via backend API using the proper method
		const response = await serverApiClient.employees.update(params.id, backendData);
		
		if (!response.success) {
			return json({ error: response.error || 'Failed to update employee' }, { status: response.status || 500 });
		}
		
		return json(response.data);
	} catch (error: any) {
		console.error('Employee update error:', error);
		
		return json(
			{ error: error.message || 'Failed to update employee' }, 
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ cookies, params }) => {
	try {
		// Get auth token from cookies
		const token = cookies.get('hr_token');
		
		if (!token) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Create server-side API client with auth token
		const serverApiClient = new MountainHRApiClient();
		serverApiClient.setToken(token);

		// Delete employee via backend API using the proper method
		console.log('🗑️ Deleting employee:', params.id);
		const response = await serverApiClient.employees.delete(params.id);
		console.log('📥 Delete response:', { success: response.success, status: response.status, error: response.error });
		
		if (!response.success) {
			console.error('🚨 Backend API error details:', response);
			return json({ error: response.error || 'Failed to delete employee' }, { status: response.status || 500 });
		}
		
		return json({ success: true, message: 'Employee deleted successfully' });
	} catch (error: any) {
		console.error('Employee deletion error:', error);
		
		return json(
			{ error: error.message || 'Failed to delete employee' }, 
			{ status: 500 }
		);
	}
};