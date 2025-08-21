<!--
  Role-based visibility component
  Shows content only if user has required roles or permissions
-->
<script lang="ts">
  import { isAuthenticated, currentUser } from '$lib/stores/auth';
  import { hasAccess } from '$lib/auth/guards';
  import type { PermissionCheck } from '$lib/auth/guards';

  // Props
  export let permissions: string[] = [];
  export let roles: string[] = [];
  export let requireAll = false;
  export let fallback = false; // Show alternative content if access denied
  export let loading = false; // Show loading state

  // Build permission check
  $: permissionCheck: PermissionCheck = {
    permissions: permissions.length > 0 ? permissions : undefined,
    roles: roles.length > 0 ? roles : undefined,
    requireAll
  };

  // Check if user has access
  $: hasRequiredAccess = $isAuthenticated && hasAccess($currentUser, permissionCheck);
  $: showContent = hasRequiredAccess;
  $: showFallback = fallback && !hasRequiredAccess && $isAuthenticated;
</script>

{#if loading}
  <!-- Loading state -->
  <div class="flex items-center justify-center p-4">
    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
    <span class="ml-2 text-sm text-surface-500">Loading...</span>
  </div>
{:else if showContent}
  <!-- Content for authorized users -->
  <slot />
{:else if showFallback}
  <!-- Fallback content for unauthorized but authenticated users -->
  <slot name="fallback">
    <div class="text-center p-4 bg-warning-50 border border-warning-200 rounded-lg">
      <p class="text-warning-700 text-sm">
        You don't have permission to view this content.
      </p>
    </div>
  </slot>
{/if}

<!-- 
Usage Examples:

Basic role check:
<RoleGuard roles={['admin', 'hr']}>
  <AdminPanel />
</RoleGuard>

Permission check with fallback:
<RoleGuard permissions={['read:employees']} fallback>
  <EmployeeList />
  <svelte:fragment slot="fallback">
    <p>Contact HR to access employee data</p>
  </svelte:fragment>
</RoleGuard>

Multiple requirements (all must be met):
<RoleGuard roles={['manager']} permissions={['write:reports']} requireAll>
  <ReportEditor />
</RoleGuard>
-->