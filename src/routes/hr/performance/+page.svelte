<script lang="ts">
	import { goto } from '$app/navigation';
	import { Star, TrendingUp, Calendar, User, FileText, Plus, Filter, Award, AlertCircle } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { NotificationCenter } from '$lib/components/ui/notification-center';
	import { EnhancedBulkActionsBar } from '$lib/components/ui/bulk-operations';
	import { LiveMetricCard } from '$lib/components/ui/dashboard-cards';
	import type { PageData } from './$types';

	// Page data from server
	let { data }: { data: PageData } = $props();

	// Local filter states
	let activeTab = $state('reviews');
	let statusFilter = $state(data.filters.status);
	let employeeFilter = $state(data.filters.employeeId);
  let createReviewOpen = $state(false);

	// Derived data from server
	const performanceReviews = $derived(data.performanceReviews);
	const stats = $derived(data.stats);
	const loading = $state(false);
	const error = $derived(data.error || '');

	function getStatusVariant(status: string) {
		switch (status?.toLowerCase()) {
			case 'completed': return 'default';
			case 'pending': return 'secondary';
			case 'overdue': return 'destructive';
			case 'in_progress': return 'outline';
			default: return 'outline';
		}
	}

	function getStatusIcon(status: string) {
		switch (status?.toLowerCase()) {
			case 'completed': return Award;
			case 'pending': return Calendar;
			case 'overdue': return AlertCircle;
			case 'in_progress': return TrendingUp;
			default: return FileText;
		}
	}

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Not set';
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(dateString));
	}

	function getScoreColor(score: number): string {
		if (score >= 4.5) return 'text-green-600 dark:text-green-400';
		if (score >= 3.5) return 'text-blue-600 dark:text-blue-400';
		if (score >= 2.5) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	}

	// Apply filters by navigating to new URL with query parameters
	async function applyFilters() {
		const params = new URLSearchParams();

		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (employeeFilter !== 'all') params.set('employeeId', employeeFilter);

		const queryString = params.toString();
		const newUrl = queryString ? `/hr/performance?${queryString}` : '/hr/performance';

		await goto(newUrl);
	}

	function clearFilters() {
		statusFilter = 'all';
		employeeFilter = 'all';
		applyFilters();
	}

	// Apply filters when any filter changes
	$effect(() => {
		if (statusFilter !== data.filters.status ||
		    employeeFilter !== data.filters.employeeId) {
			applyFilters();
		}
	});
</script>

<svelte:head>
	<title>HR - Performance Management - SvelteHR</title>
</svelte:head>

<!-- Notification components (using server-side data only) -->
<NotificationCenter />

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Performance Management</h1>
		<p class="text-gray-600 dark:text-gray-400">Track and manage employee performance reviews and evaluations</p>
	</div>


<div class="space-y-6">

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Reviews</CardTitle>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.totalReviews}</div>
				<p class="text-xs text-muted-foreground">All performance reviews</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Completed</CardTitle>
				<Award class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.completed}</div>
				<p class="text-xs text-muted-foreground">Reviews finished</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Pending</CardTitle>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{stats.pending}</div>
				<p class="text-xs text-muted-foreground">Awaiting completion</p>
			</CardContent>
		</Card>

		<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Average Score</CardTitle>
				<Star class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold {getScoreColor(stats.averageScore)}">{stats.averageScore || 'N/A'}</div>
				<p class="text-xs text-muted-foreground">Out of 5.0</p>
			</CardContent>
		</Card>
	</div>

	<!-- Tabs for Reviews and Analytics -->
	<Card class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 rounded-lg shadow-xl">
		<CardContent class="p-6">
			<Tabs bind:value={activeTab}>
				<TabsList class="grid w-full grid-cols-2">
					<TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
					<TabsTrigger value="analytics">Analytics</TabsTrigger>
				</TabsList>

				<!-- Performance Reviews Tab -->
				<TabsContent value="reviews" class="space-y-4">
					<!-- Filters -->
					<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
						<CardHeader>
							<CardTitle>Filter Reviews</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="flex gap-4">
								<select
									class="px-3 py-2 border border-input rounded-md bg-background text-foreground"
									bind:value={statusFilter}
								>
									<option value="all">All Statuses</option>
									<option value="Pending">Pending</option>
									<option value="In Progress">In Progress</option>
									<option value="Completed">Completed</option>
									<option value="Overdue">Overdue</option>
								</select>

								<Button variant="outline" onclick={clearFilters}>
									Clear Filters
								</Button>
							</div>
						</CardContent>
					</Card>

					<!-- Reviews List -->
					<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
						<CardHeader>
							<CardTitle>Performance Reviews</CardTitle>
							<CardDescription>
								Current and past employee performance evaluations
							</CardDescription>
						</CardHeader>
						<CardContent>
							<!-- Enhanced bulk operations for performance reviews -->
							<EnhancedBulkActionsBar
								entityType="performance"
								availableActions={[
									{ id: 'complete-review', label: 'Complete Review', icon: 'Award' },
									{ id: 'schedule-followup', label: 'Schedule Follow-up', icon: 'Calendar' },
									{ id: 'export-reviews', label: 'Export Reviews', icon: 'Download' },
									{ id: 'send-reminder', label: 'Send Reminder', icon: 'MessageSquare' }
								]}
							/>
							{#if loading}
								<div class="flex items-center justify-center py-8">
									<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
								</div>
							{:else if error}
								<div class="text-center py-8">
									<p class="text-destructive">{error}</p>
									<Button variant="outline" class="mt-4" onclick={() => window.location.reload()}>
										Retry
									</Button>
								</div>
							{:else if performanceReviews.length === 0}
								<div class="text-center py-8">
									<FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
									<h3 class="mt-4 text-lg font-semibold">No performance reviews found</h3>
									<p class="mt-2 text-muted-foreground">
										{statusFilter !== 'all'
											? 'No reviews match the selected filters'
											: 'Start by creating your first performance review'}
									</p>
									{#if statusFilter === 'all'}
										<Button class="mt-4">
											<Plus class="h-4 w-4 mr-2" />
											Create Review
										</Button>
									{/if}
								</div>
							{:else}
								<div class="space-y-4">
									{#each performanceReviews as review}
										{@const StatusIcon = getStatusIcon(review.status)}
										{@const isOverdue = review.status !== 'Completed' && new Date(review.dueDate) < new Date()}

										<div class="border border-border/50 rounded-lg p-4">
											<div class="flex items-start justify-between mb-4">
												<div class="flex items-start space-x-4 flex-1">
													<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
														<span class="text-sm font-medium text-primary">
															{review.employee?.firstName?.[0] || ''}{review.employee?.lastName?.[0] || ''}
														</span>
													</div>
													<div class="flex-1 min-w-0">
														<h3 class="font-medium text-foreground">
															{review.employee?.firstName} {review.employee?.lastName}
														</h3>
														<p class="text-sm text-muted-foreground mt-1">
															{review.reviewPeriod || 'Annual Review'} • {formatDate(review.reviewDate)}
														</p>
														<div class="flex items-center space-x-2 mt-2">
															<StatusIcon class="h-4 w-4" />
															<Badge variant={isOverdue ? 'destructive' : getStatusVariant(review.status)}>
																{isOverdue ? 'Overdue' : review.status}
															</Badge>
															{#if review.overallScore}
																<Badge variant="outline" class={getScoreColor(review.overallScore)}>
																	<Star class="h-3 w-3 mr-1" />
																	{review.overallScore}/5.0
																</Badge>
															{/if}
														</div>
													</div>
												</div>
											</div>

											<!-- Review Details -->
											<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
												<div>
													<span class="font-medium">Reviewer:</span>
													<p class="text-muted-foreground">
														{review.reviewer?.firstName} {review.reviewer?.lastName}
													</p>
												</div>
												<div>
													<span class="font-medium">Due Date:</span>
													<p class="text-muted-foreground">{formatDate(review.dueDate)}</p>
												</div>
												<div>
													<span class="font-medium">Department:</span>
													<p class="text-muted-foreground">{review.employee?.department || 'N/A'}</p>
												</div>
											</div>

											<!-- Performance Metrics -->
											{#if review.performanceMetrics}
												<div class="mt-4">
													<h4 class="font-medium text-sm mb-2">Performance Areas</h4>
													<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
														{#each Object.entries(review.performanceMetrics) as [area, score]}
															<div class="text-center">
																<p class="text-xs text-muted-foreground mb-1">{area}</p>
																<div class="flex items-center justify-center space-x-1">
																	<Progress value={(score / 5) * 100} class="h-2 w-12" />
																	<span class="text-xs font-medium {getScoreColor(score)}">{score}/5</span>
																</div>
															</div>
														{/each}
													</div>
												</div>
											{/if}

											<!-- Actions -->
											<div class="flex items-center space-x-2 mt-4 pt-2 border-t border-border/30">
												<Button variant="outline" size="sm">
													View Details
												</Button>
												{#if review.status !== 'Completed'}
													<Button size="sm">
														Continue Review
													</Button>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</CardContent>
					</Card>
				</TabsContent>

				<!-- Analytics Tab -->
				<TabsContent value="analytics" class="space-y-4">
					<div class="grid gap-6 md:grid-cols-2">
						<!-- Performance Distribution -->
						<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
							<CardHeader>
								<CardTitle>Score Distribution</CardTitle>
								<CardDescription>
									Distribution of performance scores across all reviews
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="space-y-3">
									{#each [
										{ range: '4.5 - 5.0', label: 'Exceptional', color: 'bg-green-500', count: performanceReviews.filter(r => r.overallScore >= 4.5).length },
										{ range: '3.5 - 4.4', label: 'Exceeds Expectations', color: 'bg-blue-500', count: performanceReviews.filter(r => r.overallScore >= 3.5 && r.overallScore < 4.5).length },
										{ range: '2.5 - 3.4', label: 'Meets Expectations', color: 'bg-yellow-500', count: performanceReviews.filter(r => r.overallScore >= 2.5 && r.overallScore < 3.5).length },
										{ range: '1.0 - 2.4', label: 'Needs Improvement', color: 'bg-red-500', count: performanceReviews.filter(r => r.overallScore >= 1.0 && r.overallScore < 2.5).length }
									] as category}
										<div class="flex items-center space-x-3">
											<div class="w-3 h-3 rounded-full {category.color}"></div>
											<div class="flex-1">
												<div class="flex items-center justify-between">
													<span class="text-sm font-medium">{category.label}</span>
													<span class="text-sm text-muted-foreground">{category.count}</span>
												</div>
												<p class="text-xs text-muted-foreground">{category.range}</p>
											</div>
											<div class="w-20">
												<Progress value={stats.totalReviews > 0 ? (category.count / stats.totalReviews) * 100 : 0} class="h-2" />
											</div>
										</div>
									{/each}
								</div>
							</CardContent>
						</Card>

						<!-- Review Status Overview -->
						<Card class="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 rounded-lg">
							<CardHeader>
								<CardTitle>Review Status</CardTitle>
								<CardDescription>
									Current status of all performance reviews
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="space-y-4">
									<div class="flex items-center justify-between">
										<span class="text-sm font-medium">Completion Rate</span>
										<span class="text-sm font-bold">
											{stats.totalReviews > 0 ? Math.round((stats.completed / stats.totalReviews) * 100) : 0}%
										</span>
									</div>
									<Progress value={stats.totalReviews > 0 ? (stats.completed / stats.totalReviews) * 100 : 0} class="h-3" />

									<div class="grid grid-cols-2 gap-4 mt-4">
										<div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
											<p class="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
											<p class="text-xs text-green-600/80 dark:text-green-400/80">Completed</p>
										</div>
										<div class="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
											<p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
											<p class="text-xs text-yellow-600/80 dark:text-yellow-400/80">Pending</p>
										</div>
									</div>

									{#if stats.overdue > 0}
										<div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
											<div class="flex items-center space-x-2">
												<AlertCircle class="h-4 w-4 text-red-600 dark:text-red-400" />
												<span class="text-sm font-medium text-red-600 dark:text-red-400">
													{stats.overdue} overdue review{stats.overdue !== 1 ? 's' : ''}
												</span>
											</div>
										</div>
									{/if}
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</CardContent>
	</Card>

	<!-- Fixed position add button in bottom right corner -->
    <div class="fixed bottom-6 right-6 z-50">
        <Button class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200" onclick={() => createReviewOpen = true}>
            <Plus class="h-5 w-5" />
        </Button>
    </div>

    {#if typeof createReviewOpen === 'undefined'}
        {@html ''}
    {/if}
    {#if createReviewOpen}
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div class="bg-background rounded-xl border border-border p-6 w-full max-w-md">
            <h3 class="font-semibold mb-2">Create Review</h3>
            <p class="text-sm text-muted-foreground mb-4">Placeholder modal. Hook up your review form here.</p>
            <div class="flex justify-end"><Button variant="outline" onclick={() => createReviewOpen = false}>Close</Button></div>
        </div>
    </div>
    {/if}
</div>
</div>
