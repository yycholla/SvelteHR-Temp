<!-- Performance Reviews Management Page -->
<!-- T039: Fix performance management pages with standardized error handling -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		AlertTriangle,
		Award,
		BarChart3,
		Calendar,
		CheckCircle,
		Clock,
		Filter,
		Plus,
		Search,
		Star,
		TrendingUp,
		User,
		Users
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Progress } from '$lib/components/ui/progress';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ReviewCreationDialog } from '$lib/components/reviews';

	import {
		createPerformanceOperations,
		formatReviewPeriod,
		getRatingInfo,
		getStatusInfo,
		isReviewOverdue,
		performanceRatings,
		reviewPeriods,
		reviewStatusOptions
	} from '$lib/graphql/queries/performance-reviews';

	// Page data from server
	interface Props {
		data: {
			user: any;
			userSession: any;
			performanceReviews: any[];
			totalReviews: number;
			employees: any[];
			reviewAnalytics: any;
			filters: any;
			permissions: string[];
			canCreateReviews: boolean;
			canEditReviews: boolean;
			canViewAllReviews: boolean;
			loadedAt: string;
		};
	}

	const { data }: Props = $props();

	// Derived state using Svelte 5 runes
	const user = $derived(data.user);
	const userSession = $derived(data.userSession);
	const performanceReviews = $derived(data.performanceReviews);
	const reviewAnalytics = $derived(data.reviewAnalytics);
	const canCreateReviews = $derived(data.canCreateReviews);
	const canEditReviews = $derived(data.canEditReviews);
	const canViewAllReviews = $derived(data.canViewAllReviews);

	// Debug logging
	$effect(() => {
		console.log('🔍 [Management Reviews Component] Data received:', {
			performanceReviewsCount: performanceReviews?.length || 0,
			firstReview: performanceReviews?.[0] || null,
			selectedView,
			searchQuery
		});
	});

	// Local state for UI
	let selectedView = $state('all');
	const showCreateModal = $state(false);
	let showDetailsModal = $state(false);
	let showEditModal = $state(false);
	let currentReview = $state<any>(null);
	const isSubmitting = $state(false);
	let searchQuery = $state(data.filters.searchTerm || '');
	const statusFilter = $state(data.filters.statusFilter || '');
	const periodFilter = $state(data.filters.periodFilter || '');
	const departmentFilter = $state(data.filters.departmentFilter || '');

	// Employee selector state
	let showEmployeeSelector = $state(false);
	let selectedEmployee = $state<any>(null);
	let employeeSearchQuery = $state('');
	let createDialogOpen = $state(false);

	// Filtered employees for selector
	const filteredEmployees = $derived.by(() => {
		console.log('🔍 Employee data:', {
			totalEmployees: data.employees?.length || 0,
			employees: data.employees,
			searchQuery: employeeSearchQuery
		});

		if (!employeeSearchQuery) return data.employees || [];

		const query = employeeSearchQuery.toLowerCase();
		return (data.employees || []).filter(
			(emp: any) =>
				emp.displayName?.toLowerCase().includes(query) ||
				emp.email?.toLowerCase().includes(query) ||
				emp.firstName?.toLowerCase().includes(query) ||
				emp.lastName?.toLowerCase().includes(query)
		);
	});

	// Statistics cards data
	const statsCards = $derived([
		{
			title: 'Total Reviews',
			value: reviewAnalytics.totalReviews,
			description: 'All performance reviews',
			icon: Users,
			color: 'bg-blue-50 text-blue-700 border-blue-200',
			iconColor: 'text-blue-600'
		},
		{
			title: 'Completed Reviews',
			value: reviewAnalytics.completedReviews,
			description: 'Reviews finished',
			icon: CheckCircle,
			color: 'bg-green-50 text-green-700 border-green-200',
			iconColor: 'text-green-600'
		},
		{
			title: 'Overdue Reviews',
			value: reviewAnalytics.overdueReviews,
			description: 'Need immediate attention',
			icon: AlertTriangle,
			color: 'bg-orange-50 text-orange-700 border-orange-200',
			iconColor: 'text-orange-600'
		},
		{
			title: 'Completion Rate',
			value: `${reviewAnalytics.completionRate}%`,
			description: 'Reviews completed on time',
			icon: TrendingUp,
			color: 'bg-purple-50 text-purple-700 border-purple-200',
			iconColor: 'text-purple-600'
		}
	]);

	// Rating categories for analytics display
	const ratingCategories = $derived([
		{
			label: 'Overall Performance',
			value: reviewAnalytics.averageRatings.overall,
			color: 'bg-blue-500'
		},
		{
			label: 'Goal Achievement',
			value: reviewAnalytics.averageRatings.goalsAchievement,
			color: 'bg-green-500'
		},
		{
			label: 'Collaboration',
			value: reviewAnalytics.averageRatings.collaboration,
			color: 'bg-purple-500'
		},
		{
			label: 'Communication',
			value: reviewAnalytics.averageRatings.communication,
			color: 'bg-indigo-500'
		},
		{
			label: 'Leadership',
			value: reviewAnalytics.averageRatings.leadership,
			color: 'bg-cyan-500'
		}
	]);

	// Filter and display logic
	const filteredReviews = $derived.by(() => {
		let filtered = performanceReviews;
		console.log('🔍 [Filter] Starting with reviews:', filtered?.length || 0);

		if (selectedView !== 'all') {
			console.log('🔍 [Filter] Applying view filter:', selectedView);
			filtered = filtered.filter((review) => {
				switch (selectedView) {
					case 'pending':
						return review.status === 'draft' || review.status === 'in_progress';
					case 'completed':
						return review.status === 'completed';
					case 'overdue':
						return isReviewOverdue(review);
					default:
						return true;
				}
			});
			console.log('🔍 [Filter] After view filter:', filtered.length);
		}

		if (searchQuery) {
			console.log('🔍 [Filter] Applying search filter:', searchQuery);
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(review) =>
					review.employee?.displayName.toLowerCase().includes(query) ||
					review.reviewer?.displayName.toLowerCase().includes(query) ||
					review.employee?.department?.name.toLowerCase().includes(query)
			);
			console.log('🔍 [Filter] After search filter:', filtered.length);
		}

		console.log('🔍 [Filter] Final filtered reviews:', filtered.length);
		return filtered;
	});

	// Handler functions
	function handleViewReview(review: any) {
		currentReview = review;
		showDetailsModal = true;
	}

	function handleEditReview(review: any) {
		currentReview = review;
		showEditModal = true;
	}

	async function handleDeleteReview(review: any) {
		if (!confirm('Are you sure you want to delete this performance review?')) return;

		try {
			const performanceOps = createPerformanceOperations(null);

			await performanceOps.deletePerformanceReview({
				id: review.id,
				userCredentials: {
					userId: userSession.userId,
					userEmail: userSession.userEmail,
					role: userSession.role,
					accessToken: userSession.accessToken
				}
			});

			toast.success('Performance review deleted successfully');

			// Refresh the page to get updated data
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error('Failed to delete performance review:', error);
			toast.error('Failed to delete performance review');
		}
	}

	// Navigation handlers for filtering
	function handleSearch() {
		const url = new URL($page.url);
		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1'); // Reset to first page
		goto(url.toString());
	}

	function handleStatusFilterChange(status: string) {
		const url = new URL($page.url);
		if (status) {
			url.searchParams.set('status', status);
		} else {
			url.searchParams.delete('status');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handlePeriodFilterChange(period: string) {
		const url = new URL($page.url);
		if (period) {
			url.searchParams.set('period', period);
		} else {
			url.searchParams.delete('period');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	// Get initials for avatar
	function getInitials(name: string): string {
		return (
			name
				?.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase() || 'U'
		);
	}

	// Get status badge variant
	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'completed':
				return 'default';
			case 'in_progress':
				return 'secondary';
			case 'draft':
				return 'outline';
			default:
				return 'outline';
		}
	}

	// Get rating stars
	function renderRatingStars(rating: number): string {
		const filled = Math.floor(rating);
		const empty = 5 - filled;
		return '★'.repeat(filled) + '☆'.repeat(empty);
	}

	// Format dates
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	// Open create dialog
	function openCreateDialog() {
		if (selectedEmployee) {
			// If we already have a selected employee, open review dialog
			createDialogOpen = true;
		} else {
			// Show employee selector first
			showEmployeeSelector = true;
		}
	}

	function handleEmployeeSelected(employee: any) {
		selectedEmployee = employee;
		showEmployeeSelector = false;
		createDialogOpen = true;
	}

	// Handle create review
	function handleCreateReview(event: CustomEvent) {
		const { data: reviewData } = event.detail;
		// TODO: Call GraphQL mutation
		console.log('Create review:', reviewData);
		toast.success('Review creation coming soon');
	}

	function handleSaveAsDraft(event: CustomEvent) {
		const { data: draftData } = event.detail;
		// TODO: Call GraphQL mutation to save draft
		console.log('Save draft:', draftData);
		toast.success('Draft save coming soon');
	}
</script>

<svelte:head>
	<title>Performance Reviews - MountainHR</title>
	<meta
		name="description"
		content="Manage and track team performance reviews, ratings, and analytics"
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="container mx-auto space-y-6 p-4">
		<!-- Header -->
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Performance Reviews</h1>
				<p class="text-muted-foreground">
					Manage and track team performance reviews, ratings, and development plans
				</p>
			</div>

			{#if canCreateReviews}
				<Button onclick={() => goto('/dashboard/reviews/create')}>
					<Plus class="mr-2 h-4 w-4" />
					New Review
				</Button>
			{/if}
		</div>

		<!-- Statistics Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each statsCards as stat}
				{@const Icon = stat.icon}
				<Card class={`${stat.color} border`}>
					<CardContent class="p-6">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium opacity-75">{stat.title}</p>
								<p class="mt-2 text-2xl font-bold">{stat.value}</p>
								<p class="mt-1 text-xs opacity-75">{stat.description}</p>
							</div>
							<div class={`${stat.iconColor} opacity-75`}>
								<Icon class="h-8 w-8" />
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		<!-- Performance Analytics -->
		{#if reviewAnalytics.averageRatings.overall > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<BarChart3 class="h-5 w-5" />
						Performance Analytics
					</CardTitle>
					<CardDescription>Average ratings across different performance categories</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						{#each ratingCategories as category}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class={`h-3 w-3 rounded-full ${category.color}`}></div>
									<span class="text-sm font-medium">{category.label}</span>
								</div>
								<div class="flex items-center gap-2">
									<Progress value={category.value * 20} class="w-24" />
									<span class="w-8 text-sm text-muted-foreground">{category.value.toFixed(1)}</span>
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Filters -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Filter class="h-5 w-5" />
					Filter Reviews
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="flex flex-col gap-4 md:flex-row md:items-end">
					<!-- Search -->
					<div class="flex-1">
						<Label for="search">Search</Label>
						<div class="flex gap-2">
							<Input
								id="search"
								placeholder="Search by employee, reviewer, or department..."
								bind:value={searchQuery}
								onkeydown={(e) => {
									if (e.key === 'Enter') handleSearch();
								}}
							/>
							<Button onclick={handleSearch} size="sm">
								<Search class="h-4 w-4" />
							</Button>
						</div>
					</div>

					<!-- Status Filter -->
					<div class="w-full md:w-48">
						<Label>Status</Label>
						<Select value={statusFilter} onValueChange={handleStatusFilterChange}>
							<SelectTrigger placeholder="All Statuses" />
							<SelectContent>
								<SelectItem value="">All Statuses</SelectItem>
								{#each reviewStatusOptions as status}
									<SelectItem value={status.value}>{status.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>

					<!-- Period Filter -->
					<div class="w-full md:w-48">
						<Label>Review Period</Label>
						<Select value={periodFilter} onValueChange={handlePeriodFilterChange}>
							<SelectTrigger placeholder="All Periods" />
							<SelectContent>
								<SelectItem value="">All Periods</SelectItem>
								{#each reviewPeriods as period}
									<SelectItem value={period.value}>{period.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Tabs for different views -->
		<Tabs
			value={selectedView}
			onValueChange={(value) => {
				selectedView = value;
			}}
		>
			<TabsList class="grid w-full grid-cols-4">
				<TabsTrigger value="all">
					All Reviews ({data.totalReviews})
				</TabsTrigger>
				<TabsTrigger value="pending">
					Pending ({reviewAnalytics.totalReviews - reviewAnalytics.completedReviews})
				</TabsTrigger>
				<TabsTrigger value="completed">
					Completed ({reviewAnalytics.completedReviews})
				</TabsTrigger>
				<TabsTrigger value="overdue">
					Overdue ({reviewAnalytics.overdueReviews})
				</TabsTrigger>
			</TabsList>

			<TabsContent value={selectedView} class="mt-4">
				<!-- Performance Reviews List -->
				<div class="space-y-4">
					{#if filteredReviews.length === 0}
						<Card>
							<CardContent class="p-8 text-center">
								<Award class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<h3 class="mb-2 text-lg font-semibold text-foreground">No reviews found</h3>
								<p class="text-muted-foreground">
									{#if selectedView === 'pending'}
										No pending performance reviews at the moment.
									{:else if selectedView === 'completed'}
										No completed performance reviews found.
									{:else if selectedView === 'overdue'}
										No overdue performance reviews found.
									{:else}
										No performance reviews match your current filters.
									{/if}
								</p>
							</CardContent>
						</Card>
					{:else}
						{#each filteredReviews as review}
							<Card class="transition-shadow hover:shadow-md">
								<CardContent class="p-6">
									<div class="flex items-start justify-between">
										<!-- Review Info -->
										<div class="flex flex-1 items-start space-x-4">
											<!-- Employee Avatar -->
											<Avatar class="h-12 w-12">
												<AvatarFallback class="bg-blue-100 text-blue-700">
													{getInitials(review.employee?.displayName || '')}
												</AvatarFallback>
											</Avatar>

											<!-- Review Details -->
											<div class="flex-1 space-y-2">
												<div class="flex flex-wrap items-center gap-3">
													<h3 class="text-lg font-semibold text-foreground">
														{review.employee?.displayName || 'Unknown Employee'}
													</h3>
													<Badge variant={getStatusBadgeVariant(review.status)} class="capitalize">
														{getStatusInfo(review.status).label}
													</Badge>
													{#if review.overallRating}
														<Badge
															variant="outline"
															class="border-yellow-200 bg-yellow-50 text-yellow-700"
														>
															<Star class="mr-1 h-3 w-3" />
															{review.overallRating}/5
														</Badge>
													{/if}
													{#if isReviewOverdue(review)}
														<Badge variant="destructive">
															<Clock class="mr-1 h-3 w-3" />
															Overdue
														</Badge>
													{/if}
												</div>

												<div class="space-y-1 text-sm text-muted-foreground">
													<p>
														<strong>Department:</strong>
														{review.employee?.department?.name || 'N/A'}
													</p>
													<p>
														<strong>Reviewer:</strong>
														{review.reviewer?.displayName || 'Not assigned'}
													</p>
													<p>
														<strong>Review Period:</strong>
														{formatReviewPeriod(review.reviewPeriodStart, review.reviewPeriodEnd)}
													</p>
													{#if review.overallRating}
														<p>
															<strong>Overall Rating:</strong>
															{renderRatingStars(review.overallRating)} ({review.overallRating}/5)
														</p>
													{/if}
													{#if review.strengths}
														<p>
															<strong>Key Strengths:</strong>
															{review.strengths.substring(0, 100)}...
														</p>
													{/if}
												</div>

												<div class="text-xs text-muted-foreground">
													Created on {formatDate(review.createdAt)}
													{#if review.completedAt}
														• Completed on {formatDate(review.completedAt)}
													{/if}
												</div>
											</div>
										</div>

										<!-- Actions -->
										<div class="ml-4 flex gap-2">
											<Button size="sm" variant="outline" onclick={() => handleViewReview(review)}>
												View Details
											</Button>
											{#if canEditReviews && review.status !== 'completed'}
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleEditReview(review)}
												>
													Edit
												</Button>
											{/if}
											{#if canCreateReviews}
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleDeleteReview(review)}
													class="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
												>
													Delete
												</Button>
											{/if}
										</div>
									</div>
								</CardContent>
							</Card>
						{/each}
					{/if}
				</div>
			</TabsContent>
		</Tabs>
	</div>
</div>

<!-- Review Details Modal -->
<Dialog.Root bind:open={showDetailsModal}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-4xl">
			<Dialog.Header>
				<Dialog.Title>Performance Review Details</Dialog.Title>
				<Dialog.Description>
					{#if currentReview}
						Review for {currentReview.employee?.displayName} • {formatReviewPeriod(
							currentReview.reviewPeriodStart,
							currentReview.reviewPeriodEnd
						)}
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if currentReview}
				<div class="max-h-96 space-y-6 overflow-y-auto">
					<!-- Employee Info -->
					<div class="rounded-lg bg-muted p-4 dark:bg-muted">
						<h4 class="mb-2 font-semibold">Employee Information</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<p><strong>Name:</strong> {currentReview.employee?.displayName}</p>
							<p><strong>Department:</strong> {currentReview.employee?.department?.name}</p>
							<p><strong>Job Title:</strong> {currentReview.employee?.jobTitle || 'N/A'}</p>
							<p><strong>Reviewer:</strong> {currentReview.reviewer?.displayName}</p>
						</div>
					</div>

					<!-- Ratings -->
					{#if currentReview.overallRating}
						<div>
							<h4 class="mb-3 font-semibold">Performance Ratings</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="text-sm">
									<p class="font-medium">Overall Performance</p>
									<p class="text-yellow-600">
										{renderRatingStars(currentReview.overallRating)} ({currentReview.overallRating}/5)
									</p>
								</div>
								{#if currentReview.goalsAchievement}
									<div class="text-sm">
										<p class="font-medium">Goals Achievement</p>
										<p class="text-yellow-600">
											{renderRatingStars(currentReview.goalsAchievement)} ({currentReview.goalsAchievement}/5)
										</p>
									</div>
								{/if}
								{#if currentReview.collaboration}
									<div class="text-sm">
										<p class="font-medium">Collaboration</p>
										<p class="text-yellow-600">
											{renderRatingStars(currentReview.collaboration)} ({currentReview.collaboration}/5)
										</p>
									</div>
								{/if}
								{#if currentReview.communication}
									<div class="text-sm">
										<p class="font-medium">Communication</p>
										<p class="text-yellow-600">
											{renderRatingStars(currentReview.communication)} ({currentReview.communication}/5)
										</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Review Content -->
					{#if currentReview.strengths}
						<div>
							<h4 class="mb-2 font-semibold">Strengths</h4>
							<p class="rounded bg-green-50 p-3 text-sm text-foreground">
								{currentReview.strengths}
							</p>
						</div>
					{/if}

					{#if currentReview.areasForImprovement}
						<div>
							<h4 class="mb-2 font-semibold">Areas for Improvement</h4>
							<p class="rounded bg-orange-50 p-3 text-sm text-foreground">
								{currentReview.areasForImprovement}
							</p>
						</div>
					{/if}

					{#if currentReview.goalsForNextPeriod}
						<div>
							<h4 class="mb-2 font-semibold">Goals for Next Period</h4>
							<p class="rounded bg-blue-50 p-3 text-sm text-foreground">
								{currentReview.goalsForNextPeriod}
							</p>
						</div>
					{/if}

					{#if currentReview.developmentPlan}
						<div>
							<h4 class="mb-2 font-semibold">Development Plan</h4>
							<p class="rounded bg-purple-50 p-3 text-sm text-foreground">
								{currentReview.developmentPlan}
							</p>
						</div>
					{/if}

					{#if currentReview.employeeSelfAssessment}
						<div>
							<h4 class="mb-2 font-semibold">Employee Self-Assessment</h4>
							<p class="rounded bg-muted p-3 text-sm text-foreground dark:bg-muted">
								{currentReview.employeeSelfAssessment}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => {
						showDetailsModal = false;
					}}>Close</Button
				>
				{#if canEditReviews && currentReview && currentReview.status !== 'completed'}
					<Button onclick={() => {
						showDetailsModal = false;
						handleEditReview(currentReview);
					}}>Edit Review</Button>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Employee Selector Dialog -->
<Dialog.Root bind:open={showEmployeeSelector}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[80vh] max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Select Employee for Review</Dialog.Title>
				<Dialog.Description>
					Choose an employee to create a performance review for
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Search Input -->
				<div class="relative">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search employees by name or email..."
						bind:value={employeeSearchQuery}
						class="pl-9"
					/>
				</div>

				<!-- Employee List -->
				<div class="max-h-96 overflow-y-auto rounded-md border">
					{#if filteredEmployees.length === 0}
						<div class="p-8 text-center text-muted-foreground">
							<User class="mx-auto mb-2 h-12 w-12 opacity-50" />
							<p>No employees found</p>
							{#if employeeSearchQuery}
								<p class="mt-1 text-sm">Try adjusting your search</p>
							{/if}
						</div>
					{:else}
						<div class="divide-y">
							{#each filteredEmployees as employee (employee.id)}
								<button
									type="button"
									class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
									onclick={() => handleEmployeeSelected(employee)}
								>
									<div class="flex-1">
										<div class="font-medium">{employee.displayName}</div>
										<div class="text-sm text-muted-foreground">{employee.email}</div>
									</div>
									<Badge variant="outline">
										{employee.firstName}
										{employee.lastName}
									</Badge>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showEmployeeSelector = false)}>Cancel</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Create Review Dialog -->
{#if selectedEmployee}
	<ReviewCreationDialog
		bind:open={createDialogOpen}
		employee={selectedEmployee}
		availableGoals={[]}
		reviewTypesMetadata={[]}
		loading={false}
		on:createReview={handleCreateReview}
		on:saveAsDraft={handleSaveAsDraft}
		on:cancel={() => (createDialogOpen = false)}
	/>
{/if}

<!-- Edit Review Dialog -->
{#if currentReview && showEditModal}
	<ReviewCreationDialog
		bind:open={showEditModal}
		employee={currentReview.employee}
		availableGoals={currentReview.goalsArray || []}
		reviewTypesMetadata={[]}
		existingDraft={currentReview}
		loading={false}
		on:createReview={handleCreateReview}
		on:saveAsDraft={handleSaveAsDraft}
		on:cancel={() => (showEditModal = false)}
	/>
{/if}
