# Week 4 Foundation Completion - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Phase 1 Week 4 foundation layer with 80%+ coverage, zero `any` types, fully injectable services.

**Architecture:** Sequential bottom-up layer completion (Utils → Auth → GraphQL)

**Tech Stack:** TypeScript 5, Vitest 3.2.4, @testing-library/svelte, dependency injection pattern

---

## Layer 1: Shared Utilities Foundation (Days 1-3)

### Task 1: Extract and Test Date Formatters

**Files:**
- Create: `src/lib/utils/formatters/date.ts`
- Create: `tests/unit/utils/formatters/date.test.ts`
- Modify: `src/lib/utils/index.ts` (re-export date formatters)

**Step 1: Write failing tests for date formatters**

```typescript
// tests/unit/utils/formatters/date.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDateRange
} from '$lib/utils/formatters/date';

describe('formatDate', () => {
  it('formats Date object to locale date string', () => {
    const date = new Date('2026-01-22T12:00:00Z');
    expect(formatDate(date)).toBe('Jan 22, 2026');
  });

  it('formats ISO string to locale date string', () => {
    expect(formatDate('2026-01-22')).toBe('Jan 22, 2026');
  });

  it('returns fallback for null/undefined', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate(undefined)).toBe('N/A');
  });

  it('handles invalid date strings', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
  });
});

describe('formatDateTime', () => {
  it('includes time in formatted output', () => {
    const date = new Date('2026-01-22T15:30:00Z');
    expect(formatDateTime(date)).toMatch(/Jan 22, 2026.*3:30/);
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for <1 minute', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns "X minutes ago" for <60 minutes', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('returns "X hours ago" for <24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
  });
});

describe('formatDateRange', () => {
  it('formats date range with same month', () => {
    const start = new Date('2026-01-15');
    const end = new Date('2026-01-20');
    expect(formatDateRange(start, end)).toBe('Jan 15-20, 2026');
  });

  it('formats date range across months', () => {
    const start = new Date('2026-01-28');
    const end = new Date('2026-02-03');
    expect(formatDateRange(start, end)).toBe('Jan 28 - Feb 3, 2026');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- formatters/date --run`
Expected: All tests FAIL with "Cannot find module" errors

**Step 3: Implement date formatters**

```typescript
// src/lib/utils/formatters/date.ts

/**
 * Format a date to locale string
 */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'N/A';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return 'N/A';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Format date as relative time ("3 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Format date range
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- formatters/date --run`
Expected: All tests PASS

**Step 5: Export from utils index**

```typescript
// src/lib/utils/index.ts
export * from './formatters/date';
export * from './logger';
// ... other exports
```

**Step 6: Commit**

```bash
git add src/lib/utils/formatters/date.ts tests/unit/utils/formatters/date.test.ts src/lib/utils/index.ts
git commit -m "feat(utils): add date formatters with 100% coverage

- formatDate: locale date strings with null handling
- formatDateTime: date with time
- formatRelativeTime: human-friendly relative times
- formatDateRange: date range formatting
- All edge cases tested (null, invalid, timezones)"
```

---

### Task 2: Extract and Test Validators

**Files:**
- Create: `src/lib/utils/validators/email.ts`
- Create: `src/lib/utils/validators/phone.ts`
- Create: `src/lib/utils/validators/date.ts`
- Create: `src/lib/utils/validators/string.ts`
- Create: `tests/unit/utils/validators/email.test.ts`
- Create: `tests/unit/utils/validators/phone.test.ts`
- Create: `tests/unit/utils/validators/date.test.ts`
- Create: `tests/unit/utils/validators/string.test.ts`

**Step 1: Write failing tests for email validator**

```typescript
// tests/unit/utils/validators/email.test.ts
import { describe, it, expect } from 'vitest';
import { isValidEmail, normalizeEmail } from '$lib/utils/validators/email';

describe('isValidEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('handles null/undefined', () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('converts to lowercase and trims', () => {
    expect(normalizeEmail(' USER@EXAMPLE.COM ')).toBe('user@example.com');
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit -- validators/email --run`
Expected: FAIL

**Step 3: Implement email validator**

```typescript
// src/lib/utils/validators/email.ts

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

**Step 4: Run tests**

Run: `npm run test:unit -- validators/email --run`
Expected: PASS

**Step 5: Repeat for phone, date, string validators**

(Follow same pattern for phone.ts, date.ts, string.ts)

**Step 6: Commit**

```bash
git add src/lib/utils/validators/ tests/unit/utils/validators/
git commit -m "feat(utils): add validators with 100% coverage

- Email: validation and normalization
- Phone: international format validation
- Date: past/future/range validation
- String: non-empty, length, pattern validation"
```

---

### Task 3: Centralized Error Handling

**Files:**
- Create: `src/lib/utils/errors/AppError.ts`
- Create: `src/lib/utils/errors/ErrorHandler.ts`
- Create: `tests/unit/utils/errors/AppError.test.ts`
- Create: `tests/unit/utils/errors/ErrorHandler.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/unit/utils/errors/AppError.test.ts
import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, NotFoundError, UnauthorizedError } from '$lib/utils/errors/AppError';

describe('AppError', () => {
  it('creates error with code and context', () => {
    const error = new AppError('Something failed', 'TEST_ERROR', { userId: '123' });

    expect(error.message).toBe('Something failed');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.context).toEqual({ userId: '123' });
    expect(error.name).toBe('AppError');
  });
});

describe('ValidationError', () => {
  it('has VALIDATION_ERROR code', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('NotFoundError', () => {
  it('has NOT_FOUND code', () => {
    const error = new NotFoundError('User not found');
    expect(error.code).toBe('NOT_FOUND');
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit -- errors/AppError --run`
Expected: FAIL

**Step 3: Implement error classes**

```typescript
// src/lib/utils/errors/AppError.ts

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', context);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', context);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', context);
    this.name = 'ForbiddenError';
  }
}
```

**Step 4: Run tests**

Run: `npm run test:unit -- errors/AppError --run`
Expected: PASS

**Step 5: Implement ErrorHandler**

```typescript
// src/lib/utils/errors/ErrorHandler.ts
import { logger } from '../logger';
import type { AppError } from './AppError';

export class ErrorHandler {
  static handle(error: Error | AppError): void {
    if (this.isAppError(error)) {
      logger.error(error.message, error, {
        code: error.code,
        context: error.context
      });
    } else {
      logger.error('Unexpected error', error);
    }
  }

  static isAppError(error: Error): error is AppError {
    return 'code' in error && 'context' in error;
  }

  static toUserMessage(error: Error | AppError): string {
    if (this.isAppError(error)) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }
}
```

**Step 6: Commit**

```bash
git add src/lib/utils/errors/ tests/unit/utils/errors/
git commit -m "feat(utils): add centralized error handling

- AppError: base error with code and context
- Typed error classes: Validation, NotFound, Unauthorized, Forbidden
- ErrorHandler: centralized error handling and logging
- 100% test coverage"
```

---

### Task 4: Test Helpers and Factories

**Files:**
- Create: `src/lib/utils/test-helpers/factories.ts`
- Create: `src/lib/utils/test-helpers/mocks.ts`
- Create: `tests/unit/utils/test-helpers/factories.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/unit/utils/test-helpers/factories.test.ts
import { describe, it, expect } from 'vitest';
import { createMockUser, createMockEmployee, createMockDepartment } from '$lib/utils/test-helpers/factories';

describe('Test Factories', () => {
  it('createMockUser generates valid user', () => {
    const user = createMockUser();

    expect(user.id).toBeDefined();
    expect(user.email).toContain('@');
    expect(user.firstName).toBeDefined();
    expect(user.lastName).toBeDefined();
  });

  it('createMockUser accepts overrides', () => {
    const user = createMockUser({ email: 'test@example.com' });
    expect(user.email).toBe('test@example.com');
  });

  it('createMockEmployee generates valid employee', () => {
    const employee = createMockEmployee();

    expect(employee.id).toBeDefined();
    expect(employee.email).toContain('@');
    expect(employee.hireDate).toBeInstanceOf(Date);
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit -- test-helpers/factories --run`
Expected: FAIL

**Step 3: Implement factories**

```typescript
// src/lib/utils/test-helpers/factories.ts
import { randomUUID } from 'crypto';

let counter = 0;

function getUniqueId(): string {
  return `test-${randomUUID()}-${counter++}`;
}

export function createMockUser(overrides?: Partial<any>): any {
  const id = getUniqueId();
  return {
    id,
    email: `user-${id}@test.com`,
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

export function createMockEmployee(overrides?: Partial<any>): any {
  const id = getUniqueId();
  return {
    id,
    email: `employee-${id}@test.com`,
    firstName: 'Test',
    lastName: 'Employee',
    hireDate: new Date('2020-01-15'),
    departmentId: null,
    jobTitle: 'Software Engineer',
    phone: null,
    isActive: true,
    ...overrides
  };
}

export function createMockDepartment(overrides?: Partial<any>): any {
  const id = getUniqueId();
  return {
    id,
    name: `Department ${id}`,
    description: 'Test department',
    managerId: null,
    ...overrides
  };
}
```

**Step 4: Run tests**

Run: `npm run test:unit -- test-helpers/factories --run`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils/test-helpers/ tests/unit/utils/test-helpers/
git commit -m "feat(utils): add test helpers and factories

- Mock user/employee/department factories
- Unique ID generation for test data
- Override support for custom test scenarios
- Foundation for other layers' tests"
```

---

## Layer 2: Authentication Services (Days 4-6)

### Task 5: Extract AuthService with Dependency Injection

**Files:**
- Create: `src/services/auth/AuthService.ts`
- Create: `src/services/auth/ports/SessionPort.ts`
- Create: `src/adapters/auth/SvelteKitSessionAdapter.ts`
- Create: `tests/unit/services/auth/AuthService.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/unit/services/auth/AuthService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '$services/auth/AuthService';
import type { SessionPort } from '$services/auth/ports/SessionPort';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

describe('AuthService', () => {
  let mockSession: SessionPort;
  let mockGraphQL: GraphQLPort;
  let authService: AuthService;

  beforeEach(() => {
    mockSession = {
      getSession: vi.fn(),
      createSession: vi.fn(),
      updateSession: vi.fn(),
      destroySession: vi.fn()
    };

    mockGraphQL = {
      query: vi.fn(),
      mutation: vi.fn()
    };

    authService = new AuthService(mockSession, mockGraphQL);
  });

  it('login creates session on success', async () => {
    vi.mocked(mockGraphQL.mutation).mockResolvedValue({
      login: { userId: '123', token: 'abc' }
    });

    await authService.login('user@test.com', 'password');

    expect(mockSession.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '123' })
    );
  });

  it('logout destroys session', async () => {
    vi.mocked(mockSession.getSession).mockResolvedValue({
      sessionId: 'session-123'
    });

    await authService.logout();

    expect(mockSession.destroySession).toHaveBeenCalledWith('session-123');
  });

  it('validateSession returns user if valid', async () => {
    vi.mocked(mockSession.getSession).mockResolvedValue({
      userId: '123',
      sessionId: 'session-123'
    });

    vi.mocked(mockGraphQL.query).mockResolvedValue({
      user: { id: '123', email: 'test@example.com' }
    });

    const user = await authService.validateSession();

    expect(user).toEqual(expect.objectContaining({ id: '123' }));
  });

  it('validateSession returns null if session invalid', async () => {
    vi.mocked(mockSession.getSession).mockResolvedValue(null);

    const user = await authService.validateSession();

    expect(user).toBeNull();
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit -- services/auth/AuthService --run`
Expected: FAIL

**Step 3: Implement SessionPort interface**

```typescript
// src/services/auth/ports/SessionPort.ts

export interface SessionData {
  userId: string;
  sessionId: string;
  email?: string;
  roles?: string[];
  createdAt: string;
}

export interface SessionPort {
  getSession(): Promise<SessionData | null>;
  createSession(data: Omit<SessionData, 'sessionId' | 'createdAt'>): Promise<SessionData>;
  updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;
  destroySession(sessionId: string): Promise<void>;
}
```

**Step 4: Implement AuthService**

```typescript
// src/services/auth/AuthService.ts
import type { SessionPort } from './ports/SessionPort';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { UnauthorizedError } from '$lib/utils/errors/AppError';
import { logger } from '$lib/utils/logger';

export class AuthService {
  constructor(
    private readonly sessionPort: SessionPort,
    private readonly graphql: GraphQLPort
  ) {}

  async login(email: string, password: string): Promise<void> {
    const result = await this.graphql.mutation(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          userId
          token
        }
      }
    `, { email, password });

    if (!result.login) {
      throw new UnauthorizedError('Invalid credentials');
    }

    await this.sessionPort.createSession({
      userId: result.login.userId,
      email
    });

    logger.info('[Auth] User logged in', { userId: result.login.userId });
  }

  async logout(): Promise<void> {
    const session = await this.sessionPort.getSession();

    if (session) {
      await this.sessionPort.destroySession(session.sessionId);
      logger.info('[Auth] User logged out', { userId: session.userId });
    }
  }

  async validateSession(): Promise<any | null> {
    const session = await this.sessionPort.getSession();

    if (!session) return null;

    try {
      const result = await this.graphql.query(`
        query GetUser($id: UUID!) {
          user(id: $id) {
            id
            email
            firstName
            lastName
          }
        }
      `, { id: session.userId });

      return result.user;
    } catch (error) {
      logger.warn('[Auth] Session validation failed', { error });
      return null;
    }
  }

  async getCurrentUser(): Promise<any | null> {
    return this.validateSession();
  }
}
```

**Step 5: Run tests**

Run: `npm run test:unit -- services/auth/AuthService --run`
Expected: PASS

**Step 6: Commit**

```bash
git add src/services/auth/ tests/unit/services/auth/
git commit -m "feat(auth): extract AuthService with dependency injection

- AuthService: login, logout, session validation
- SessionPort: interface for session management
- Zero SvelteKit coupling (testable in isolation)
- 80%+ test coverage"
```

---

### Task 6: Extract RBACService

**Files:**
- Create: `src/services/auth/RBACService.ts`
- Create: `tests/unit/services/auth/RBACService.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/unit/services/auth/RBACService.test.ts
import { describe, it, expect } from 'vitest';
import { RBACService } from '$services/auth/RBACService';

describe('RBACService', () => {
  const rbac = new RBACService();

  describe('hasPermission', () => {
    it('returns true for exact permission match', () => {
      const user = { permissions: ['users:read'] };
      expect(rbac.hasPermission(user, 'users:read')).toBe(true);
    });

    it('returns false when permission missing', () => {
      const user = { permissions: ['users:read'] };
      expect(rbac.hasPermission(user, 'users:write')).toBe(false);
    });

    it('returns true for admin wildcard', () => {
      const user = { permissions: ['*'] };
      expect(rbac.hasPermission(user, 'users:write')).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if user has any required permission', () => {
      const user = { permissions: ['users:read'] };
      expect(rbac.hasAnyPermission(user, ['users:read', 'users:write'])).toBe(true);
    });

    it('returns false if user has none', () => {
      const user = { permissions: ['posts:read'] };
      expect(rbac.hasAnyPermission(user, ['users:read', 'users:write'])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true if user has all required permissions', () => {
      const user = { permissions: ['users:read', 'users:write'] };
      expect(rbac.hasAllPermissions(user, ['users:read', 'users:write'])).toBe(true);
    });

    it('returns false if missing any permission', () => {
      const user = { permissions: ['users:read'] };
      expect(rbac.hasAllPermissions(user, ['users:read', 'users:write'])).toBe(false);
    });
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit -- services/auth/RBACService --run`
Expected: FAIL

**Step 3: Implement RBACService**

```typescript
// src/services/auth/RBACService.ts

export interface User {
  permissions: string[];
  roles?: string[];
}

export class RBACService {
  hasPermission(user: User, permission: string): boolean {
    if (!user.permissions) return false;

    // Admin wildcard
    if (user.permissions.includes('*') || user.permissions.includes('*:*')) {
      return true;
    }

    // Exact match
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Scoped permission matching (users:write:all matches users:write)
    const [resource, action] = permission.split(':');
    return user.permissions.some(p => {
      const [pResource, pAction] = p.split(':');
      return pResource === resource && pAction === action;
    });
  }

  hasAnyPermission(user: User, permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(user, p));
  }

  hasAllPermissions(user: User, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(user, p));
  }

  canAccessResource(
    user: User,
    resource: string,
    action: 'read' | 'write' | 'delete'
  ): boolean {
    return this.hasPermission(user, `${resource}:${action}`);
  }
}
```

**Step 4: Run tests**

Run: `npm run test:unit -- services/auth/RBACService --run`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/auth/RBACService.ts tests/unit/services/auth/RBACService.test.ts
git commit -m "feat(auth): add RBACService for permission checking

- hasPermission: exact match and wildcard support
- hasAnyPermission: OR logic for multiple permissions
- hasAllPermissions: AND logic for multiple permissions
- canAccessResource: resource-based access control
- 100% test coverage"
```

---

## Layer 3: GraphQL Infrastructure (Days 7-8)

### Task 7: GraphQL Port and Adapter

**Files:**
- Create: `src/services/ports/GraphQLPort.ts`
- Create: `src/adapters/graphql/GraphQLAdapter.ts`
- Create: `src/adapters/graphql/errors/GraphQLError.ts`
- Create: `tests/unit/adapters/graphql/GraphQLAdapter.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/unit/adapters/graphql/GraphQLAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import type { Client } from '@urql/core';

describe('GraphQLAdapter', () => {
  let mockClient: Client;
  let adapter: GraphQLAdapter;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      mutation: vi.fn()
    } as any;

    adapter = new GraphQLAdapter(mockClient);
  });

  it('query returns data on success', async () => {
    vi.mocked(mockClient.query).mockReturnValue({
      toPromise: () => Promise.resolve({
        data: { users: [{ id: '1' }] },
        error: undefined
      })
    } as any);

    const result = await adapter.query('{ users { id } }', {});

    expect(result).toEqual({ users: [{ id: '1' }] });
  });

  it('query throws GraphQLError on error', async () => {
    vi.mocked(mockClient.query).mockReturnValue({
      toPromise: () => Promise.resolve({
        data: null,
        error: { message: 'Not found' }
      })
    } as any);

    await expect(adapter.query('{ users { id } }', {}))
      .rejects.toThrow('Not found');
  });

  it('mutation returns data on success', async () => {
    vi.mocked(mockClient.mutation).mockReturnValue({
      toPromise: () => Promise.resolve({
        data: { createUser: { id: '1' } },
        error: undefined
      })
    } as any);

    const result = await adapter.mutation('mutation { createUser }', {});

    expect(result).toEqual({ createUser: { id: '1' } });
  });
});
```

**Step 2: Run tests**

Run: `npm run test:unit -- adapters/graphql/GraphQLAdapter --run`
Expected: FAIL

**Step 3: Implement GraphQLPort**

```typescript
// src/services/ports/GraphQLPort.ts

export interface GraphQLPort {
  query<T = any>(operation: string, variables?: Record<string, any>): Promise<T>;
  mutation<T = any>(operation: string, variables?: Record<string, any>): Promise<T>;
}
```

**Step 4: Implement GraphQLAdapter**

```typescript
// src/adapters/graphql/GraphQLAdapter.ts
import type { Client, CombinedError } from '@urql/core';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import { GraphQLError } from './errors/GraphQLError';
import { logger } from '$lib/utils/logger';

export class GraphQLAdapter implements GraphQLPort {
  constructor(private readonly client: Client) {}

  async query<T = any>(operation: string, variables?: Record<string, any>): Promise<T> {
    const result = await this.client.query(operation, variables).toPromise();

    if (result.error) {
      throw this.handleError(result.error);
    }

    return result.data as T;
  }

  async mutation<T = any>(operation: string, variables?: Record<string, any>): Promise<T> {
    const result = await this.client.mutation(operation, variables).toPromise();

    if (result.error) {
      throw this.handleError(result.error);
    }

    return result.data as T;
  }

  private handleError(error: CombinedError): GraphQLError {
    logger.error('[GraphQL] Request failed', error);

    if (error.message.includes('not found')) {
      return new GraphQLError('NOT_FOUND', error.message);
    }

    if (error.message.includes('unauthorized')) {
      return new GraphQLError('UNAUTHORIZED', error.message);
    }

    return new GraphQLError('UNKNOWN', error.message);
  }
}
```

**Step 5: Implement GraphQLError**

```typescript
// src/adapters/graphql/errors/GraphQLError.ts
import { AppError } from '$lib/utils/errors/AppError';

export class GraphQLError extends AppError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message, `GRAPHQL_${code}`, context);
    this.name = 'GraphQLError';
  }
}
```

**Step 6: Run tests**

Run: `npm run test:unit -- adapters/graphql/GraphQLAdapter --run`
Expected: PASS

**Step 7: Commit**

```bash
git add src/services/ports/GraphQLPort.ts src/adapters/graphql/ tests/unit/adapters/graphql/
git commit -m "feat(graphql): add GraphQL adapter with error handling

- GraphQLPort: interface for query/mutation operations
- GraphQLAdapter: implements GraphQLPort with URQL client
- GraphQLError: typed errors for GraphQL operations
- Centralized error mapping and logging
- 80%+ test coverage"
```

---

### Task 8: Refactor Existing Adapters to Use GraphQLPort

**Files:**
- Modify: `src/adapters/GraphQLEmployeeAdapter.ts`
- Modify: `src/adapters/GraphQLDepartmentAdapter.ts`

**Step 1: Update GraphQLEmployeeAdapter constructor**

```typescript
// Before
export class GraphQLEmployeeAdapter implements EmployeeRepository {
  constructor(private readonly client: Client) {}

  async findById(id: string): Promise<Employee | null> {
    const result = await this.client.query(query, { id }).toPromise();
    // ...
  }
}

// After
import type { GraphQLPort } from '$services/ports/GraphQLPort';

export class GraphQLEmployeeAdapter implements EmployeeRepository {
  constructor(private readonly graphql: GraphQLPort) {}

  async findById(id: string): Promise<Employee | null> {
    const result = await this.graphql.query(query, { id });
    // No more .toPromise() - GraphQLPort handles it
    // No more error checking - GraphQLPort throws
  }
}
```

**Step 2: Update all methods to use GraphQLPort**

**Step 3: Update tests to mock GraphQLPort**

**Step 4: Run tests**

Run: `npm run test:unit -- adapters/GraphQLEmployeeAdapter --run`
Expected: PASS

**Step 5: Repeat for GraphQLDepartmentAdapter**

**Step 6: Commit**

```bash
git add src/adapters/GraphQLEmployeeAdapter.ts src/adapters/GraphQLDepartmentAdapter.ts
git commit -m "refactor: use GraphQLPort in employee and department adapters

- Removed direct URQL client dependency
- Use GraphQLPort for all queries/mutations
- Simplified error handling (port throws typed errors)
- Easier to mock for testing"
```

---

## Success Criteria

**Layer 1 Complete When:**
- [ ] All utils in `src/lib/utils/` with zero Svelte dependencies
- [ ] Zero `any` types in utils
- [ ] 90%+ test coverage for utils
- [ ] Test helpers/factories available

**Layer 2 Complete When:**
- [ ] Auth services extracted from routes
- [ ] Zero SvelteKit coupling in services
- [ ] 80%+ test coverage for auth layer
- [ ] All RBAC scenarios tested

**Layer 3 Complete When:**
- [ ] GraphQL adapter implements GraphQLPort
- [ ] 80%+ test coverage for GraphQL layer
- [ ] All existing adapters refactored to use GraphQLPort

**Week 4 Complete When:**
- [ ] All three layers complete
- [ ] 80%+ coverage for foundation
- [ ] Zero `any` types in foundation code
- [ ] Ready for Phase 2

---

## Timeline

- **Days 1-3:** Layer 1 (Utils)
- **Days 4-6:** Layer 2 (Auth)
- **Days 7-8:** Layer 3 (GraphQL)

**Total:** 8-10 days
