<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authStore, authActions, isLoading, authError } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-svelte';

  /**
   * Login Form Component
   * Handles user authentication with email/password
   */

  const dispatch = createEventDispatcher<{
    success: { user: any };
    error: { message: string };
  }>();

  // Form state
  let email = '';
  let password = '';
  let rememberMe = false;
  let showPassword = false;
  let formErrors: Record<string, string> = {};
  let isSubmitting = false;

  // Validation rules
  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  // Form validation
  const validateForm = (): boolean => {
    formErrors = {};
    
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError) formErrors.email = emailError;
    if (passwordError) formErrors.password = passwordError;
    
    return Object.keys(formErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    isSubmitting = true;
    authActions.setError(null);
    
    try {
      const success = await authActions.login(email, password, rememberMe);
      
      if (success) {
        dispatch('success', { user: { email } });
        goto('/dashboard');
      } else {
        // Error will be set in the auth store, we can read it from $authError
        const errorMessage = $authError || 'Login failed';
        dispatch('error', { message: errorMessage });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      dispatch('error', { message });
    } finally {
      isSubmitting = false;
    }
  };

  // Handle input changes with validation
  const handleEmailChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    email = target.value;
    if (formErrors.email) {
      const error = validateEmail(email);
      if (!error) delete formErrors.email;
      else formErrors.email = error;
    }
  };

  const handlePasswordChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    password = target.value;
    if (formErrors.password) {
      const error = validatePassword(password);
      if (!error) delete formErrors.password;
      else formErrors.password = error;
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    showPassword = !showPassword;
  };
</script>

<div class="w-full max-w-md mx-auto">
  <form on:submit={handleSubmit} class="space-y-6" novalidate>
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-gray-900">Sign in to SvelteHR</h1>
      <p class="mt-2 text-sm text-gray-600">Welcome back! Please sign in to your account.</p>
    </div>

    <!-- Global Error Message -->
    {#if $authError}
      <div class="rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <AlertCircle class="h-5 w-5 text-red-400" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Authentication Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{$authError}</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Email Field -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
        Email address
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Mail class="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="email"
          required
          class="block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors
                 {formErrors.email ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}"
          class:border-red-300={formErrors.email}
          placeholder="Enter your email"
          bind:value={email}
          on:input={handleEmailChange}
          on:blur={() => {
            const error = validateEmail(email);
            if (error) formErrors.email = error;
          }}
          disabled={isSubmitting || $isLoading}
        />
      </div>
      {#if formErrors.email}
        <p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
      {/if}
    </div>

    <!-- Password Field -->
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
        Password
      </label>
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock class="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autocomplete="current-password"
          required
          class="block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors
                 {formErrors.password ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}"
          placeholder="Enter your password"
          bind:value={password}
          on:input={handlePasswordChange}
          on:blur={() => {
            const error = validatePassword(password);
            if (error) formErrors.password = error;
          }}
          disabled={isSubmitting || $isLoading}
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
            on:click={togglePasswordVisibility}
            disabled={isSubmitting || $isLoading}
          >
            {#if showPassword}
              <EyeOff class="h-5 w-5" />
            {:else}
              <Eye class="h-5 w-5" />
            {/if}
          </button>
        </div>
      </div>
      {#if formErrors.password}
        <p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
      {/if}
    </div>

    <!-- Remember Me & Forgot Password -->
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <input
          id="remember-me"
          name="remember-me"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          bind:checked={rememberMe}
          disabled={isSubmitting || $isLoading}
        />
        <label for="remember-me" class="ml-2 block text-sm text-gray-900">
          Remember me
        </label>
      </div>

      <div class="text-sm">
        <a href="/auth/forgot-password" class="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors">
          Forgot your password?
        </a>
      </div>
    </div>

    <!-- Submit Button -->
    <div>
      <button
        type="submit"
        disabled={isSubmitting || $isLoading || Object.keys(formErrors).length > 0}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {#if isSubmitting || $isLoading}
          <Loader2 class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
          Signing in...
        {:else}
          Sign in
        {/if}
      </button>
    </div>

    <!-- Sign Up Link -->
    <div class="text-center">
      <p class="text-sm text-gray-600">
        Don't have an account?
        <a href="/auth/register" class="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors">
          Contact HR to get started
        </a>
      </p>
    </div>
  </form>
</div>

<style>
  /* Custom focus styles for better accessibility */
  input:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  input.border-red-300:focus {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  /* Loading animation for better UX */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>