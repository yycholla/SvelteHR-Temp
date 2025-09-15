import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Change Password API Route
 * Handles password changes with current password validation
 */

const BACKEND_URL = 'http://localhost:3001';

export const POST: RequestHandler = async ({ request }) => {
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

    const body = await request.json();
    
    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return json(data, { status: response.status });
  } catch (error) {
    console.error('Change password API error:', error);
    return json(
      { 
        success: false, 
        error: 'Password change service unavailable' 
      }, 
      { status: 500 }
    );
  }
};