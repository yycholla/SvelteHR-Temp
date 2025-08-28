import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Context } from './context';
import { apiClient } from '$lib/api/client';
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
	embeddedPositionSchema as positionSchema,
	type Employee,
	type EmployeeFilter
} from '$lib/schemas/employee';
import {
    taskSchema,
    createTaskSchema,
    taskStatusUpdateSchema,
    type Task
} from '$lib/schemas/task';

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
				const response = await apiClient.post('auth/login', {
					json: input,
					headers: {
						'Content-Type': 'application/json'
					}
				}).json();

				// Set JWT cookie via SvelteKit
				ctx.event.cookies.set('hr_token', response.token, {
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
				// Get auth token for logout request
				const token = ctx.event.cookies.get('hr_token');

				if (token) {
					// Create server-side API client for logout
					const serverApiClient = apiClient.extend({
						hooks: {
							beforeRequest: [
								(request) => {
									request.headers.set('Authorization', `Bearer ${token}`);
									request.headers.set('Content-Type', 'application/json');
								}
							]
						}
					});

					await serverApiClient.post('auth/logout', {
						headers: {
							'Content-Type': 'application/json'
						}
					});
				}
			} finally {
				// Clear JWT cookie
				ctx.event.cookies.delete('hr_token', { path: '/' });
			}
			return { success: true };
		}),

	me: protectedProcedure
		.output(userSchema)
		.query(async ({ ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

				const user = await serverApiClient.get('auth/profile').json();
				return userSchema.parse(user);
			} catch (error: any) {
				console.error('tRPC auth.me error:', error);
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
		.query(async ({ input, ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

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

				const response = await serverApiClient.get(`employees?${params.toString()}`).json();
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
		.query(async ({ input, ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

				const employee = await serverApiClient.get(`v2/employees/${input.id}`).json();
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

	create: protectedProcedure
		.input(z.object({
			username: z.string().min(1, 'Username is required'),
			firstName: z.string().min(1, 'First name is required'),
			lastName: z.string().min(1, 'Last name is required'),
			email: z.string().email().optional(),
			phoneNumber: z.string().optional(),
			roleId: z.number().min(1, 'Role is required'),
			departmentId: z.number().optional(),
			managerId: z.number().optional(),
			jobTitle: z.string().optional(),
			hireDate: z.string().optional(),
			employmentType: z.string().optional(),
			onboardingStatus: z.string().optional(),
			isManager: z.boolean().optional(),
		}))
		.output(employeeSchema)
		.mutation(async ({ input, ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

				const employee = await serverApiClient.post('v2/employees', { json: input }).json();
				return employeeSchema.parse(employee);
			} catch (error: any) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to create employee',
				});
			}
		}),

	update: protectedProcedure
		.input(z.object({
			id: z.string(),
			username: z.string().optional(),
			firstName: z.string().optional(),
			lastName: z.string().optional(),
			email: z.string().optional(),
			phoneNumber: z.string().optional(),
			roleId: z.number().optional(),
			departmentId: z.number().optional(),
			managerId: z.number().optional(),
			jobTitle: z.string().optional(),
			hireDate: z.string().optional(),
			employmentType: z.string().optional(),
			onboardingStatus: z.string().optional(),
			isManager: z.boolean().optional(),
		}))
		.output(employeeSchema)
		.mutation(async ({ input, ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

				const { id, ...updateData } = input;
				const employee = await serverApiClient.put(`v2/employees/${id}`, { json: updateData }).json();
				return employeeSchema.parse(employee);
			} catch (error: any) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to update employee',
				});
			}
		}),
});

// Department router
const departmentRouter = t.router({
	list: protectedProcedure
		.output(z.array(departmentSchema))
		.query(async ({ ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

				const departments = await serverApiClient.get('departments').json();
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
		.query(async ({ input, ctx }) => {
			try {
				// Get auth token from cookies
				const token = ctx.event.cookies.get('hr_token');

				if (!token) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Authentication token not found',
					});
				}

				// Create server-side API client with proper token handling
				const serverApiClient = apiClient.extend({
					hooks: {
						beforeRequest: [
							(request) => {
								request.headers.set('Authorization', `Bearer ${token}`);
								request.headers.set('Content-Type', 'application/json');
							}
						]
					}
				});

				const endpoint = input.departmentId
					? `positions?departmentId=${input.departmentId}`
					: 'positions';
				const positions = await serverApiClient.get(endpoint).json();
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
    task: t.router({
        create: protectedProcedure
            .input(createTaskSchema)
            .output(taskSchema)
            .mutation(async ({ input, ctx }) => {
                const token = ctx.event.cookies.get('hr_token');
                if (!token) {
                    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication token not found' });
                }

                const serverApiClient = apiClient.extend({
                    hooks: {
                        beforeRequest: [
                            (request) => {
                                request.headers.set('Authorization', `Bearer ${token}`);
                                request.headers.set('Content-Type', 'application/json');
                            }
                        ]
                    }
                });

                try {
                    const created = await serverApiClient.post('tasks', { json: input }).json();
                    return taskSchema.parse(created);
                } catch (error: any) {
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create task' });
                }
            }),

        updateStatus: protectedProcedure
            .input(z.object({ id: z.number(), data: taskStatusUpdateSchema }))
            .output(z.object({ success: z.boolean() }))
            .mutation(async ({ input, ctx }) => {
                const token = ctx.event.cookies.get('hr_token');
                if (!token) {
                    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication token not found' });
                }

                const serverApiClient = apiClient.extend({
                    hooks: {
                        beforeRequest: [
                            (request) => {
                                request.headers.set('Authorization', `Bearer ${token}`);
                                request.headers.set('Content-Type', 'application/json');
                            }
                        ]
                    }
                });

                try {
                    await serverApiClient.put(`tasks/${input.id}/status`, { json: input.data });
                    return { success: true };
                } catch (error: any) {
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update task status' });
                }
            })
    })
});

export type AppRouter = typeof appRouter;
