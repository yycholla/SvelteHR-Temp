import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './context';
import { api } from '$lib/api/client';
import { 
	userSchema,
	loginResponseSchema,
	type User 
} from '$lib/schemas/auth';

// Define loginSchema locally to match login-form.ts
const loginSchema = z.object({
	username: z
		.string()
		.min(1, 'Username is required')
		.max(100, 'Username must be less than 100 characters'),
	password: z
		.string()
		.min(1, 'Password is required')
		.max(100, 'Password must be less than 100 characters'),
	rememberMe: z.boolean().default(false).optional(),
});

type LoginInput = z.infer<typeof loginSchema>;
import {
	employeeSchema,
	employeeFilterSchema,
	employeeListResponseSchema,
	departmentSchema,
	positionSchema,
	type Employee,
	type EmployeeFilter
} from '$lib/schemas/employee';

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Create reusable middleware
const isAuthenticated = t.middleware(({ ctx, next }) => {
	if (!ctx.token || !ctx.userId) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'You must be logged in to access this resource',
		});
	}
	return next({
		ctx: {
			...ctx,
			userId: ctx.userId,
			token: ctx.token,
		},
	});
});

// Protected procedure
const protectedProcedure = t.procedure.use(isAuthenticated);

// Auth router
const authRouter = t.router({
	login: t.procedure
		.input(loginSchema)
		.output(loginResponseSchema)
		.mutation(async ({ input, ctx }) => {
			try {
				const response = await api.auth.login(input);
				
				// Set JWT cookie via SvelteKit
				ctx.event.cookies.set('auth-token', response.token, {
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'strict',
					maxAge: 60 * 60 * 24 * 7, // 7 days
				});
				
				return response;
			} catch (error: any) {
				throw new TRPCError({
					code: 'UNAUTHORIZED',
					message: error.message || 'Invalid credentials',
				});
			}
		}),
	
	logout: protectedProcedure
		.mutation(async ({ ctx }) => {
			try {
				await api.auth.logout();
			} finally {
				// Clear JWT cookie
				ctx.event.cookies.delete('auth-token', { path: '/' });
			}
			return { success: true };
		}),
	
	me: protectedProcedure
		.output(userSchema)
		.query(async ({ ctx }) => {
			try {
				const user = await api.auth.getCurrentUser();
				return userSchema.parse(user);
			} catch (error: any) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch user profile',
				});
			}
		}),
});

// Employee router
const employeeRouter = t.router({
	list: protectedProcedure
		.input(employeeFilterSchema)
		.output(employeeListResponseSchema)
		.query(async ({ input }) => {
			try {
				// Build query parameters
				const params = new URLSearchParams();
				if (input.search) params.append('search', input.search);
				if (input.departmentId) params.append('departmentId', input.departmentId);
				if (input.status) params.append('status', input.status);
				if (input.managerId) params.append('managerId', input.managerId);
				if (input.workType) params.append('workType', input.workType);
				if (input.hiredAfter) params.append('hiredAfter', input.hiredAfter);
				if (input.hiredBefore) params.append('hiredBefore', input.hiredBefore);
				params.append('page', input.page.toString());
				params.append('limit', input.limit.toString());
				params.append('sortBy', input.sortBy);
				params.append('sortOrder', input.sortOrder);
				
				const response = await api.get(`employees?${params.toString()}`);
				return employeeListResponseSchema.parse(response);
			} catch (error: any) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch employees',
				});
			}
		}),
	
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.output(employeeSchema)
		.query(async ({ input }) => {
			try {
				const employee = await api.get(`employees/${input.id}`);
				return employeeSchema.parse(employee);
			} catch (error: any) {
				if (error.response?.status === 404) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Employee not found',
					});
				}
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch employee',
				});
			}
		}),
});

// Department router
const departmentRouter = t.router({
	list: protectedProcedure
		.output(z.array(departmentSchema))
		.query(async () => {
			try {
				const departments = await api.get('departments');
				return z.array(departmentSchema).parse(departments);
			} catch (error: any) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch departments',
				});
			}
		}),
});

// Position router  
const positionRouter = t.router({
	list: protectedProcedure
		.input(z.object({ departmentId: z.string().optional() }))
		.output(z.array(positionSchema))
		.query(async ({ input }) => {
			try {
				const endpoint = input.departmentId 
					? `positions?departmentId=${input.departmentId}`
					: 'positions';
				const positions = await api.get(endpoint);
				return z.array(positionSchema).parse(positions);
			} catch (error: any) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch positions',
				});
			}
		}),
});

// Main app router
export const appRouter = t.router({
	auth: authRouter,
	employee: employeeRouter,
	department: departmentRouter,
	position: positionRouter,
});

export type AppRouter = typeof appRouter;