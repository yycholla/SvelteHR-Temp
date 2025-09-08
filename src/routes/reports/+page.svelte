<script lang="ts">
	import {
		BarChart3,
		Download,
		Filter,
		TrendingUp,
		Users,
		Calendar,
		DollarSign
	} from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Reports - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pt-6 pb-6">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1
					class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-3xl font-bold text-transparent"
				>
					Reports & Analytics
				</h1>
				<p class="mt-1 text-muted-foreground">Insights and analytics for your organization</p>
			</div>

			<div class="flex items-center space-x-3">
				<Button variant="outline" class="rounded-xl">
					<Filter class="mr-2 h-4 w-4" />
					Filter
				</Button>
				<Button class="rounded-xl">
					<Download class="mr-2 h-4 w-4" />
					Export Reports
				</Button>
			</div>
		</div>
	</div>

	<!-- Quick Stats -->
	<div class="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<Card class="rounded-2xl border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
					<Users class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.metrics.totalEmployees}</div>
				<p class="text-xs text-muted-foreground">
					<TrendingUp class="mr-1 inline h-3 w-3" />
					+12% from last month
				</p>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Time Off Requests</CardTitle>
					<Calendar class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.metrics.timeOffRequests}</div>
				<p class="text-xs text-muted-foreground">
					<TrendingUp class="mr-1 inline h-3 w-3" />
					+4 this week
				</p>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Payroll</CardTitle>
					<DollarSign class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					${data.metrics.payrollTotal?.toLocaleString?.() ?? data.metrics.payrollTotal}
				</div>
				<p class="text-xs text-muted-foreground">Monthly total</p>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground"
						>Performance Reviews</CardTitle
					>
					<BarChart3 class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">
					{Math.round((data.metrics.performanceCompletion ?? 0) * 100)}%
				</div>
				<p class="text-xs text-muted-foreground">Completion rate</p>
			</CardContent>
		</Card>
	</div>

	<!-- Charts Section -->
	<div class="mb-8 grid gap-6 lg:grid-cols-2">
		<Card class="rounded-2xl border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader>
				<CardTitle>Employee Growth</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex h-64 items-center justify-center text-muted-foreground">
					<div class="text-center">
						<BarChart3 class="mx-auto mb-2 h-12 w-12" />
						<p>Chart visualization coming soon</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 shadow-xl backdrop-blur-md">
			<CardHeader>
				<CardTitle>Department Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex h-64 items-center justify-center text-muted-foreground">
					<div class="text-center">
						<BarChart3 class="mx-auto mb-2 h-12 w-12" />
						<p>Chart visualization coming soon</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Coming Soon -->
	<div class="rounded-2xl border border-border/40 bg-background/20 p-6 shadow-xl backdrop-blur-md">
		<div class="py-12 text-center">
			<BarChart3 class="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
			<h3 class="mb-2 text-xl font-semibold">Advanced Analytics Coming Soon</h3>
			<p class="mb-6 text-muted-foreground">
				Detailed reports including workforce analytics, attendance tracking, performance metrics,
				and more are currently in development.
			</p>
			<Button class="rounded-xl">
				<Download class="mr-2 h-4 w-4" />
				Download Sample Report
			</Button>
		</div>
	</div>
</div>
