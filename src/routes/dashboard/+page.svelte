<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentUser, isAuthenticated, hasRole } from '$lib/stores/auth';
  import ShadcnLayout from '$lib/components/layout/ShadcnLayout.svelte';
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import {
    Users,
    Building2,
    Calendar,
    TrendingUp,
    CheckCircle,
    Clock,
    AlertTriangle,
    ChevronRight
  } from 'lucide-svelte';

  // Check authentication on mount
  onMount(() => {
    // Simple auth check - redirect to login if not authenticated
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }

    console.log('Dashboard mounted, user:', $currentUser);
  });

  // Sample metrics data
  const metrics = [
    {
      title: "Total Employees",
      value: "127",
      change: { value: "+5", type: "increase", period: "this month" },
      icon: Users,
      href: "/employees"
    },
    {
      title: "Departments",
      value: "8",
      change: { value: "No change", type: "neutral", period: "" },
      icon: Building2,
      href: "/departments"
    },
    {
      title: "Pending Requests",
      value: "12",
      change: { value: "+3", type: "warning", period: "from yesterday" },
      icon: Clock,
      href: "/leave/requests"
    },
    {
      title: "Attendance Rate",
      value: "95%",
      change: { value: "+2%", type: "increase", period: "from last week" },
      icon: TrendingUp,
      href: "/attendance"
    }
  ];

  // Sample recent activity data
  const recentActivity = [
    {
      id: 1,
      message: "John Smith completed onboarding",
      timestamp: "2 hours ago",
      type: "success",
      icon: CheckCircle
    },
    {
      id: 2,
      message: "Leave request submitted by Sarah Johnson",
      timestamp: "4 hours ago",
      type: "info",
      icon: Calendar
    },
    {
      id: 3,
      message: "Department guidelines updated",
      timestamp: "1 day ago",
      type: "warning",
      icon: AlertTriangle
    }
  ];

  // Sample tasks data
  const userTasks = [
    "Review 3 pending leave requests",
    "Complete Q4 performance reviews",
    "Update department budget",
    "Schedule team meeting"
  ];
</script>

<svelte:head>
  <title>Dashboard - SvelteHR</title>
  <meta name="description" content="HR management dashboard overview" />
</svelte:head>

{#if $isAuthenticated && $currentUser}
  <ShadcnLayout>
    <!-- Page Header -->
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p class="text-muted-foreground">
          Welcome back, {$currentUser.name || 'User'}!
        </p>
      </div>

      <!-- Metrics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each metrics as metric}
          <Card.Root class="cursor-pointer hover:shadow-md transition-shadow">
            <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
              <Card.Title class="text-sm font-medium">{metric.title}</Card.Title>
              <svelte:component this={metric.icon} class="h-4 w-4 text-muted-foreground" />
            </Card.Header>
            <Card.Content>
              <div class="text-2xl font-bold">{metric.value}</div>
              <div class="flex items-center text-xs text-muted-foreground">
                {#if metric.change.type === 'increase'}
                  <Badge variant="secondary" class="text-green-600 bg-green-50">
                    {metric.change.value}
                  </Badge>
                {:else if metric.change.type === 'warning'}
                  <Badge variant="outline" class="text-orange-600 border-orange-200">
                    {metric.change.value}
                  </Badge>
                {:else}
                  <Badge variant="secondary" class="text-gray-600">
                    {metric.change.value}
                  </Badge>
                {/if}
                {#if metric.change.period}
                  <span class="ml-1">{metric.change.period}</span>
                {/if}
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>

      <!-- Recent Activity and Tasks -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Activity -->
        <Card.Root>
          <Card.Header>
            <div class="flex items-center justify-between">
              <Card.Title>Recent Activity</Card.Title>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <Card.Description>Latest HR events and updates</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-4">
              {#each recentActivity as activity}
                <div class="flex items-start space-x-3">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full {activity.type === 'success' ? 'bg-green-100' : activity.type === 'warning' ? 'bg-orange-100' : 'bg-blue-100'}">
                    <svelte:component this={activity.icon} class="h-3 w-3 {activity.type === 'success' ? 'text-green-600' : activity.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}" />
                  </div>
                  <div class="flex-1 space-y-1">
                    <p class="text-sm font-medium">{activity.message}</p>
                    <p class="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Your Tasks -->
        <Card.Root>
          <Card.Header>
            <div class="flex items-center justify-between">
              <Card.Title>Your Tasks</Card.Title>
              <Button variant="ghost" size="sm">Manage</Button>
            </div>
            <Card.Description>Pending items requiring your attention</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              {#each userTasks as task, index}
                <div class="flex items-center space-x-3">
                  <div class="h-2 w-2 rounded-full bg-primary"></div>
                  <span class="text-sm">{task}</span>
                </div>
              {/each}
            </div>

            <Separator class="my-4" />

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">Task Completion</span>
                <span class="text-muted-foreground">65%</span>
              </div>
              <div class="w-full bg-secondary rounded-full h-2">
                <div class="bg-primary h-2 rounded-full" style="width: 65%"></div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Quick Actions -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Quick Actions</Card.Title>
          <Card.Description>Common HR tasks and operations</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" class="h-auto p-4 flex flex-col items-center gap-2">
              <Users class="h-5 w-5" />
              <div class="text-center">
                <div class="font-medium">Add Employee</div>
                <div class="text-xs text-muted-foreground">Onboard new team member</div>
              </div>
            </Button>

            <Button variant="outline" class="h-auto p-4 flex flex-col items-center gap-2">
              <Calendar class="h-5 w-5" />
              <div class="text-center">
                <div class="font-medium">Submit Leave</div>
                <div class="text-xs text-muted-foreground">Request time off</div>
              </div>
            </Button>

            <Button variant="outline" class="h-auto p-4 flex flex-col items-center gap-2">
              <Building2 class="h-5 w-5" />
              <div class="text-center">
                <div class="font-medium">View Directory</div>
                <div class="text-xs text-muted-foreground">Browse all employees</div>
              </div>
            </Button>

            <Button variant="outline" class="h-auto p-4 flex flex-col items-center gap-2">
              <Building2 class="h-5 w-5" />
              <div class="text-center">
                <div class="font-medium">Create Department</div>
                <div class="text-xs text-muted-foreground">Add new department</div>
              </div>
            </Button>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  </ShadcnLayout>
{:else}
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p class="text-sm text-muted-foreground">Loading dashboard...</p>
    </div>
  </div>
{/if}

