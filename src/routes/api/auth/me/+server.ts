import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Current User API Route
 * Gets current user information
 */

const BACKEND_URL = 'http://localhost:3001';

export const GET: RequestHandler = async ({ request }) => {
  try {
    // Forward the Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return json(
        { 
          success: false, 
          error: 'Authorization header required' 
        }, 
        { status: 401 }
      );
    }

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return json(data, { status: response.status });
  } catch (error) {
    console.error('Get user API error:', error);
    return json(
      { 
        success: false, 
        error: 'User service unavailable' 
      }, 
      { status: 500 }
    );
  }
};