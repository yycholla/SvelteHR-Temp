import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';
import { GET_CURRENT_USER, GET_USER_BY_ID } from '$lib/graphql/postgraphile-operations';

/**
 * Token Validation API Route
 * Validates PostGraphile JWT token and returns user info if valid
 * PostGraphile typically uses longer-lived JWTs instead of refresh tokens
 */

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // Get JWT token from httpOnly cookie
    const jwtToken = cookies.get('jwt-token');

    if (!jwtToken) {
      // No token present - this is expected for unauthenticated users
      return json(
        { 
          success: false, 
          isValid: false,
          error: 'No authentication token present' 
        }, 
        { status: 200 } // Return 200 instead of 401 for missing tokens
      );
    }

    // Create authenticated client with the JWT token
    const client = createUrqlClient(undefined, jwtToken);

    // Validate token by getting current user
    const currentUserResult = await client.query(GET_CURRENT_USER, {}).toPromise();

    if (currentUserResult.error || !currentUserResult.data?.currentUserId) {
      // JWT is invalid or expired, clear the cookie
      cookies.delete('jwt-token', { path: '/' });
      return json(
        { 
          success: false, 
          error: 'Invalid or expired token' 
        }, 
        { status: 401 }
      );
    }

    const userId = currentUserResult.data.currentUserId;

    // Get full user details
    const userResult = await client.query(GET_USER_BY_ID, { id: userId }).toPromise();

    if (userResult.error || !userResult.data?.userById) {
      cookies.delete('jwt-token', { path: '/' });
      return json(
        { 
          success: false, 
          error: 'Failed to retrieve user information' 
        }, 
        { status: 401 }
      );
    }

    const user = userResult.data.userById;

    // Return success with user info
    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        onboardingStatus: user.onboardingStatus,
        isActive: user.isActive,
      },
      // Note: With PostGraphile JWTs, we don't need to refresh tokens
      // The existing JWT continues to be valid until expiration
      isValid: true,
    });

  } catch (error) {
    console.error('Token validation API error:', error);
    
    // Clear potentially corrupted token
    cookies.delete('jwt-token', { path: '/' });
    
    return json(
      { 
        success: false, 
        error: 'Token validation service unavailable' 
      }, 
      { status: 500 }
    );
  }
};