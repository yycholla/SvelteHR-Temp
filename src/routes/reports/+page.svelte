<script lang="ts">
	import { BarChart3, Download, Filter, TrendingUp, Users, Calendar, DollarSign } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
</script>

<svelte:head>
	<title>Reports - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					Reports & Analytics
				</h1>
				<p class="text-muted-foreground mt-1">
					Insights and analytics for your organization
				</p>
			</div>
			
			<div class="flex items-center space-x-3">
				<Button variant="outline" class="rounded-xl">
					<Filter class="h-4 w-4 mr-2" />
					Filter
				</Button>
				<Button class="rounded-xl">
					<Download class="h-4 w-4 mr-2" />
					Export Reports
				</Button>
			</div>
		</div>
	</div>

	<!-- Quick Stats -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
		<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
					<Users class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">248</div>
				<p class="text-xs text-muted-foreground">
					<TrendingUp class="inline h-3 w-3 mr-1" />
					+12% from last month
				</p>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Time Off Requests</CardTitle>
					<Calendar class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">16</div>
				<p class="text-xs text-muted-foreground">
					<TrendingUp class="inline h-3 w-3 mr-1" />
					+4 this week
				</p>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Payroll</CardTitle>
					<DollarSign class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">$2.4M</div>
				<p class="text-xs text-muted-foreground">
					Monthly total
				</p>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
			<CardHeader class="pb-2">
				<div class="flex items-center justify-between">
					<CardTitle class="text-sm font-medium text-muted-foreground">Performance Reviews</CardTitle>
					<BarChart3 class="h-4 w-4 text-muted-foreground" />
				</div>
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">92%</div>
				<p class="text-xs text-muted-foreground">
					Completion rate
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Charts Section -->
	<div class="grid gap-6 lg:grid-cols-2 mb-8">
		<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
			<CardHeader>
				<CardTitle>Employee Growth</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-64 flex items-center justify-center text-muted-foreground">
					<div class="text-center">
						<BarChart3 class="h-12 w-12 mx-auto mb-2" />
						<p>Chart visualization coming soon</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
			<CardHeader>
				<CardTitle>Department Distribution</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="h-64 flex items-center justify-center text-muted-foreground">
					<div class="text-center">
						<BarChart3 class="h-12 w-12 mx-auto mb-2" />
						<p>Chart visualization coming soon</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Coming Soon -->
	<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md p-6 shadow-xl">
		<div class="text-center py-12">
			<BarChart3 class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
			<h3 class="text-xl font-semibold mb-2">Advanced Analytics Coming Soon</h3>
			<p class="text-muted-foreground mb-6">
				Detailed reports including workforce analytics, attendance tracking, performance metrics, and more are currently in development.
			</p>
			<Button class="rounded-xl">
				<Download class="h-4 w-4 mr-2" />
				Download Sample Report
			</Button>
		</div>
	</div>
</div>