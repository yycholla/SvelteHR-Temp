/**
 * Authentication Service - Direct EdgeQL Implementation
 * Handles user authentication using EdgeQL queries instead of GraphQL
 */

import { geldb } from '$lib/geldb/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '$env/static/private';

export interface User {
  id: string;
  email: string;
  displayName: string;
  onboarding_status: string;
  jobTitle?: string;
  department?: {
    id: string;
    name: string;
  };
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

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string): Promise<AuthToken | null> {
    try {
      // Query user basic information first
      const user = await geldb.querySingle<{
        id: string;
        email: string;
        display_name: string;
        onboarding_status: string;
        password_hash: string;
        job_title?: string;
      }>(`
        SELECT rbac::User {
          id,
          email,
          display_name,
          onboarding_status,
          password_hash,
          job_title
        }
        FILTER .email = <str>$email
      `, { email });

      if (!user || !user.password_hash) {
        return null;
      }

      // Query user roles separately  
      const userRoles = await geldb.query<Array<{
        role: {
          id: string;
          name: string;
          level: number;
        };
      }>>(`
        SELECT rbac::UserRole {
          role: {
            id,
            name,
            level
          }
        }
        FILTER .user.id = <uuid>$userId AND .is_active = true
      `, { userId: user.id });

      // Verify password
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
        roles: userRoles.map(r => r.role)
      };

      // Generate JWT token
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const token = jwt.sign(
        {
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
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        roles: string[];
      };

      // Query current user information
      const user = await geldb.querySingle<{
        id: string;
        email: string;
        display_name: string;
        onboarding_status: string;
        job_title?: string;
      }>(`
        SELECT rbac::User {
          id,
          email,
          display_name,
          onboarding_status,
          job_title
        }
        FILTER .id = <uuid>$userId
      `, { userId: decoded.userId });

      if (!user) {
        return null;
      }

      // Query user roles
      const userRoles = await geldb.query<Array<{
        role: {
          id: string;
          name: string;
          level: number;
        };
      }>>(`
        SELECT rbac::UserRole {
          role: {
            id,
            name,
            level
          }
        }
        FILTER .user.id = <uuid>$userId AND .is_active = true
      `, { userId: decoded.userId });

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        onboarding_status: user.onboarding_status,
        jobTitle: user.job_title,
        roles: userRoles.map(r => r.role)
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

      const user = await geldb.querySingle<{
        id: string;
        email: string;
        display_name: string;
        onboarding_status: string;
      }>(`
        INSERT rbac::User {
          email := <str>$email,
          password_hash := <str>$passwordHash,
          display_name := <str>$displayName,
          onboarding_status := 'PreHire'
        }
      `, { email, passwordHash, displayName });

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

export const authService = new AuthService();