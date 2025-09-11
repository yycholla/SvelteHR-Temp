<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth, isLoggedIn } from '$lib/services/auth';
  import Button from '$lib/components/base/Button.svelte';
  import Input from '$lib/components/base/Input.svelte';
  import Card from '$lib/components/base/Card.svelte';
  import { validateForm } from '$lib/utils/validation';

  let formData = {
    email: '',
    password: ''
  };

  let loading = false;
  let error: string | null = null;
  let validationErrors: Record<string, string> = {};

  // Validation rules
  const validationRules = {
    email: { required: true, email: true },
    password: { required: true, minLength: 1 }
  };

  // Redirect if already logged in
  onMount(() => {
    if ($isLoggedIn) {
      goto('/dashboard');
    }
  });

  // Validate form when data changes
  $: {
    const result = validateForm(formData, validationRules);
    validationErrors = result.errors;
  }

  async function handleLogin() {
    try {
      loading = true;
      error = null;

      await auth.login(formData.email, formData.password);
      
      // Redirect to dashboard on successful login
      goto('/dashboard');
    } catch (err: any) {
      error = err.message || 'Login failed. Please check your credentials.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !loading) {
      handleLogin();
    }
  }
</script>

<svelte:head>
  <title>Login - MountainHR</title>
  <meta name="description" content="Sign in to your MountainHR account" />
</svelte:head>

<div class="login-page">
  <div class="login-container">
    <!-- Logo and Header -->
    <div class="login-header">
      <div class="login-logo">
        <img src="/logo.svg" alt="MountainHR" class="login-logo__image" />
        <h1 class="login-logo__text">MountainHR</h1>
      </div>
      <p class="login-subtitle">
        Sign in to your account to continue
      </p>
    </div>

    <!-- Login Form -->
    <Card padding="lg" class="login-card">
      <form on:submit|preventDefault={handleLogin} class="login-form">
        <div class="form-fields">
          <div class="form-field">
            <Input
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              bind:value={formData.email}
              errorText={validationErrors.email}
              required
              fullWidth
              leftIcon="mail"
              on:keydown={handleKeydown}
            />
          </div>

          <div class="form-field">
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              bind:value={formData.password}
              errorText={validationErrors.password}
              required
              fullWidth
              leftIcon="lock"
              on:keydown={handleKeydown}
            />
          </div>
        </div>

        {#if error}
          <div class="error-message">
            <div class="error-icon">
              <i class="icon-alert-circle"></i>
            </div>
            <span class="error-text">{error}</span>
          </div>
        {/if}

        <div class="form-actions">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            {loading}
            disabled={loading || !formData.email || !formData.password}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </div>

        <div class="form-footer">
          <div class="forgot-password">
            <a href="/forgot-password" class="forgot-password__link">
              Forgot your password?
            </a>
          </div>
        </div>
      </form>
    </Card>

    <!-- Footer -->
    <div class="login-footer">
      <p class="login-footer__text">
        Don't have an account? 
        <a href="/register" class="login-footer__link">
          Contact your administrator
        </a>
      </p>
    </div>
  </div>

  <!-- Demo Credentials (for development) -->
  {#if import.meta.env.DEV}
    <Card padding="md" class="demo-credentials">
      <div class="demo-header">
        <h3 class="demo-title">Demo Credentials</h3>
        <p class="demo-subtitle">Use these credentials for testing</p>
      </div>
      
      <div class="demo-accounts">
        <div class="demo-account">
          <div class="demo-account__role">Administrator</div>
          <div class="demo-account__credentials">
            <code>admin@mountainhr.com</code>
            <code>admin123</code>
          </div>
          <Button
            variant="ghost"
            size="xs"
            on:click={() => {
              formData.email = 'admin@mountainhr.com';
              formData.password = 'admin123';
            }}
          >
            Use These
          </Button>
        </div>

        <div class="demo-account">
          <div class="demo-account__role">HR Manager</div>
          <div class="demo-account__credentials">
            <code>hr@mountainhr.com</code>
            <code>hr123</code>
          </div>
          <Button
            variant="ghost"
            size="xs"
            on:click={() => {
              formData.email = 'hr@mountainhr.com';
              formData.password = 'hr123';
            }}
          >
            Use These
          </Button>
        </div>

        <div class="demo-account">
          <div class="demo-account__role">Employee</div>
          <div class="demo-account__credentials">
            <code>employee@mountainhr.com</code>
            <code>emp123</code>
          </div>
          <Button
            variant="ghost"
            size="xs"
            on:click={() => {
              formData.email = 'employee@mountainhr.com';
              formData.password = 'emp123';
            }}
          >
            Use These
          </Button>
        </div>
      </div>
    </Card>
  {/if}
</div>

<style lang="postcss">
  .login-page {
    @apply min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4;
  }

  .login-container {
    @apply w-full max-w-md space-y-8;
  }

  /* Header */
  .login-header {
    @apply text-center space-y-4;
  }

  .login-logo {
    @apply flex items-center justify-center space-x-3;
  }

  .login-logo__image {
    @apply w-10 h-10;
  }

  .login-logo__text {
    @apply text-3xl font-bold text-gray-900;
  }

  .login-subtitle {
    @apply text-gray-600;
  }

  /* Login Card */
  .login-card {
    @apply shadow-lg;
  }

  .login-form {
    @apply space-y-6;
  }

  .form-fields {
    @apply space-y-4;
  }

  .form-field {
    @apply space-y-1;
  }

  /* Error Message */
  .error-message {
    @apply flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md;
  }

  .error-icon {
    @apply flex-shrink-0 text-red-500;
  }

  .error-icon i {
    @apply w-4 h-4;
  }

  .error-text {
    @apply text-sm text-red-700;
  }

  /* Form Actions */
  .form-actions {
    @apply space-y-4;
  }

  /* Form Footer */
  .form-footer {
    @apply text-center;
  }

  .forgot-password__link {
    @apply text-sm text-blue-600 hover:text-blue-800;
  }

  /* Login Footer */
  .login-footer {
    @apply text-center;
  }

  .login-footer__text {
    @apply text-sm text-gray-600;
  }

  .login-footer__link {
    @apply text-blue-600 hover:text-blue-800;
  }

  /* Demo Credentials */
  .demo-credentials {
    @apply mt-8 border-2 border-dashed border-blue-200 bg-blue-50;
  }

  .demo-header {
    @apply text-center mb-4;
  }

  .demo-title {
    @apply text-lg font-semibold text-blue-900;
  }

  .demo-subtitle {
    @apply text-sm text-blue-700;
  }

  .demo-accounts {
    @apply space-y-3;
  }

  .demo-account {
    @apply flex items-center justify-between p-3 bg-white rounded-md border;
  }

  .demo-account__role {
    @apply text-sm font-medium text-gray-900;
  }

  .demo-account__credentials {
    @apply flex flex-col space-y-1;
  }

  .demo-account__credentials code {
    @apply text-xs bg-gray-100 px-2 py-1 rounded font-mono;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .login-page {
      @apply px-6;
    }

    .login-container {
      @apply max-w-none w-full;
    }

    .demo-account {
      @apply flex-col items-start space-y-2;
    }

    .demo-account__credentials {
      @apply flex-row space-y-0 space-x-2;
    }
  }
</style>