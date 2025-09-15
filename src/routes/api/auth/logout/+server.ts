import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Logout API Route
 * Handles user logout and token invalidation
 */

const BACKEND_URL = 'http://localhost:3001';

export const POST: RequestHandler = async ({ request, cookies }) => {
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
    const response = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Clear refresh token cookie regardless of backend response
    cookies.delete('refreshToken', { path: '/' });

    return json(data, { status: response.status });
  } catch (error) {
    console.error('Logout API error:', error);
    
    // Still clear the refresh token on error
    cookies.delete('refreshToken', { path: '/' });
    
    return json(
      { 
        success: false, 
        error: 'Logout service unavailable' 
      }, 
      { status: 500 }
    );
  }
};