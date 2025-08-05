# SvelteHR: Backend Integration with tRPC, Zod, and Superforms

## Executive Summary - REVISED

This updated implementation plan integrates with the existing MountainHR backend API running at `localhost:8080`. The backend provides a comprehensive REST API with JWT authentication, employee management, and HR operations. We will create a type-safe wrapper using tRPC while maintaining compatibility with the existing backend.

### Discovered Backend Architecture

**API Specifications:**
- **Base URL:** `http://localhost:8080`
- **Documentation:** Swagger UI at `/swagger/index.html`
- **Authentication:** JWT Bearer tokens
- **Total Endpoints:** 78 REST endpoints
- **Data Models:** 53 defined models
- **API Version:** 1.0

**Key Authentication Details:**
- Login endpoint: `POST /auth/login` (username/password)
- Returns JWT token and employee data
- Token refresh: `POST /auth/refresh`
- Profile endpoint: `GET /auth/profile`
- WorkOS SSO integration available

**Core Resources:**
- Employees (CRUD operations)
- Departments
- Attendance tracking
- Leave management
- Documents
- Compliance
- Onboarding/Offboarding
- HR Requests
- Admin dashboard

## Revised Architecture Strategy

### Hybrid Approach: REST Backend + tRPC Wrapper

Instead of replacing the backend, we'll create a tRPC wrapper layer that:
1. Consumes the existing REST API
2. Provides type-safe procedures
3. Handles authentication tokens
4. Manages error translation
5. Caches responses where appropriate

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  SvelteKit  │────▶│ tRPC Router  │────▶│ REST Backend   │
│   Frontend  │◀────│   (Wrapper)  │◀────│ (MountainHR)   │
└─────────────┘     └──────────────┘     └────────────────┘
      ▲                     │
      │                     ▼
      └──────────── Zod Schemas ──────────────┐
                    (Validation)                │
                         ▲                      │
                         │                      ▼
                  Superforms ────────────▶ UI Components
```

## Implementation Phases - REVISED

### Phase 1: Core Dependencies & API Client Setup
**Duration:** 2-3 hours
**Risk Level:** Low

#### Dependencies to Install

```json
{
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "@trpc/client": "^11.0.0",
    "trpc-sveltekit": "^4.0.0",
    "zod": "^3.23.8",
    "sveltekit-superforms": "^2.19.1",
    "devalue": "^5.1.1",
    "ky": "^1.7.2"
  },
  "devDependencies": {
    "@types/devalue": "^4.3.4"
  }
}
```

#### API Client Configuration (`src/lib/api/client.ts`)

```typescript
import ky from 'ky';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

const API_BASE_URL = 'http://localhost:8080';

class APIClient {
  private token: string | null = null;
  private client: typeof ky;

  constructor() {
    this.client = ky.create({
      prefixUrl: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      hooks: {
        beforeRequest: [
          request => {
            if (this.token) {
              request.headers.set('Authorization', `Bearer ${this.token}`);
            }
          }
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.status === 401 && browser) {
              // Token expired or invalid
              this.clearToken();
              goto('/login');
            }
          }
        ]
      }
    });
  }

  setToken(token: string) {
    this.token = token;
    if (browser) {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (browser) {
      localStorage.removeItem('auth_token');
    }
  }

  loadToken() {
    if (browser) {
      this.token = localStorage.getItem('auth_token');
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.client.post(endpoint, { json: data }).json();
  }

  async get<T>(endpoint: string, params?: any): Promise<T> {
    return this.client.get(endpoint, { searchParams: params }).json();
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.client.put(endpoint, { json: data }).json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.client.delete(endpoint).json();
  }
}

export const apiClient = new APIClient();
```

### Phase 2: Zod Schemas Based on Backend Models
**Duration:** 4-5 hours
**Risk Level:** Low

#### Authentication Schemas (`src/lib/schemas/auth.schema.ts`)

```typescript
import { z } from 'zod';

// Match backend LoginRequest
export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(100, 'Username too long'),
  password: z.string()
    .min(1, 'Password is required')
    .max(100, 'Password too long')
});

// Match backend LoginResponse
export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    departmentId: z.number().nullable(),
    department: z.object({
      id: z.number(),
      name: z.string()
    }).nullable(),
    jobTitle: z.string().nullable(),
    roleId: z.number(),
    role: z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string()
    }).nullable(),
    managerId: z.number().nullable(),
    manager: z.object({
      id: z.number(),
      firstName: z.string(),
      lastName: z.string()
    }).nullable(),
    onboardingStatus: z.string(),
    status: z.string()
  })
});

// Registration schema
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

#### Employee Schemas (`src/lib/schemas/employee.schema.ts`)

```typescript
import { z } from 'zod';

// Match backend Employee model
export const employeeSchema = z.object({
  // Personal Information
  id: z.number().optional(),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  middleName: z.string().optional().nullable(),
  email: z.string().email('Invalid email'),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  ssn: z.string().optional(),
  
  // Address Information
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  
  // Employment Information
  employeeNumber: z.string().optional(),
  departmentId: z.number(),
  jobTitle: z.string().min(1, 'Job title required'),
  managerId: z.number().optional().nullable(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  status: z.enum(['active', 'inactive', 'terminated', 'on_leave']),
  
  // Compensation
  payType: z.enum(['hourly', 'salary']),
  payRate: z.number().positive('Pay rate must be positive'),
  
  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  
  // Banking Information
  bankName: z.string().optional(),
  bankAccountType: z.enum(['checking', 'savings']).optional(),
  directDepositEnabled: z.boolean().default(false),
  
  // Other
  healthInsuranceInfo: z.string().optional(),
  onboardingStatus: z.enum(['not_started', 'in_progress', 'completed']).default('not_started')
});

// Create employee input (for new employees)
export const createEmployeeSchema = employeeSchema.omit({ id: true });

// Update employee input (partial updates allowed)
export const updateEmployeeSchema = employeeSchema.partial();

// Employee search/filter schema
export const employeeFilterSchema = z.object({
  search: z.string().optional(),
  departmentId: z.number().optional(),
  status: z.enum(['active', 'inactive', 'terminated', 'on_leave']).optional(),
  managerId: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

export type Employee = z.infer<typeof employeeSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
```

### Phase 3: tRPC Router with Backend Integration
**Duration:** 4-5 hours
**Risk Level:** Medium

#### tRPC Context (`src/lib/server/trpc/context.ts`)

```typescript
import type { RequestEvent } from '@sveltejs/kit';
import { apiClient } from '$lib/api/client';

export async function createContext(event: RequestEvent) {
  // Get token from cookie or header
  const token = event.cookies.get('auth_token') || 
                event.request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (token) {
    apiClient.setToken(token);
  }

  // Try to get current user from backend
  let user = null;
  if (token) {
    try {
      const response = await apiClient.get('/auth/profile');
      user = response;
    } catch (error) {
      // Token might be invalid
      console.error('Failed to get user profile:', error);
    }
  }

  return {
    event,
    token,
    user,
    apiClient
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

#### Auth Router (`src/lib/server/trpc/routers/auth.ts`)

```typescript
import { router, publicProcedure, protectedProcedure } from '../router';
import { loginSchema, registerSchema, changePasswordSchema } from '$lib/schemas/auth.schema';
import { TRPCError } from '@trpc/server';
import { apiClient } from '$lib/api/client';

export const authRouter = router({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await apiClient.post('/auth/login', input);
        
        if (response.token) {
          // Set cookie for SSR
          ctx.event.cookies.set('auth_token', response.token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          });
          
          apiClient.setToken(response.token);
        }
        
        return response;
      } catch (error: any) {
        if (error.response?.status === 401) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Authentication failed'
        });
      }
    }),
    
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        // Ignore logout errors
      }
      
      // Clear cookie
      ctx.event.cookies.delete('auth_token', { path: '/' });
      apiClient.clearToken();
      
      return { success: true };
    }),
    
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      try {
        const response = await apiClient.post('/auth/register', {
          username: input.username,
          password: input.password,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName
        });
        return response;
      } catch (error: any) {
        if (error.response?.status === 400) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.response.data?.message || 'Registration failed'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed'
        });
      }
    }),
    
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await apiClient.put('/auth/change-password', {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword
        });
        return response;
      } catch (error: any) {
        if (error.response?.status === 401) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Current password is incorrect'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to change password'
        });
      }
    }),
    
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        });
      }
      return ctx.user;
    }),
    
  refreshToken: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const response = await apiClient.post('/auth/refresh');
        
        if (response.token) {
          ctx.event.cookies.set('auth_token', response.token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          });
          
          apiClient.setToken(response.token);
        }
        
        return response;
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Failed to refresh token'
        });
      }
    })
});
```

### Phase 4: Superforms Integration with Backend
**Duration:** 3-4 hours
**Risk Level:** Low

#### Login Page Server Actions (`src/routes/login/+page.server.ts`)

```typescript
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/schemas/auth.schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies }) => {
  // Check if already authenticated
  const token = cookies.get('auth_token');
  
  if (token) {
    apiClient.setToken(token);
    try {
      const user = await apiClient.get('/auth/profile');
      if (user) {
        throw redirect(302, '/dashboard');
      }
    } catch (error) {
      // Token invalid, continue to login
      cookies.delete('auth_token', { path: '/' });
    }
  }
  
  const form = await superValidate(zod(loginSchema));
  return { form };
};

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const form = await superValidate(request, zod(loginSchema));
    
    if (!form.valid) {
      return fail(400, { form });
    }
    
    try {
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form.data)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return message(form, 'Invalid username or password', {
            status: 401
          });
        }
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      
      // Set auth cookie
      cookies.set('auth_token', data.token, {
        path: '/',
        httpOnly: true,
        secure: false, // Set to true in production
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      // Store user data in session if needed
      cookies.set('user_data', JSON.stringify(data.user), {
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
      
      throw redirect(302, '/dashboard');
    } catch (error) {
      if (error instanceof Response) throw error;
      
      console.error('Login error:', error);
      return message(form, 'Authentication failed. Please try again.', {
        status: 500
      });
    }
  }
};
```

#### Enhanced Login Component (`src/routes/login/+page.svelte`)

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { loginSchema } from '$lib/schemas/auth.schema';
  import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
  import { InputGroup } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Separator } from '$lib/components/ui/separator';
  import { User, Lock, AlertCircle, Loader2 } from 'lucide-svelte';
  
  export let data;
  
  const { form, errors, message, delayed, enhance, submitting } = superForm(data.form, {
    validators: zodClient(loginSchema),
    delayMs: 500,
    clearOnSubmit: 'errors',
    resetForm: false,
    onResult: ({ result }) => {
      if (result.type === 'redirect') {
        // Handle successful login
        console.log('Login successful, redirecting...');
      }
    }
  });
  
  // Demo credentials hint
  let showHint = false;
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
  <div class="w-full max-w-md">
    <!-- Logo and Title -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-2xl shadow-xl mb-4">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
      </div>
      <h1 class="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
        MountainHR
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">Human Resources Management System</p>
    </div>
    
    <!-- Login Card -->
    <Card variant="elevated" class="border-0 shadow-2xl backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      <CardHeader class="space-y-1 pb-6">
        <CardTitle class="text-2xl text-center">Welcome Back</CardTitle>
        <CardDescription class="text-center">
          Sign in to access your HR dashboard
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form method="POST" use:enhance class="space-y-5">
          <!-- Error Alert -->
          {#if $message}
            <Alert variant="error" class="mb-4">
              <AlertCircle class="h-4 w-4" />
              <AlertDescription>{$message}</AlertDescription>
            </Alert>
          {/if}
          
          <!-- Username Field -->
          <InputGroup
            type="text"
            bind:value={$form.username}
            label="Username"
            placeholder="Enter your username"
            error={$errors.username?.[0]}
            required
            prefixIcon={User}
            size="lg"
            variant={$errors.username ? 'error' : 'default'}
            description="Use your employee username"
          />
          
          <!-- Password Field -->
          <InputGroup
            type="password"
            bind:value={$form.password}
            label="Password"
            placeholder="Enter your password"
            error={$errors.password?.[0]}
            required
            prefixIcon={Lock}
            size="lg"
            variant={$errors.password ? 'error' : 'default'}
          />
          
          <!-- Forgot Password Link -->
          <div class="flex items-center justify-end">
            <a href="/forgot-password" class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors">
              Forgot password?
            </a>
          </div>
          
          <!-- Submit Button -->
          <Button 
            type="submit" 
            variant="default"
            size="lg"
            fullWidth
            disabled={$submitting}
            class="mt-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
          >
            {#if $submitting}
              <Loader2 class="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            {:else}
              Sign In
            {/if}
          </Button>
          
          <!-- Demo Hint -->
          <button
            type="button"
            on:click={() => showHint = !showHint}
            class="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mt-4"
          >
            Need demo credentials?
          </button>
          
          {#if showHint}
            <Alert variant="info" class="mt-2">
              <AlertDescription class="text-xs">
                <strong>Demo Accounts:</strong><br>
                Admin: admin / admin123<br>
                Manager: john.doe / password123<br>
                Employee: jane.smith / password123
              </AlertDescription>
            </Alert>
          {/if}
        </form>
      </CardContent>
      
      <CardFooter class="flex flex-col space-y-4 pt-4">
        <Separator />
        
        <!-- SSO Options (if WorkOS is configured) -->
        <div class="w-full">
          <Button 
            variant="outline" 
            size="lg" 
            fullWidth
            onclick={() => window.location.href = 'http://localhost:8080/auth/workos/login'}
            class="group"
          >
            <svg class="mr-2 h-5 w-5 text-primary-600 group-hover:text-primary-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Single Sign-On (SSO)
          </Button>
        </div>
        
        <!-- Footer Links -->
        <div class="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Don't have an account? Contact your HR administrator</p>
        </div>
      </CardFooter>
    </Card>
    
    <!-- Footer -->
    <div class="mt-8 text-center text-xs text-gray-500 dark:text-gray-500">
      <p>© 2024 MountainHR. All rights reserved.</p>
      <div class="mt-2 space-x-4">
        <a href="/privacy" class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Privacy Policy</a>
        <span>•</span>
        <a href="/terms" class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Terms of Service</a>
        <span>•</span>
        <a href="/help" class="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Help Center</a>
      </div>
    </div>
  </div>
</div>

<style>
  /* Add subtle animation to the gradient background */
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  .bg-gradient-to-br {
    background-size: 200% 200%;
    animation: gradient-shift 15s ease infinite;
  }
</style>
```

### Phase 5: Authentication Middleware & Guards
**Duration:** 2-3 hours
**Risk Level:** Medium

#### Auth Hook (`src/hooks.server.ts`)

```typescript
import type { Handle } from '@sveltejs/kit';
import { apiClient } from '$lib/api/client';

export const handle: Handle = async ({ event, resolve }) => {
  // Get token from cookie
  const token = event.cookies.get('auth_token');
  
  if (token) {
    apiClient.setToken(token);
    
    // Optionally verify token and get user data
    try {
      const user = await apiClient.get('/auth/profile');
      event.locals.user = user;
      event.locals.token = token;
    } catch (error) {
      // Token might be invalid, clear it
      event.cookies.delete('auth_token', { path: '/' });
      event.locals.user = null;
      event.locals.token = null;
    }
  } else {
    event.locals.user = null;
    event.locals.token = null;
  }
  
  // Protected routes
  const protectedRoutes = ['/dashboard', '/employees', '/profile', '/admin'];
  const isProtectedRoute = protectedRoutes.some(route => 
    event.url.pathname.startsWith(route)
  );
  
  if (isProtectedRoute && !event.locals.user) {
    return new Response(null, {
      status: 302,
      headers: {
        location: `/login?redirect=${encodeURIComponent(event.url.pathname)}`
      }
    });
  }
  
  return resolve(event);
};
```

#### App Types (`src/app.d.ts`)

```typescript
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: {
          id: number;
          name: string;
          slug: string;
        };
        department?: {
          id: number;
          name: string;
        };
      } | null;
      token: string | null;
    }
    
    interface PageData {
      user?: App.Locals['user'];
    }
    
    interface Error {
      message: string;
      code?: string;
    }
  }
}

export {};
```

### Phase 6: Testing & Validation
**Duration:** 2-3 hours
**Risk Level:** Low

#### Integration Tests (`src/tests/auth.test.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loginSchema } from '$lib/schemas/auth.schema';

describe('Authentication Flow', () => {
  describe('Schema Validation', () => {
    it('validates correct login input', () => {
      const input = {
        username: 'john.doe',
        password: 'SecurePass123'
      };
      expect(() => loginSchema.parse(input)).not.toThrow();
    });
    
    it('rejects empty username', () => {
      const input = {
        username: '',
        password: 'SecurePass123'
      };
      expect(() => loginSchema.parse(input)).toThrow();
    });
    
    it('rejects empty password', () => {
      const input = {
        username: 'john.doe',
        password: ''
      };
      expect(() => loginSchema.parse(input)).toThrow();
    });
  });
  
  describe('API Integration', () => {
    it('authenticates with valid credentials', async () => {
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test.user',
          password: 'TestPass123'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('user');
      }
    });
    
    it('rejects invalid credentials', async () => {
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'invalid',
          password: 'wrong'
        })
      });
      
      expect(response.status).toBe(401);
    });
  });
});
```

## Migration Strategy

### Step-by-Step Migration

1. **Week 1: Foundation**
   - Install dependencies
   - Set up API client
   - Create core Zod schemas
   - Implement auth flow

2. **Week 2: Integration**
   - Set up tRPC routers
   - Integrate Superforms
   - Update login page
   - Add authentication guards

3. **Week 3: Extension**
   - Create employee management forms
   - Add leave request forms
   - Implement document upload
   - Build dashboard components

4. **Week 4: Polish**
   - Performance optimization
   - Error handling improvements
   - Testing and bug fixes
   - Documentation

## Risk Mitigation

### API Compatibility
- **Risk:** Backend API changes breaking frontend
- **Mitigation:** Version API calls, maintain schema compatibility layer
- **Monitoring:** API response validation with Zod

### Authentication Security
- **Risk:** JWT token exposure or theft
- **Mitigation:** HttpOnly cookies, secure flag, CSRF protection
- **Monitoring:** Track failed auth attempts

### Performance Impact
- **Risk:** Additional validation overhead
- **Mitigation:** Lazy load schemas, optimize bundle splitting
- **Monitoring:** Track page load times and API response times

## Success Metrics

### Technical Metrics
- **API Type Coverage:** 100% of endpoints wrapped with tRPC
- **Form Validation:** 100% of forms using Superforms + Zod
- **Bundle Size:** <30KB increase after optimization
- **Response Time:** <5% increase in API call overhead

### User Experience Metrics
- **Login Success Rate:** Increase by 20%
- **Form Error Rate:** Reduce by 50%
- **Time to Complete Forms:** Reduce by 30%
- **User Satisfaction:** Increase by 25%

### Development Metrics
- **Type Safety:** 100% type coverage for API calls
- **Bug Rate:** 60% reduction in runtime errors
- **Development Speed:** 40% faster feature development
- **Code Reusability:** 70% schema reuse across features

## Conclusion

This revised implementation plan provides a practical approach to integrating modern form handling and type safety while working with the existing MountainHR backend API. The hybrid approach allows us to gain the benefits of tRPC, Zod, and Superforms without requiring backend changes.

Key advantages:
- **Immediate Value:** Can start implementation without backend modifications
- **Type Safety:** Full type safety from API to UI
- **Progressive Enhancement:** Can migrate incrementally
- **Maintainability:** Clear separation of concerns
- **Future-Proof:** Easy to adapt if backend changes

The implementation focuses on creating a robust, type-safe layer between the SvelteKit frontend and the REST backend, providing excellent developer experience while maintaining compatibility with the existing system.