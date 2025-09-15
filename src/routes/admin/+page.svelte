<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser } from '$lib/services/auth';
  import { permissionsService, userRoles, isAdmin } from '$lib/services/permissionsService';
  import { users } from '$lib/services/userService';
  import Button from '$lib/components/base/Button.svelte';
  import Card from '$lib/components/base/Card.svelte';

  // Check permissions on mount
  onMount(() => {
    if (!$currentUser) {
      goto('/login');
      return;
    }

    // Double-check admin permissions
    if (!permissionsService.isSuperAdmin($currentUser)) {
      goto('/dashboard');
      return;
    }
  });

  // Admin navigation items
  const adminSections = [
    {
      title: 'User & Role Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: '👥',
      href: '/admin/roles',
      permissions: ['system:configure'],
      stats: $users.length || 0,
      statLabel: 'Total Users',
      available: true
    },
    {
      title: 'Performance Monitoring',
      description: 'Monitor application performance and system metrics',
      icon: '📈',
      href: '/admin/monitoring',
      permissions: ['admin:monitoring'],
      stats: 'Real-time',
      statLabel: 'Status',
      available: true
    },
    {
      title: 'System Configuration',
      description: 'Configure system settings and parameters',
      icon: '⚙️',
      href: '/admin/settings',
      permissions: ['system:configure'],
      stats: 'Coming Soon',
      statLabel: 'Status',
      available: false
    },
    {
      title: 'Audit & Logs',
      description: 'View system audit logs and user activity',
      icon: '📊',
      href: '/admin/audit',
      permissions: ['audit:view'],
      stats: 'Coming Soon',
      statLabel: 'Status',
      available: false
    },
    {
      title: 'Data Management',
      description: 'Manage departments, templates, and system data',
      icon: '🗃️',
      href: '/admin/data',
      permissions: ['system:configure'],
      stats: 'Coming Soon',
      statLabel: 'Status',
      available: false
    }
  ];

  // System stats
  $: systemStats = [
    {
      label: 'Total Users',
      value: $users.length || 0,
      change: '+2 this week',
      trend: 'up'
    },
    {
      label: 'Active Sessions',
      value: 'N/A',
      change: 'Real-time',
      trend: 'neutral'
    },
    {
      label: 'System Health',
      value: 'Healthy',
      change: 'All systems operational',
      trend: 'up'
    }
  ];
</script>

<svelte:head>
  <title>Admin Dashboard - MountainHR</title>
  <meta name="description" content="Administrative dashboard for MountainHR system" />
</svelte:head>

<div class="admin-dashboard">
  <!-- Welcome Section -->
  <div class="welcome-section">
    <Card padding="lg" class="welcome-card">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1 class="welcome-title">Admin Dashboard</h1>
          <p class="welcome-description">
            Welcome to the MountainHR administrative panel. Manage system settings, user roles, and monitor system health.
          </p>
          <div class="user-info">
            <span class="user-badge">
              🔒 Logged in as: <strong>{$currentUser?.display_name || 'Administrator'}</strong>
            </span>
            <span class="role-badges">
              {#each $userRoles as role}
                <span class="role-badge">{role}</span>
              {/each}
            </span>
          </div>
        </div>
        <div class="welcome-actions">
          <Button
            variant="secondary"
            leftIcon="arrow-left"
            on:click={() => goto('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </Card>
  </div>

  <!-- System Stats -->
  <div class="stats-section">
    <h2 class="section-title">System Overview</h2>
    <div class="stats-grid">
      {#each systemStats as stat}
        <Card padding="lg" class="stat-card">
          <div class="stat-content">
            <div class="stat-header">
              <span class="stat-label">{stat.label}</span>
              <div class="stat-trend" class:positive={stat.trend === 'up'} class:neutral={stat.trend === 'neutral'}>
                {#if stat.trend === 'up'}
                  📈
                {:else if stat.trend === 'down'}
                  📉
                {:else}
                  ➡️
                {/if}
              </div>
            </div>
            <div class="stat-value">{stat.value}</div>
            <div class="stat-change">{stat.change}</div>
          </div>
        </Card>
      {/each}
    </div>
  </div>

  <!-- Admin Sections -->
  <div class="sections-area">
    <h2 class="section-title">Administrative Functions</h2>
    <div class="sections-grid">
      {#each adminSections as section}
        <Card padding="lg" class="admin-section-card" hover>
          <div class="section-content">
            <div class="section-header">
              <div class="section-icon">{section.icon}</div>
              <div class="section-info">
                <h3 class="section-title">{section.title}</h3>
                <p class="section-description">{section.description}</p>
              </div>
            </div>
            
            <div class="section-stats">
              <div class="section-stat">
                <span class="stat-value">{section.stats}</span>
                <span class="stat-label">{section.statLabel}</span>
              </div>
            </div>

            <div class="section-footer">
              {#if section.available}
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon="arrow-right"
                  on:click={() => goto(section.href)}
                  class="w-full"
                >
                  {#if section.href === '/admin/roles'}
                    Manage Roles
                  {:else if section.href === '/admin/monitoring'}
                    View Metrics
                  {:else}
                    Open
                  {/if}
                </Button>
              {:else}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled
                  class="w-full"
                >
                  Coming Soon
                </Button>
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .admin-dashboard {
    @apply space-y-8;
  }

  /* Welcome Section */
  .welcome-section {
    @apply mb-8;
  }

  .welcome-card {
    @apply bg-gradient-to-r from-blue-600 to-blue-700 text-white;
  }

  .welcome-content {
    @apply flex items-start justify-between;
  }

  .welcome-text {
    @apply space-y-4;
  }

  .welcome-title {
    @apply text-3xl font-bold;
  }

  .welcome-description {
    @apply text-blue-100 text-lg;
  }

  .user-info {
    @apply flex flex-col space-y-2;
  }

  .user-badge {
    @apply text-sm font-medium text-blue-100;
  }

  .role-badges {
    @apply flex flex-wrap gap-2;
  }

  .role-badge {
    @apply px-2 py-1 bg-blue-500 bg-opacity-50 rounded-full text-xs font-medium text-blue-100;
  }

  .welcome-actions {
    @apply flex-shrink-0;
  }

  /* Stats Section */
  .stats-section {
    @apply space-y-4;
  }

  .section-title {
    @apply text-xl font-semibold text-gray-900;
  }

  .stats-grid {
    @apply grid grid-cols-1 md:grid-cols-3 gap-6;
  }

  .stat-card {
    @apply bg-white;
  }

  .stat-content {
    @apply space-y-2;
  }

  .stat-header {
    @apply flex items-center justify-between;
  }

  .stat-label {
    @apply text-sm font-medium text-gray-600;
  }

  .stat-trend {
    @apply text-sm;
  }

  .stat-trend.positive {
    @apply text-green-600;
  }

  .stat-trend.neutral {
    @apply text-gray-600;
  }

  .stat-value {
    @apply text-2xl font-bold text-gray-900;
  }

  .stat-change {
    @apply text-xs text-gray-500;
  }

  /* Sections Area */
  .sections-area {
    @apply space-y-6;
  }

  .sections-grid {
    @apply grid grid-cols-1 md:grid-cols-2 gap-6;
  }

  .admin-section-card {
    @apply bg-white border transition-all duration-200;
  }

  .admin-section-card:hover {
    @apply border-blue-200 shadow-md;
  }

  .section-content {
    @apply space-y-4;
  }

  .section-header {
    @apply flex items-start space-x-4;
  }

  .section-icon {
    @apply text-3xl flex-shrink-0;
  }

  .section-info {
    @apply space-y-1 flex-1;
  }

  .section-title {
    @apply text-lg font-semibold text-gray-900;
  }

  .section-description {
    @apply text-sm text-gray-600;
  }

  .section-stats {
    @apply flex justify-end;
  }

  .section-stat {
    @apply flex flex-col items-end text-right;
  }

  .section-stat .stat-value {
    @apply text-lg font-bold text-blue-600;
  }

  .section-stat .stat-label {
    @apply text-xs text-gray-500;
  }

  .section-footer {
    @apply border-t pt-4;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .welcome-content {
      @apply flex-col space-y-4 items-start;
    }

    .stats-grid {
      @apply grid-cols-1;
    }

    .sections-grid {
      @apply grid-cols-1;
    }

    .section-header {
      @apply flex-col space-x-0 space-y-2 text-center;
    }

    .section-stats {
      @apply justify-center;
    }

    .section-stat {
      @apply items-center text-center;
    }
  }
</style>