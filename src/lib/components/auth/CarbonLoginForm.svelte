<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { authStore, authActions, isLoading, authError } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import {
		Form,
		TextInput,
		PasswordInput,
		Button,
		Checkbox,
		InlineNotification,
		Loading,
		Link,
		FormGroup,
		FormLabel
	} from 'carbon-components-svelte';
	import { Email, Password } from 'carbon-icons-svelte';
	import type {
		CarbonLoginFormProps,
		CarbonLoginFormEvents,
		LoginCredentials
	} from '../../../contracts/component-interface';

	/**
	 * Carbon Login Form Component
	 * Handles user authentication with email/password using Carbon Design System
	 * Implements CarbonLoginFormProps interface for consistent component behavior
	 */

	type $$Props = CarbonLoginFormProps;
	type $$Events = CarbonLoginFormEvents;

	const dispatch = createEventDispatcher<CarbonLoginFormEvents>();

	// Component props with defaults
	export let title: string = 'Sign in to SvelteHR';
	export let subtitle: string = 'Welcome back! Please sign in to your account.';
	export let showRememberMe: boolean = true;
	export let showForgotPassword: boolean = true;
	export let showSignUp: boolean = true;
	export let signUpUrl: string = '/auth/register';
	export let forgotPasswordUrl: string = '/auth/forgot-password';
	export let disabled: boolean = false;
	export let loading: boolean = false;

	// Validation configuration
	export let emailValidation = {
		required: true,
		customValidator: undefined as ((email: string) => string) | undefined
	};
	export let passwordValidation = {
		required: true,
		minLength: 8,
		customValidator: undefined as ((password: string) => string) | undefined
	};

	// Accessibility configuration
	export let accessibility = {
		formLabel: 'User login form',
		announceValidation: true,
		announceSubmission: true
	};

	// Event handlers
	export let onSubmit: ((credentials: LoginCredentials) => Promise<boolean>) | undefined =
		undefined;
	export let onSuccess: ((user: any) => void) | undefined = undefined;
	export let onError: ((error: string) => void) | undefined = undefined;
	export let onValidationChange: ((isValid: boolean) => void) | undefined = undefined;

	// Form state
	let email = '';
	let password = '';
	let rememberMe = false;
	let formErrors: Record<string, string> = {};
	let isSubmitting = false;
	let hasSucceeded = false; // Flag to prevent multiple submissions after success

	// Form refs for Carbon validation
	let emailInput: any;
	let passwordInput: any;

	// Enhanced validation rules with prop configuration
	const validateEmail = (email: string): string => {
		if (emailValidation.required && !email) return 'Email is required';
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
		if (emailValidation.customValidator) {
			const customError = emailValidation.customValidator(email);
			if (customError) return customError;
		}
		return '';
	};

	const validatePassword = (password: string): string => {
		if (passwordValidation.required && !password) return 'Password is required';
		if (password && password.length < passwordValidation.minLength) {
			return `Password must be at least ${passwordValidation.minLength} characters`;
		}
		if (passwordValidation.customValidator) {
			const customError = passwordValidation.customValidator(password);
			if (customError) return customError;
		}
		return '';
	};

	// Accessibility helper for announcements
	function announceToScreenReader(message: string) {
		if (!accessibility.announceValidation) return;

		const announcement = document.createElement('div');
		announcement.setAttribute('aria-live', 'polite');
		announcement.setAttribute('aria-atomic', 'true');
		announcement.className = 'sr-only';
		announcement.textContent = message;

		document.body.appendChild(announcement);

		setTimeout(() => {
			document.body.removeChild(announcement);
		}, 1000);
	}

	// Enhanced form validation with event dispatch
	const validateForm = (): boolean => {
		const previousErrors = { ...formErrors };
		formErrors = {};

		const emailError = validateEmail(email);
		const passwordError = validatePassword(password);

		if (emailError) formErrors.email = emailError;
		if (passwordError) formErrors.password = passwordError;

		const isValid = Object.keys(formErrors).length === 0;

		// Dispatch validation change if errors changed
		const errorsChanged = JSON.stringify(previousErrors) !== JSON.stringify(formErrors);
		if (errorsChanged) {
			onValidationChange?.(isValid);
			dispatch('validationChange', { isValid, errors: formErrors });

			if (accessibility.announceValidation && Object.keys(formErrors).length > 0) {
				const errorCount = Object.keys(formErrors).length;
				announceToScreenReader(
					`Form has ${errorCount} validation error${errorCount === 1 ? '' : 's'}`
				);
			}
		}

		return isValid;
	};

	// Enhanced form submission with custom handler support
	const handleSubmit = async (event: Event) => {
		event.preventDefault();

		// Prevent multiple submissions
		if (isSubmitting || hasSucceeded || disabled || loading || !validateForm()) return;

		isSubmitting = true;
		authActions.setError(null);

		const credentials: LoginCredentials = {
			email,
			password,
			rememberMe: showRememberMe ? rememberMe : undefined
		};

		// Announce submission start
		if (accessibility.announceSubmission) {
			announceToScreenReader('Submitting login form');
		}

		// Dispatch submit event
		dispatch('submit', { credentials });

		try {
			let success = false;

			// Use custom submit handler if provided, otherwise use default auth
			if (onSubmit) {
				success = await onSubmit(credentials);
			} else {
				success = await authActions.login(email, password, rememberMe);
			}

			if (success) {
				hasSucceeded = true; // Prevent further submissions
				const user = { email }; // Basic user object

				onSuccess?.(user);
				dispatch('success', { user });

				if (accessibility.announceSubmission) {
					announceToScreenReader('Login successful');
				}
			} else {
				// Error will be set in the auth store, we can read it from $authError
				const errorMessage = $authError || 'Login failed';
				onError?.(errorMessage);
				dispatch('error', { message: errorMessage });

				if (accessibility.announceSubmission) {
					announceToScreenReader(`Login failed: ${errorMessage}`);
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An unexpected error occurred';
			onError?.(message);
			dispatch('error', { message });

			if (accessibility.announceSubmission) {
				announceToScreenReader(`Login error: ${message}`);
			}
		} finally {
			isSubmitting = false;
		}
	};

	// Handle input changes with validation
	const handleEmailChange = (event: CustomEvent) => {
		email = event.detail;
		if (formErrors.email) {
			const error = validateEmail(email);
			if (!error) delete formErrors.email;
			else formErrors.email = error;
		}
	};

	const handlePasswordChange = (event: CustomEvent) => {
		password = event.detail;
		if (formErrors.password) {
			const error = validatePassword(password);
			if (!error) delete formErrors.password;
			else formErrors.password = error;
		}
	};

	// Handle blur events for validation
	const handleEmailBlur = () => {
		const error = validateEmail(email);
		if (error) formErrors.email = error;
	};

	const handlePasswordBlur = () => {
		const error = validatePassword(password);
		if (error) formErrors.password = error;
	};

	// Reactive validation state for Carbon components
	$: emailInvalid = !!formErrors.email;
	$: passwordInvalid = !!formErrors.password;
	$: formInvalid = emailInvalid || passwordInvalid || !email || !password;
</script>

<div
	class="carbon-login-form"
	role="region"
	aria-label={accessibility.formLabel}
	data-testid="carbon-login-form"
>
	<div class="carbon-login-header">
		<h1 class="carbon-login-title">{title}</h1>
		<p class="carbon-login-subtitle">{subtitle}</p>
	</div>

	<!-- Global Error Message -->
	{#if $authError}
		<InlineNotification
			kind="error"
			title="Authentication Error"
			subtitle={$authError}
			hideCloseButton={false}
			on:close={() => authActions.setError(null)}
		/>
	{/if}

	<Form on:submit={handleSubmit} novalidate>
		<!-- Email Field -->
		<FormGroup legendText="">
			<TextInput
				id="email"
				name="email"
				labelText="Email address"
				placeholder="Enter your email"
				type="email"
				autocomplete="email"
				required
				bind:value={email}
				invalid={emailInvalid}
				invalidText={formErrors.email}
				disabled={isSubmitting || $isLoading || disabled || loading}
				on:input={handleEmailChange}
				on:blur={handleEmailBlur}
				bind:ref={emailInput}
			>
				<Email slot="icon" />
			</TextInput>
		</FormGroup>

		<!-- Password Field -->
		<FormGroup legendText="">
			<PasswordInput
				id="password"
				name="password"
				labelText="Password"
				placeholder="Enter your password"
				autocomplete="current-password"
				required
				bind:value={password}
				invalid={passwordInvalid}
				invalidText={formErrors.password}
				disabled={isSubmitting || $isLoading || disabled || loading}
				on:input={handlePasswordChange}
				on:blur={handlePasswordBlur}
				bind:ref={passwordInput}
				showPasswordLabel="Show password"
				hidePasswordLabel="Hide password"
			/>
		</FormGroup>

		<!-- Remember Me & Forgot Password -->
		{#if showRememberMe || showForgotPassword}
			<div class="carbon-form-options">
				{#if showRememberMe}
					<Checkbox
						id="remember-me"
						labelText="Remember me"
						bind:checked={rememberMe}
						disabled={isSubmitting || $isLoading || disabled || loading}
					/>
				{/if}

				{#if showForgotPassword}
					<Link href={forgotPasswordUrl}>Forgot your password?</Link>
				{/if}
			</div>
		{/if}

		<!-- Submit Button -->
		<div class="carbon-submit-section">
			<Button
				type="submit"
				size="field"
				disabled={isSubmitting || $isLoading || hasSucceeded || formInvalid || disabled || loading}
				class="carbon-submit-button"
			>
				{#if isSubmitting || $isLoading || loading}
					<Loading withOverlay={false} small />
					Signing in...
				{:else}
					Sign in
				{/if}
			</Button>
		</div>

		<!-- Sign Up Link -->
		{#if showSignUp}
			<div class="carbon-signup-section">
				<p class="carbon-signup-text">
					Don't have an account?
					<Link href={signUpUrl}>Contact HR to get started</Link>
				</p>
			</div>
		{/if}
	</Form>
</div>

<style>
	.carbon-login-form {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		padding: var(--cds-spacing-07);
	}

	.carbon-login-header {
		text-align: center;
		margin-bottom: var(--cds-spacing-07);
	}

	.carbon-login-title {
		font-size: var(--cds-productive-heading-04-font-size);
		font-weight: var(--cds-productive-heading-04-font-weight);
		line-height: var(--cds-productive-heading-04-line-height);
		letter-spacing: var(--cds-productive-heading-04-letter-spacing);
		color: var(--cds-text-primary);
		margin-bottom: var(--cds-spacing-03);
	}

	.carbon-login-subtitle {
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
		color: var(--cds-text-secondary);
		margin-bottom: 0;
	}

	.carbon-form-options {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: var(--cds-spacing-05) 0;
		gap: var(--cds-spacing-05);
	}

	.carbon-submit-section {
		margin: var(--cds-spacing-06) 0;
	}

	:global(.carbon-submit-button) {
		width: 100%;
	}

	.carbon-signup-section {
		text-align: center;
		margin-top: var(--cds-spacing-06);
	}

	.carbon-signup-text {
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
		color: var(--cds-text-secondary);
		margin: 0;
	}

	/* Form spacing adjustments */
	:global(.carbon-login-form .bx--form-group) {
		margin-bottom: var(--cds-spacing-05);
	}

	:global(.carbon-login-form .bx--text-input-wrapper),
	:global(.carbon-login-form .bx--password-input-wrapper) {
		margin-bottom: 0;
	}

	/* Error notification spacing */
	:global(.carbon-login-form .bx--inline-notification) {
		margin-bottom: var(--cds-spacing-06);
	}

	/* Loading animation positioning */
	:global(.carbon-submit-button .bx--loading--small) {
		margin-right: var(--cds-spacing-03);
	}

	/* Screen reader only content */
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.carbon-login-form {
			padding: var(--cds-spacing-05);
			max-width: none;
		}

		.carbon-form-options {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--cds-spacing-03);
		}
	}

	/* Focus states for better accessibility */
	:global(.carbon-login-form .bx--text-input:focus),
	:global(.carbon-login-form .bx--password-input:focus) {
		outline: 2px solid var(--cds-focus);
		outline-offset: -2px;
	}

	/* Loading state for submit button */
	:global(.carbon-submit-button[disabled]) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Form field improvements */
	:global(.carbon-login-form .bx--text-input),
	:global(.carbon-login-form .bx--password-input) {
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
	}

	:global(.carbon-login-form .bx--label) {
		font-size: var(--cds-body-short-02-font-size);
		font-weight: var(--cds-body-short-02-font-weight);
		margin-bottom: var(--cds-spacing-03);
	}

	:global(.carbon-login-form .bx--checkbox-label) {
		font-size: var(--cds-body-short-01-font-size);
		line-height: var(--cds-body-short-01-line-height);
	}

	/* Link styling */
	:global(.carbon-login-form .bx--link) {
		font-size: var(--cds-body-short-01-font-size);
	}

	/* Button styling */
	:global(.carbon-submit-button) {
		height: var(--cds-spacing-09);
		font-size: var(--cds-body-short-02-font-size);
		font-weight: var(--cds-body-short-02-font-weight);
	}

	/* Enhanced accessibility focus states */
	:global(.carbon-login-form .bx--btn:focus) {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.carbon-login-title {
			color: var(--cds-text-primary);
			font-weight: var(--cds-font-weight-semibold);
		}

		:global(.carbon-login-form .bx--text-input),
		:global(.carbon-login-form .bx--password-input) {
			border: 2px solid var(--cds-border-strong);
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		:global(.carbon-login-form .bx--loading) {
			animation: none;
		}

		:global(.carbon-login-form .bx--btn) {
			transition: none;
		}
	}
</style>
