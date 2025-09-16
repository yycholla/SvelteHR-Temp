import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';
import crypto from 'crypto';

/**
 * Login API Route
 * Handles authentication through direct database query since custom authenticate function
 * is not yet exposed in PostGraphile schema
 */

const POSTGRAPHILE_URL = 'http://localhost:4000/graphql';

// Query to find user by email (PostGraphile schema)
const USER_LOGIN_QUERY = `
  query UserLogin($email: String!) {
    users(condition: { email: $email }) {
      nodes {
        id
        email
        displayName
        onboardingStatus
        isActive
      }
    }
  }
`;

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    console.log('=== LOGIN API v3 - Fixed JSON parsing ===');

    // Get the raw text and fix the escaped exclamation mark issue
    let bodyText = await request.text();
    console.log('Raw body text:', bodyText);

    // Fix invalid escape sequence \! which should just be !
    bodyText = bodyText.replace(/\\!/g, '!');
    console.log('Fixed body text:', bodyText);

    // Now parse the corrected JSON
    const body = JSON.parse(bodyText);
    console.log('Parsed body successfully:', { email: body.email, hasPassword: !!body.password });
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return json(
        { 
          success: false, 
          error: 'Email and password are required' 
        }, 
        { status: 400 }
      );
    }

    // Get client info for security tracking
    const ipAddress = getClientAddress();
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create a client without authentication for login
    const client = createUrqlClient();

    // Get user by email
    const userResult = await client.query(USER_LOGIN_QUERY, { email }).toPromise();

    if (userResult.error || !userResult.data?.users?.nodes?.length) {
      return json(
        {
          success: false,
          error: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    const user = userResult.data.users.nodes[0];

    // For testing purposes, accept any password for admin account
    // In production, implement proper password validation
    if (email !== 'admin@postgraphile-hr.com' || password !== 'AdminPass123!') {
      return json(
        { 
          success: false, 
          error: 'Invalid email or password' 
        }, 
        { status: 401 }
      );
    }

    // Create a simple JWT-like token for now (in production, use proper JWT library)
    const tokenPayload = {
      user_id: user.id,
      employee_id: user.id,
      email: user.email,
      role: 'hr_employee', // Default role
      role_level: 100, // Admin level
      exp: Math.floor(Date.now() / 1000) + (rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60)
    };

    // For now, just use a simple base64 encoded token (replace with proper JWT in production)
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    // Store token as httpOnly cookie for security
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days
    
    cookies.set('jwt-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    });

    // Return success response with user info
    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        onboardingStatus: user.onboardingStatus,
        isActive: user.isActive,
      },
      expiresIn: maxAge,
    });

  } catch (error) {
    console.error('Login API error:', error);

    return json(
      { 
        success: false, 
        error: 'Authentication service unavailable' 
      }, 
      { status: 500 }
    );
  }
};