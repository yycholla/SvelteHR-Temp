import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { createAuthenticatedApiClient } from '$lib/api/server-client';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  try {
    // Check authentication
    if (!locals.isAuthenticated || !locals.user) {
      throw error(401, 'Unauthorized - Please log in');
    }

    // Parse request body
    const taskData = await request.json();
    console.log('📝 Raw form data received:', taskData);
    
    // Validate required fields
    if (!taskData.title || taskData.title.trim() === '') {
      throw error(400, 'Title is required');
    }
    
    // Load the server-side API client with authentication
    const apiClient = createAuthenticatedApiClient(cookies);
    
    // Map form data to API format - only include fields allowed in CreateTaskRequest
    const apiTaskData: any = {
      title: taskData.title || 'Untitled Task',
      description: taskData.description || ''
    };
    
    // Only add priority if it's provided (let backend use default)
    if (taskData.priority && taskData.priority !== '') {
      apiTaskData.priority = taskData.priority;
    }
    
    // Add optional fields if they exist - only those in CreateTaskRequest interface
    if (taskData.assignedToId && taskData.assignedToId !== '') {
      apiTaskData.assigned_to = String(taskData.assignedToId);
    }
    
    if (taskData.dueDate && taskData.dueDate !== '') {
      apiTaskData.due_date = taskData.dueDate;
    }
    
    console.log('🚀 Sending to MountainHR API:', apiTaskData);

    // Create task via MountainHR API using the typed tasks endpoint
    const response = await apiClient.tasks.create(apiTaskData);
    console.log('📨 Response from MountainHR API:', response);
    
    if (response.success && response.data) {
      return json(response.data);
    } else {
      console.error('🚫 MountainHR API error details:', response);
      throw error(400, `Failed to create task: ${response.error || 'Unknown error'}`);
    }
    
  } catch (err: any) {
    console.error('❌ Task creation API error:', err);
    
    if (err.status) {
      // Re-throw SvelteKit errors
      throw err;
    }
    
    throw error(500, `Internal server error: ${err.message || 'Failed to create task'}`);
  }
};