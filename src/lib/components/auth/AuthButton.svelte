<!--
  RBAC-aware button component
  Conditionally renders buttons based on user permissions
-->
<script lang="ts">
  import { isAuthenticated, currentUser } from '$lib/stores/auth';
  import { hasAccess, canAccess } from '$lib/auth/guards';
  import type { PermissionCheck } from '$lib/auth/guards';

  // Props
  export let permissions: string[] = [];
  export let roles: string[] = [];
  export let requireAll = false;
  export let disabled = false;
  export let variant: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'warning' | 'danger' = 'primary';
  export let size: 'sm' | 'base' | 'lg' = 'base';
  export let href: string | undefined = undefined;

  // Build permission check
  $: permissionCheck: PermissionCheck = {
    permissions: permissions.length > 0 ? permissions : undefined,
    roles: roles.length > 0 ? roles : undefined,
    requireAll
  };

  // Check if user has access
  $: hasRequiredAccess = permissions.length === 0 && roles.length === 0 
    ? $isAuthenticated  // No restrictions, just need to be authenticated
    : canAccess(permissionCheck);

  // Style variants
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white border-transparent',
    secondary: 'bg-surface-100 hover:bg-surface-200 text-surface-900 border-surface-300',
    tertiary: 'bg-tertiary-600 hover:bg-tertiary-700 text-white border-transparent',
    ghost: 'bg-transparent hover:bg-surface-100 text-surface-700 border-transparent',
    warning: 'bg-warning-600 hover:bg-warning-700 text-white border-transparent',
    danger: 'bg-error-600 hover:bg-error-700 text-white border-transparent'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    base: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  $: buttonClass = `
    inline-flex items-center justify-center rounded-lg font-medium 
    border transition-colors duration-200 
    ${variants[variant]}
    ${sizes[size]}
    ${disabled || !hasRequiredAccess ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${$$props.class || ''}
  `.trim();

  function handleClick(event: MouseEvent) {
    if (disabled || !hasRequiredAccess) {
      event.preventDefault();
      return;
    }
    // Let the click event bubble up normally
  }
</script>

{#if hasRequiredAccess}
  {#if href}
    <a 
      {href} 
      class={buttonClass}
      class:pointer-events-none={disabled}
      on:click={handleClick}
      {...$$restProps}
    >
      <slot />
    </a>
  {:else}
    <button 
      type="button"
      class={buttonClass}
      {disabled}
      on:click={handleClick}
      {...$$restProps}
    >
      <slot />
    </button>
  {/if}
{/if}

<!-- 
Usage Examples:

Admin-only button:
<AuthButton roles={['admin']} on:click={handleAdminAction}>
  Admin Settings
</AuthButton>

Permission-based action:
<AuthButton permissions={['write:employees']} variant="primary" on:click={createEmployee}>
  Add Employee
</AuthButton>

Link with role restriction:
<AuthButton roles={['hr', 'manager']} href="/reports" variant="secondary">
  View Reports
</AuthButton>

Complex permissions:
<AuthButton 
  roles={['manager']} 
  permissions={['write:performance']} 
  requireAll 
  variant="tertiary"
  on:click={startReview}
>
  Start Performance Review
</AuthButton>
-->