<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // No need for auth checking here - the +layout.ts load function already handles auth validation
  // If we reach this component, the user is authenticated and authorized for admin access

  const mountId = Math.random().toString(36).substr(2, 9);
  console.log(`🟢 Admin layout MOUNTING [${mountId}] - user has admin access`);

  onDestroy(() => {
    console.log(`🔴 Admin layout DESTROYING [${mountId}]`);
  });
</script>

<svelte:head>
  <title>Admin Panel - MountainHR</title>
  <meta name="description" content="Administrative panel for MountainHR system configuration" />
</svelte:head>

<div class="admin-layout">
  <div class="admin-header">
    <div class="container">
      <div class="header-content">
        <div class="breadcrumb">
          <a href="/dashboard" class="breadcrumb-link">Dashboard</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">Admin</span>
        </div>
        <div class="admin-badge">
          <span class="badge-icon">🔧</span>
          <span class="badge-text">Administration Panel</span>
        </div>
      </div>
    </div>
  </div>

  <div class="admin-content">
    <slot />
  </div>
</div>

<style lang="postcss">
  .admin-layout {
    @apply min-h-screen bg-gray-50;
  }

  .admin-header {
    @apply bg-white border-b shadow-sm;
  }

  .container {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
  }

  .header-content {
    @apply flex items-center justify-between py-4;
  }

  .breadcrumb {
    @apply flex items-center text-sm;
  }

  .breadcrumb-link {
    @apply text-blue-600 hover:text-blue-800 transition-colors;
  }

  .breadcrumb-separator {
    @apply mx-2 text-gray-400;
  }

  .breadcrumb-current {
    @apply text-gray-700 font-medium;
  }

  .admin-badge {
    @apply flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm font-medium;
  }

  .badge-icon {
    @apply text-base;
  }

  .admin-content {
    @apply container py-8;
  }
</style>