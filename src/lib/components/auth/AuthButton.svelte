<!--
  RBAC-aware button component
  Conditionally renders buttons based on user permissions
-->
<script lang="ts">
	import { isAuthenticated, currentUser, hasCurrentUserPermission, hasCurrentUserRole } from '$lib/stores/auth.svelte';

	// Props using Svelte 5 $props
	interface Props {
		permissions?: string[];
		roles?: string[];
		requireAll?: boolean;
		disabled?: boolean;
		variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'warning' | 'danger';
		size?: 'sm' | 'base' | 'lg';
		href?: string;
		class?: string;
		[key: string]: any;
	}
	
	let {
		permissions = [],
		roles = [],
		requireAll = false,
		disabled = false,
		variant = 'primary',
		size = 'base',
		href,
		class: className,
		children,
		...restProps
	}: Props = $props();

	// Check if user has access using $derived
	const hasRequiredAccess = $derived(() => {
		// If no restrictions, just need to be authenticated
		if (permissions.length === 0 && roles.length === 0) {
			return $isAuthenticated;
		}

		// Check permissions
		const hasPermissions = permissions.length === 0 || 
			(requireAll 
				? permissions.every(permission => $hasCurrentUserPermission(permission))
				: permissions.some(permission => $hasCurrentUserPermission(permission))
			);

		// Check roles
		const hasRoles = roles.length === 0 || 
			(requireAll 
				? roles.every(role => $hasCurrentUserRole(role as any))
				: roles.some(role => $hasCurrentUserRole(role as any))
			);

		// If requireAll is true, need both permissions and roles (if specified)
		// If requireAll is false, need either permissions or roles (if specified)
		return requireAll ? hasPermissions && hasRoles : hasPermissions || hasRoles;
	});

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

	// Button class using $derived
	const buttonClass = $derived(() => `
    inline-flex items-center justify-center rounded-lg font-medium 
    border transition-colors duration-200 
    ${variants[variant]}
    ${sizes[size]}
    ${disabled || !hasRequiredAccess() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className || ''}
  `.trim());

	function handleClick(event: MouseEvent) {
		if (disabled || !hasRequiredAccess()) {
			event.preventDefault();
			return;
		}
		// Let the click event bubble up normally
	}
</script>

{#if hasRequiredAccess()}
	{#if href}
		<a
			{href}
			class={buttonClass()}
			class:pointer-events-none={disabled}
			onclick={handleClick}
			{...restProps}
		>
			{@render children?.()}
		</a>
	{:else}
		<button type="button" class={buttonClass()} {disabled} onclick={handleClick} {...restProps}>
			{@render children?.()}
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
