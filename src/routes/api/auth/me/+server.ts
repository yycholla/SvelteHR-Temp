import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Current User API Route
 * Gets current user information
 */

const BACKEND_URL = 'http://localhost:3001';

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    // Check for JWT token in httpOnly cookie (PostGraphile style)
    const jwtToken = cookies.get('jwt-token');
    
    if (!jwtToken) {
      // No token present - this is expected for unauthenticated users
      return json(
        { 
          success: false, 
          authenticated: false,
          error: 'No authentication token present' 
        }, 
        { status: 200 } // Return 200 instead of 401 for missing tokens
      );
    }

    // For now, just return a placeholder response indicating the user is logged in
    // In a real implementation, this would validate the JWT and return user data
    return json({
      success: true,
      authenticated: true,
      user: {
        id: 'placeholder-user-id',
        email: 'user@example.com',
        displayName: 'Placeholder User'
      }
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return json(
      { 
        success: false, 
        authenticated: false,
        error: 'User service unavailable' 
      }, 
      { status: 500 }
    );
  }
};