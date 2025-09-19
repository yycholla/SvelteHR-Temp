# Quickstart Guide: shadcn-svelte Migration

**Feature**: Migration from Carbon Design to shadcn-svelte UI System
**Date**: 2025-09-18
**Estimated Time**: 30 minutes for initial setup + testing

## Prerequisites

- Node.js 20+ installed
- Existing SvelteHR project running
- Basic familiarity with SvelteKit and TailwindCSS
- Access to the development environment

## Quick Setup (5 minutes)

### 1. Install shadcn-svelte CLI

```bash
cd /home/chanway/Projects/SvelteHR
pnpm dlx shadcn-svelte@latest init
```

**Configuration choices**:

- Base color: `Slate`
- Global CSS: `src/app.css`
- Import alias prefix: `$lib`
- Use CSS variables: `Yes`

### 2. Install Core Components

```bash
# Layout components
pnpm dlx shadcn-svelte@latest add sidebar button card

# Data components
pnpm dlx shadcn-svelte@latest add data-table input label

# Form components
pnpm dlx shadcn-svelte@latest add form select checkbox
```

### 3. Configure TailwindCSS

The shadcn-svelte init automatically updates your `tailwind.config.js`. Verify it includes:

```javascript
// tailwind.config.js
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				primary: 'hsl(var(--primary))'
				// ... other shadcn colors
			}
		}
	}
};
```

## Create Basic Layout (10 minutes)

### 1. Create New Layout Component

Create `/src/lib/components/layout/ShadcnLayout.svelte`:

```svelte
<script lang="ts">
	import { Sidebar } from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { Home, Users, Building, Calendar } from 'lucide-svelte';

	let { children, user } = $props();

	const navigationItems = [
		{ id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Home },
		{ id: 'employees', label: 'Employees', href: '/employees', icon: Users },
		{ id: 'departments', label: 'Departments', href: '/departments', icon: Building },
		{ id: 'leave', label: 'Leave & Attendance', href: '/leave', icon: Calendar }
	];
</script>

<Sidebar.Provider>
	<div class="flex h-screen bg-background">
		<!-- Sidebar -->
		<Sidebar.Root class="border-r">
			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupLabel>HR Management</Sidebar.GroupLabel>
					<Sidebar.Menu>
						{#each navigationItems as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton asChild>
									<a href={item.href} class="flex items-center gap-2">
										<svelte:component this={item.icon} class="h-4 w-4" />
										{item.label}
									</a>
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.Group>
			</Sidebar.Content>
		</Sidebar.Root>

		<!-- Main Content -->
		<div class="flex flex-1 flex-col">
			<!-- Header -->
			<header class="border-b bg-background px-6 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<Sidebar.Trigger />
						<h1 class="text-xl font-semibold">SvelteHR</h1>
					</div>

					<div class="flex items-center gap-4">
						<Button variant="outline" size="sm">
							{user?.name || 'User'}
						</Button>
					</div>
				</div>
			</header>

			<!-- Page Content -->
			<main class="flex-1 overflow-auto p-6">
				{@render children()}
			</main>
		</div>
	</div>
</Sidebar.Provider>
```

### 2. Update Dashboard Page

Update `/src/routes/dashboard/+page.svelte`:

```svelte
<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Users, Building, Calendar, TrendingUp } from 'lucide-svelte';
	import ShadcnLayout from '$lib/components/layout/ShadcnLayout.svelte';
	import { currentUser } from '$lib/stores/auth';
</script>

<ShadcnLayout user={$currentUser}>
	<div class="space-y-6">
		<!-- Page Header -->
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground">
				Welcome back, {$currentUser?.name || 'User'}!
			</p>
		</div>

		<!-- Metrics Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Employees</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">127</div>
					<p class="text-xs text-muted-foreground">
						<Badge variant="secondary" class="text-green-600">+5</Badge>
						this month
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Departments</Card.Title>
					<Building class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">8</div>
					<p class="text-xs text-muted-foreground">No change</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Pending Requests</Card.Title>
					<Calendar class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">12</div>
					<p class="text-xs text-muted-foreground">
						<Badge variant="outline" class="text-orange-600">+3</Badge>
						from yesterday
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Attendance Rate</Card.Title>
					<TrendingUp class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">95%</div>
					<p class="text-xs text-muted-foreground">
						<Badge variant="secondary" class="text-green-600">+2%</Badge>
						from last week
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Recent Activity -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent Activity</Card.Title>
				<Card.Description>Latest HR events and updates</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						<div class="flex-1">
							<p class="text-sm">John Smith completed onboarding</p>
							<p class="text-xs text-muted-foreground">2 hours ago</p>
						</div>
					</div>
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-blue-500"></div>
						<div class="flex-1">
							<p class="text-sm">Leave request submitted</p>
							<p class="text-xs text-muted-foreground">4 hours ago</p>
						</div>
					</div>
					<div class="flex items-center space-x-4">
						<div class="h-2 w-2 rounded-full bg-orange-500"></div>
						<div class="flex-1">
							<p class="text-sm">Department guidelines updated</p>
							<p class="text-xs text-muted-foreground">1 day ago</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</ShadcnLayout>
```

## Test the Implementation (10 minutes)

### 1. Start Development Server

```bash
npm run dev
```

### 2. Visual Verification Checklist

Navigate to `http://localhost:5173/dashboard` and verify:

- [ ] **Sidebar appears** with navigation items
- [ ] **Header shows** with sidebar toggle and user info
- [ ] **Sidebar toggle works** (collapses/expands sidebar)
- [ ] **Keyboard shortcut works** (Cmd/Ctrl + B toggles sidebar)
- [ ] **Navigation links work** (clicking items navigates)
- [ ] **Cards display correctly** with metrics and proper spacing
- [ ] **Typography follows** shadcn design system
- [ ] **Colors match** shadcn theme (not Carbon colors)
- [ ] **Hover effects work** on interactive elements
- [ ] **Responsive design** works on mobile (sidebar overlay)

### 3. Accessibility Testing

- [ ] **Tab navigation** works through all interactive elements
- [ ] **Screen reader** can access all content
- [ ] **Sidebar has** proper ARIA labels
- [ ] **Cards have** appropriate semantic structure
- [ ] **Focus indicators** are visible

### 4. Performance Check

```bash
npm run build
```

- [ ] **Build succeeds** without errors
- [ ] **Bundle size** is reasonable (check network tab)
- [ ] **Tree-shaking** removes unused components

## Component Documentation Examples (5 minutes)

### Sidebar Component Usage

```svelte
<script>
	import { Sidebar } from '$lib/components/ui/sidebar';
</script>

<!-- Basic sidebar with keyboard shortcuts -->
<Sidebar.Provider>
	<Sidebar.Root>
		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton asChild>
							<a href="/dashboard">Dashboard</a>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.Group>
		</Sidebar.Content>
	</Sidebar.Root>
</Sidebar.Provider>
```

### Card Component Usage

```svelte
<script>
	import { Card } from '$lib/components/ui/card';
</script>

<!-- Metric card with icon and badge -->
<Card.Root>
	<Card.Header>
		<Card.Title>Employee Count</Card.Title>
		<Card.Description>Total active employees</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="text-2xl font-bold">127</div>
	</Card.Content>
	<Card.Footer>
		<Badge variant="secondary">+5 this month</Badge>
	</Card.Footer>
</Card.Root>
```

### Data Table Usage (Preview)

```svelte
<script>
	import { DataTable } from '$lib/components/ui/data-table';

	const columns = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'role', header: 'Role' },
		{ accessorKey: 'department', header: 'Department' }
	];

	const employees = [{ name: 'John Doe', role: 'Developer', department: 'Engineering' }];
</script>

<DataTable data={employees} {columns} />
```

## Next Steps

After completing this quickstart:

1. **Migrate additional pages** using the same layout pattern
2. **Implement data tables** for employee and department listings
3. **Convert forms** to use shadcn form components
4. **Add theming** support for light/dark modes
5. **Optimize performance** with proper component imports

## Troubleshooting

### Common Issues

**Sidebar not showing**: Ensure `Sidebar.Provider` wraps the entire layout

**Styling not applied**: Check that TailwindCSS is properly configured with shadcn classes

**Icons missing**: Install `lucide-svelte` for icon components

**TypeScript errors**: Ensure all component imports are correct

### Performance Issues

**Slow dev server**: Import components selectively rather than importing entire library

**Large bundle size**: Use tree-shaking and check import statements

## Success Criteria

This quickstart is successful when:

- [ ] New shadcn layout renders correctly
- [ ] All interactive elements work as expected
- [ ] Performance meets requirements (<200ms page loads)
- [ ] Accessibility standards are maintained
- [ ] Visual design matches modern shadcn patterns
- [ ] Component documentation is clear and usable

This provides a foundation for the full migration from Carbon Design System to shadcn-svelte while maintaining all existing HR functionality.
