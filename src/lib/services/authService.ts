/**
 * Authentication Service
 * Standard PostGraphile authentication using GraphQL mutations
 */

import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth.js';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    roleLevel: number;
  };
}

/**
 * Authenticate user using PostGraphile GraphQL endpoint
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    console.log('AuthService: Starting GraphQL authentication');

    // Execute GraphQL mutation directly to PostGraphile
    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation AuthenticateUser($email: String!, $password: String!) {
            authenticate(input: { email: $email, password: $password }) {
              jwtToken
            }
          }
        `,
        variables: {
          email: credentials.email,
          password: credentials.password
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('AuthService: GraphQL errors:', result.errors);
      return {
        success: false,
        error: result.errors[0]?.message || 'Authentication failed'
      };
    }

    if (!result.data?.authenticate?.jwtToken) {
      return {
        success: false,
        error: 'No JWT token received from server'
      };
    }

    const jwtToken = result.data.authenticate.jwtToken;
    console.log('AuthService: JWT token received successfully');

    // Store JWT token in localStorage for the URQL client to use
    if (typeof window !== 'undefined') {
      localStorage.setItem('postgraphile-jwt-token', jwtToken);
    }

    // Parse JWT to get user info (for UI purposes - server will validate)
    let userInfo;
    try {
      const [, payload] = jwtToken.split('.');
      const decodedPayload = JSON.parse(atob(payload));
      userInfo = {
        id: decodedPayload.user_id,
        email: credentials.email,
        displayName: credentials.email.split('@')[0], // Fallback
        role: decodedPayload.role,
        roleLevel: decodedPayload.role_level || 100
      };
    } catch (parseError) {
      console.warn('AuthService: Could not parse JWT payload for UI, continuing anyway');
      userInfo = {
        id: '',
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
        role: 'hr_admin',
        roleLevel: 100
      };
    }

    // Update auth store
    authStore.setUser(userInfo);

    console.log('AuthService: Authentication successful');
    return {
      success: true,
      user: userInfo
    };

  } catch (error) {
    console.error('AuthService: Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Logout user by clearing tokens and redirecting
 */
export async function logout(): Promise<void> {
  // Clear JWT token from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('postgraphile-jwt-token');
  }

  // Clear auth store
  authStore.clearUser();

  // Redirect to login
  await goto('/login');
}

/**
 * Check authentication status
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/validate', {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isValid && data.user) {
        authStore.setUser(data.user);
        return true;
      }
    }
  } catch (error) {
    console.warn('AuthService: Auth check failed:', error);
  }

  authStore.clearUser();
  return false;
}