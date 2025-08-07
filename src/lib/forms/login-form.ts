import { superForm } from 'sveltekit-superforms';
import { z } from 'zod';
import { trpc } from '$lib/trpc/client';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get } from 'svelte/store';

// Login schema for validation
const loginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
	rememberMe: z.boolean()
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface LoginFormOptions {
	onSuccess?: (data: any) => void;
	onError?: (error: string) => void;
	redirectTo?: string;
}

export function createLoginForm(options: LoginFormOptions = {}) {
	const initialData: LoginInput = {
		username: '',
		password: '',
		rememberMe: false
	};

	const sForm = superForm(initialData, {
		SPA: true,
		resetForm: false,
		multipleSubmits: 'prevent',
		clearOnSubmit: 'errors-and-message',
		
		onUpdate: async ({ form }) => {
			// Manual Zod validation since the adapter is problematic
			try {
				const validatedData = loginSchema.parse(form.data);
				
				// Call tRPC login mutation with validated data
				const result = await trpc.auth.login.mutate(validatedData);

				// Success callback  
				if (options.onSuccess) {
					options.onSuccess(result);
				}

				// Redirect
				const currentPage = get(page);
				const redirectTo = 
					options.redirectTo || 
					currentPage.url.searchParams.get('redirectTo') || 
					'/home';

				await goto(redirectTo, { replaceState: true });

			} catch (error: any) {
				if (error instanceof z.ZodError) {
					// Handle Zod validation errors
					const errors: Record<string, string[]> = {};
					error.errors.forEach((err) => {
						const field = err.path[0] as string;
						if (!errors[field]) errors[field] = [];
						errors[field].push(err.message);
					});
					
					// Return validation errors to Superforms
					return { errors };
				} else {
					// Handle login/network errors
					const errorMessage = error.message || 'Login failed. Please check your credentials.';
					
					if (options.onError) {
						options.onError(errorMessage);
					}
					
					return { error: errorMessage };
				}
			}
		}
	});

	return {
		...sForm,
		isSubmitting: sForm.submitting
	};
}

// Helper function for field props
export function getFieldProps(form: any, fieldName: string) {
	const { form: formData, errors, constraints } = form;
	
	return {
		name: fieldName,
		value: formData[fieldName],
		error: errors[fieldName]?.[0],
		required: constraints[fieldName]?.required,
		...constraints[fieldName],
	};
}