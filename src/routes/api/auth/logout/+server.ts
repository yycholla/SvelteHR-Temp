import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Logout API Route
 * Handles user logout by clearing JWT token
 * With PostGraphile, logout is primarily client-side (clearing cookies)
 */

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // Clear JWT token cookie
    cookies.delete('jwt-token', { path: '/' });

    // Note: With PostGraphile JWTs, there's typically no server-side session invalidation
    // The JWT remains valid until expiration, but clearing the cookie effectively logs out the user
    // For enhanced security, you could implement a server-side blacklist of JWTs

    return json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout API error:', error);
    
    // Still clear the JWT token on error
    cookies.delete('jwt-token', { path: '/' });
    
    return json(
      { 
        success: false, 
        error: 'Logout service unavailable' 
      }, 
      { status: 500 }
    );
  }
};