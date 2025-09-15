/**
 * Hasura Authentication Service
 * Handles user authentication using GraphQL queries to Hasura
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET, HASURA_GRAPHQL_URL, HASURA_ADMIN_SECRET } from '$env/static/private';

// Validate required environment variables
if (!JWT_SECRET || !HASURA_GRAPHQL_URL || !HASURA_ADMIN_SECRET) {
  throw new Error('Missing required environment variables: JWT_SECRET, HASURA_GRAPHQL_URL, or HASURA_ADMIN_SECRET');
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  onboarding_status: string;
  jobTitle?: string;
  roles: Array<{
    id: string;
    name: string;
    level: number;
  }>;
}

export interface AuthToken {
  token: string;
  user: User;
  expiresAt: Date;
}

// Helper function to execute GraphQL queries against Hasura
// Uses admin secret - should only be used for system operations
async function executeGraphQL(query: string, variables: any = {}, userToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use JWT token if provided, otherwise fall back to admin secret
  if (userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  } else {
    headers['X-Hasura-Admin-Secret'] = HASURA_ADMIN_SECRET;
  }

  const response = await fetch(HASURA_GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    console.error('GraphQL errors:', result.errors);
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
}

export class HasuraAuthService {
  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string): Promise<AuthToken | null> {
    try {
      // Query user with roles
      const GET_USER_QUERY = `
        query GetUserForAuth($email: String!) {
          users(where: {email: {_eq: $email}}) {
            id
            email
            display_name
            onboarding_status
            password_hash
            job_title
            role_assignments(where: {is_active: {_eq: true}}) {
              role {
                id
                name
                level
              }
            }
          }
        }
      `;

      const data = await executeGraphQL(GET_USER_QUERY, { email });
      const users = data.users;

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];

      // Verify password
      if (!user.password_hash) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return null;
      }

      // Create user object
      const userObj: User = {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        onboarding_status: user.onboarding_status,
        jobTitle: user.job_title,
        roles: user.role_assignments.map((ra: any) => ra.role)
      };

      // Generate JWT token
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const token = jwt.sign(
        {
          'https://hasura.io/jwt/claims': {
            'x-hasura-default-role': 'user',
            'x-hasura-allowed-roles': ['user', ...userObj.roles.map(r => r.name.toLowerCase())],
            'x-hasura-user-id': user.id,
          },
          userId: user.id,
          email: user.email,
          roles: userObj.roles.map(r => r.name),
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      return {
        token,
        user: userObj,
        expiresAt
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Verify JWT token and get user info
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId;

      if (!userId) {
        return null;
      }

      // Query current user information
      const GET_USER_BY_ID_QUERY = `
        query GetUserById($id: uuid!) {
          users_by_pk(id: $id) {
            id
            email
            display_name
            onboarding_status
            job_title
            role_assignments(where: {is_active: {_eq: true}}) {
              role {
                id
                name
                level
              }
            }
          }
        }
      `;

      const data = await executeGraphQL(GET_USER_BY_ID_QUERY, { id: userId });
      const user = data.users_by_pk;

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        onboarding_status: user.onboarding_status,
        jobTitle: user.job_title,
        roles: user.role_assignments.map((ra: any) => ra.role)
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Create a new user (for registration)
   */
  async createUser(email: string, password: string, displayName: string): Promise<User | null> {
    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const CREATE_USER_MUTATION = `
        mutation CreateUser($user: users_insert_input!) {
          insert_users_one(object: $user) {
            id
            email
            display_name
            onboarding_status
          }
        }
      `;

      const data = await executeGraphQL(CREATE_USER_MUTATION, {
        user: {
          email,
          password_hash: passwordHash,
          display_name: displayName,
          onboarding_status: 'PreHire'
        }
      });

      const user = data.insert_users_one;

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        onboarding_status: user.onboarding_status,
        roles: []
      };
    } catch (error) {
      console.error('User creation error:', error);
      return null;
    }
  }
}

export const hasuraAuthService = new HasuraAuthService();