import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

/**
 * JWT Middleware for Hasura Authentication
 * Validates JWT tokens and sets Hasura session variables
 */

interface JWTPayload {
  sub: string; // User ID
  email: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  hasura: {
    allowed_roles: string[];
    default_role: string;
    user_id: string;
    user_email: string;
    user_department_id?: string;
    user_manager_id?: string;
    user_role_level: string;
  };
}

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  hasuraHeaders?: Record<string, string>;
}

export class JWTMiddleware {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET ||
    'your-jwt-secret-key-here-must-be-at-least-32-chars-long';
  private static readonly JWT_ALGORITHM = 'HS256';
  private static readonly AUDIENCE = 'hasura-hr-system';
  private static readonly ISSUER = 'hr-auth-service';

  /**
   * Validate JWT token and extract user information
   */
  static validateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify and decode JWT
      const decoded = jwt.verify(token, JWTMiddleware.JWT_SECRET, {
        algorithms: [JWTMiddleware.JWT_ALGORITHM],
        audience: JWTMiddleware.AUDIENCE,
        issuer: JWTMiddleware.ISSUER,
        clockTolerance: 10, // 10 seconds leeway for clock skew
      }) as JWTPayload;

      // Validate required Hasura claims
      if (
        !decoded.hasura ||
        !decoded.hasura.allowed_roles ||
        !decoded.hasura.default_role
      ) {
        return res.status(401).json({
          error: 'Invalid JWT: Missing required Hasura claims',
        });
      }

      // Set user data on request
      req.user = decoded;

      // Generate Hasura session headers
      req.hasuraHeaders = JWTMiddleware.generateHasuraHeaders(decoded);

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      } else {
        console.error('JWT validation error:', error);
        return res.status(500).json({ error: 'Authentication service error' });
      }
    }
  };

  /**
   * Generate Hasura session headers from JWT payload
   */
  private static generateHasuraHeaders(
    payload: JWTPayload
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Hasura-User-Id': payload.hasura.user_id,
      'X-Hasura-Role': payload.hasura.default_role,
      'X-Hasura-Allowed-Roles': payload.hasura.allowed_roles.join(','),
      'X-Hasura-User-Email': payload.hasura.user_email,
      'X-Hasura-User-Role-Level': payload.hasura.user_role_level,
    };

    // Add optional headers if present
    if (payload.hasura.user_department_id) {
      headers['X-Hasura-User-Department-Id'] =
        payload.hasura.user_department_id;
    }

    if (payload.hasura.user_manager_id) {
      headers['X-Hasura-User-Manager-Id'] = payload.hasura.user_manager_id;
    }

    return headers;
  }

  /**
   * Generate JWT token for user authentication
   */
  static async generateToken(userId: string): Promise<string> {
    try {
      // Get user data and roles from database
      const authService = new AuthService();
      const userData = await authService.getUserAuthData(userId);

      if (!userData) {
        throw new Error('User not found');
      }

      const payload: JWTPayload = {
        sub: userId,
        email: userData.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
        aud: JWTMiddleware.AUDIENCE,
        iss: JWTMiddleware.ISSUER,
        hasura: {
          allowed_roles: userData.roles.map((role) => role.name),
          default_role: userData.defaultRole,
          user_id: userId,
          user_email: userData.email,
          user_department_id: userData.departmentId,
          user_manager_id: userData.managerId,
          user_role_level: userData.maxRoleLevel.toString(),
        },
      };

      return jwt.sign(payload, JWTMiddleware.JWT_SECRET, {
        algorithm: JWTMiddleware.JWT_ALGORITHM,
      });
    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Generate refresh token (longer-lived, more secure)
   */
  static generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      aud: JWTMiddleware.AUDIENCE,
      iss: JWTMiddleware.ISSUER,
    };

    return jwt.sign(payload, JWTMiddleware.JWT_SECRET, {
      algorithm: JWTMiddleware.JWT_ALGORITHM,
    });
  }

  /**
   * Verify refresh token and return user ID
   */
  static verifyRefreshToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, JWTMiddleware.JWT_SECRET, {
        algorithms: [JWTMiddleware.JWT_ALGORITHM],
        audience: JWTMiddleware.AUDIENCE,
        issuer: JWTMiddleware.ISSUER,
      }) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      return decoded.sub;
    } catch {
      return null;
    }
  }

  /**
   * Optional: Role-based middleware for additional authorization
   */
  static requireRole(allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user?.hasura.allowed_roles) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoles = req.user.hasura.allowed_roles;
      const hasPermission = allowedRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRoles,
        });
      }

      next();
    };
  }

  /**
   * Extract user ID from request (for convenience)
   */
  static getUserId(req: AuthenticatedRequest): string | null {
    return req.user?.hasura.user_id || null;
  }

  /**
   * Extract user roles from request (for convenience)
   */
  static getUserRoles(req: AuthenticatedRequest): string[] {
    return req.user?.hasura.allowed_roles || [];
  }

  /**
   * Check if user has specific role
   */
  static hasRole(req: AuthenticatedRequest, role: string): boolean {
    return req.user?.hasura.allowed_roles.includes(role) || false;
  }
}

// Export types for use in other modules
export { AuthenticatedRequest, JWTPayload };
