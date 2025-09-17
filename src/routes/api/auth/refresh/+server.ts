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
    // Get token from httpOnly cookie
    const token = cookies.get('jwt-token');

    if (!token) {
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

    // Parse the base64 token created by login
    let tokenPayload;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      tokenPayload = JSON.parse(decoded);
    } catch (error) {
      // Token is malformed, clear it
      cookies.delete('jwt-token', { path: '/' });
      return json(
        {
          success: false,
          error: 'Invalid token format'
        },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (tokenPayload.exp && tokenPayload.exp < Math.floor(Date.now() / 1000)) {
      cookies.delete('jwt-token', { path: '/' });
      return json(
        {
          success: false,
          error: 'Token expired'
        },
        { status: 401 }
      );
    }

    // Create unauthenticated client to verify user still exists
    const client = createUrqlClient();

    // Get user details using the user_id from token
    const userResult = await client.query(GET_USER_BY_ID, { id: tokenPayload.user_id }).toPromise();

    if (userResult.error || !userResult.data?.user) {
      cookies.delete('jwt-token', { path: '/' });
      return json(
        {
          success: false,
          error: 'Failed to retrieve user information'
        },
        { status: 401 }
      );
    }

    const user = userResult.data.user;

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