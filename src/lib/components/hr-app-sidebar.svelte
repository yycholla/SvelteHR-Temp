<script lang="ts">
  import {
    Users,
    Building2,
    Calendar,
    Settings,
    User,
    Home,
    Shield,
    FileText,
    TrendingUp,
    UserCheck
  } from "lucide-svelte";
  import NavMain from "./nav-main.svelte";
  import NavDocuments from "./nav-documents.svelte";
  import NavSecondary from "./nav-secondary.svelte";
  import NavUser from "./nav-user.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { currentUser, hasRole } from '$lib/stores/auth';
  import type { ComponentProps } from "svelte";

  // HR-specific navigation data
  const hrData = $derived(() => {
    const user = $currentUser;
    const isAdmin = hasRole('admin');
    const isHR = hasRole('hr_admin') || isAdmin;
    const isManager = hasRole('manager') || isHR;

    return {
      user: user ? {
        name: user.display_name || 'User',
        email: user.email || 'user@example.com',
        avatar: user.profileImage || '',
      } : {
        name: 'User',
        email: 'user@example.com',
        avatar: '',
      },
      navMain: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: Home,
        },
        {
          title: "Employees",
          url: "/dashboard/employees",
          icon: Users,
          items: [
            { title: "All Employees", url: "/dashboard/employees" },
            { title: "Add Employee", url: "/dashboard/employees/new" },
            { title: "Directory", url: "/dashboard/employees/directory" }
          ]
        },
        {
          title: "Departments",
          url: "/dashboard/departments",
          icon: Building2,
          items: [
            { title: "All Departments", url: "/dashboard/departments" },
            { title: "Create Department", url: "/dashboard/departments/new" }
          ]
        },
        {
          title: "Leave & Attendance",
          url: "/dashboard/leave",
          icon: Calendar,
          items: [
            { title: "My Attendance", url: "/dashboard/attendance/my" },
            { title: "Leave Requests", url: "/dashboard/leave/requests" },
            { title: "Submit Leave", url: "/dashboard/leave/new" }
          ]
        }
      ],
      navDocuments: [
        {
          name: "Employee Reports",
          url: "/reports/employees",
          icon: FileText,
        },
        {
          name: "Performance Analytics",
          url: "/analytics/performance",
          icon: TrendingUp,
        },
        {
          name: "Compliance Center",
          url: "/compliance",
          icon: UserCheck,
        },
      ],
      navSecondary: [
        ...(isAdmin ? [{
          title: "Administration",
          url: "/dashboard/admin",
          icon: Shield,
        }] : []),
        {
          title: "Settings",
          url: "/settings",
          icon: Settings,
        },
        {
          title: "Profile",
          url: "/profile",
          icon: User,
        },
      ]
    };
  });

  let { ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<div class="h-full flex flex-col bg-sidebar text-sidebar-foreground">
  <!-- Header -->
  <div class="p-4">
    <a href="/dashboard" class="flex items-center gap-2 font-semibold">
      <Building2 class="h-5 w-5" />
      <span class="text-base">SvelteHR</span>
    </a>
  </div>

  <!-- Navigation -->
  <div class="flex-1 overflow-auto p-4">
    <nav class="space-y-6">
      <!-- Main Navigation -->
      <div>
        <h3 class="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-3">
          Main
        </h3>
        <ul class="space-y-1">
          {#each hrData.navMain as item}
            <li>
              <a
                href={item.url}
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <svelte:component this={item.icon} class="h-4 w-4" />
                {item.title}
              </a>
              {#if item.items && item.items.length > 0}
                <ul class="ml-7 mt-1 space-y-1">
                  {#each item.items as subItem}
                    <li>
                      <a
                        href={subItem.url}
                        class="block px-3 py-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                      >
                        {subItem.title}
                      </a>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      </div>

      <!-- Documents -->
      <div>
        <h3 class="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-3">
          Reports
        </h3>
        <ul class="space-y-1">
          {#each hrData.navDocuments as item}
            <li>
              <a
                href={item.url}
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <svelte:component this={item.icon} class="h-4 w-4" />
                {item.name}
              </a>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Secondary -->
      <div>
        <h3 class="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider mb-3">
          System
        </h3>
        <ul class="space-y-1">
          {#each hrData.navSecondary as item}
            <li>
              <a
                href={item.url}
                class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <svelte:component this={item.icon} class="h-4 w-4" />
                {item.title}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </nav>
  </div>

  <!-- Footer -->
  {#if $currentUser && hrData.user}
    <div class="p-4 border-t border-border">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User class="h-4 w-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{hrData.user.name}</p>
          <p class="text-xs text-sidebar-foreground/70 truncate">{hrData.user.email}</p>
        </div>
      </div>
    </div>
  {/if}
</div>