<script lang="ts">
	import { page } from '$app/stores';
	import { FileText, Star, Clock, CheckCircle, Calendar, User, TrendingUp, MessageSquare, Target, Award, BookOpen } from 'lucide-svelte';
	import { format, parseISO } from 'date-fns';

	let { data } = $props();

	let user = $derived(data.user);
	let userId = $derived(data.userId);
	let reviews = $derived(data.reviews);
	let reviewTypes = $derived(data.reviewTypes);
	let competencyAreas = $derived(data.competencyAreas);
	let reviewStats = $derived(data.reviewStats);
	let canManageReviews = $derived(data.canManageReviews);
	let isOwnReviews = $derived(data.isOwnReviews);

	let selectedStatus = $state('all');
	let selectedType = $state('all');
	let expandedReview = $state(null);

	// Filter reviews based on selected filters
	let filteredReviews = $derived(reviews.filter(review => {
		const statusMatch = selectedStatus === 'all' || review.status === selectedStatus;
		const typeMatch = selectedType === 'all' || review.type.id === selectedType;
		return statusMatch && typeMatch;
	}));

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed': return CheckCircle;
			case 'in_progress': return Clock;
			case 'scheduled': return Calendar;
			case 'overdue': return Clock;
			default: return Clock;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed': return 'text-green-600 bg-green-50 border-green-200';
			case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'scheduled': return 'text-muted-foreground bg-muted dark:bg-muted border';
			case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
			default: return 'text-muted-foreground bg-muted dark:bg-muted border';
		}
	}

	function getTypeColor(color: string) {
		switch (color) {
			case 'blue': return 'bg-blue-100 text-blue-800';
			case 'green': return 'bg-green-100 text-green-800';
			case 'purple': return 'bg-purple-100 text-purple-800';
			case 'orange': return 'bg-orange-100 text-orange-800';
			case 'red': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-foreground';
		}
	}

	function getRatingStars(rating: number) {
		const fullStars = Math.floor(rating);
		const hasHalfStar = rating % 1 >= 0.5;
		return { fullStars, hasHalfStar };
	}

	function formatDate(dateString: string) {
		return format(parseISO(dateString), 'MMM dd, yyyy');
	}

	function toggleReviewExpansion(reviewId: string) {
		expandedReview = expandedReview === reviewId ? null : reviewId;
	}

	function getGoalStatusColor(status: string) {
		switch (status) {
			case 'achieved': return 'text-green-600';
			case 'partially_achieved': return 'text-yellow-600';
			case 'not_achieved': return 'text-red-600';
			default: return 'text-muted-foreground';
		}
	}
</script>

<svelte:head>
	<title>{isOwnReviews ? 'My Reviews' : `${user?.displayName} - Reviews`} | SvelteHR</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
				<FileText class="h-6 w-6 text-blue-600" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground">
					{isOwnReviews ? 'My Performance Reviews' : `${user?.displayName} - Performance Reviews`}
				</h1>
				<p class="text-muted-foreground">
					{user?.departmentByDepartmentId?.name || 'No Department'} • {user?.role}
				</p>
			</div>
		</div>
	</div>

	<!-- Review Statistics -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg bg-card p-6 shadow-sm border">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Reviews</p>
					<p class="text-2xl font-bold text-foreground">{reviewStats.total}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
					<FileText class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-card p-6 shadow-sm border">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Completed</p>
					<p class="text-2xl font-bold text-green-600">{reviewStats.completed}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
					<CheckCircle class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-card p-6 shadow-sm border">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Average Rating</p>
					<p class="text-2xl font-bold text-yellow-600">
						{reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : 'N/A'}
					</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
					<Star class="h-6 w-6 text-yellow-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg bg-card p-6 shadow-sm border">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Next Review</p>
					<p class="text-sm font-bold text-foreground">
						{reviewStats.nextReviewDate ? formatDate(reviewStats.nextReviewDate) : 'Not scheduled'}
					</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
					<Calendar class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="rounded-lg bg-card p-4 shadow-sm border">
		<div class="flex flex-wrap gap-4">
			<div>
				<label for="status-filter" class="block text-sm font-medium text-foreground mb-1">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				>
					<option value="all">All Statuses</option>
					<option value="completed">Completed</option>
					<option value="in_progress">In Progress</option>
					<option value="scheduled">Scheduled</option>
					<option value="overdue">Overdue</option>
				</select>
			</div>

			<div>
				<label for="type-filter" class="block text-sm font-medium text-foreground mb-1">
					Review Type
				</label>
				<select
					id="type-filter"
					bind:value={selectedType}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				>
					<option value="all">All Types</option>
					{#each reviewTypes as type}
						<option value={type.id}>{type.name}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Reviews List -->
	<div class="space-y-6">
		{#each filteredReviews as review}
			{@const StatusIcon = getStatusIcon(review.status)}
			<div class="rounded-lg bg-card shadow-sm border">
				<!-- Review Header -->
				<div class="p-6 border-b border">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<div>
								<div class="flex items-center gap-2 mb-1">
									<h3 class="text-lg font-semibold text-foreground">{review.type.name}</h3>
									<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getTypeColor(review.type.color)}">
										{review.type.frequency}
									</span>
								</div>
								<p class="text-sm text-muted-foreground">
									Review Period: {formatDate(review.reviewPeriod.start)} - {formatDate(review.reviewPeriod.end)}
								</p>
							</div>
						</div>

						<div class="flex items-center gap-4">
							<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium {getStatusColor(review.status)}">
								<StatusIcon class="h-3 w-3" />
								{review.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
							</span>

							{#if review.status === 'completed' && review.overallRating}
								{@const { fullStars, hasHalfStar } = getRatingStars(review.overallRating)}
								<div class="flex items-center gap-1">
									{#each Array(fullStars) as _}
										<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
									{/each}
									{#if hasHalfStar}
										<Star class="h-4 w-4 fill-yellow-200 text-yellow-400" />
									{/if}
									{#each Array(5 - fullStars - (hasHalfStar ? 1 : 0)) as _}
										<Star class="h-4 w-4 text-muted-foreground" />
									{/each}
									<span class="ml-1 text-sm font-medium text-foreground">{review.overallRating}</span>
								</div>
							{/if}

							<button
								onclick={() => toggleReviewExpansion(review.id)}
								class="text-blue-600 hover:text-blue-800 text-sm font-medium"
							>
								{expandedReview === review.id ? 'Show Less' : 'View Details'}
							</button>
						</div>
					</div>

					<div class="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
						<div class="flex items-center gap-1">
							<User class="h-4 w-4" />
							<span>Reviewer: {review.reviewer.displayName}</span>
						</div>
						<div class="flex items-center gap-1">
							<Calendar class="h-4 w-4" />
							<span>
								{review.status === 'completed' ? 'Completed' : 'Scheduled'}:
								{formatDate(review.completedDate || review.scheduledDate)}
							</span>
						</div>
					</div>
				</div>

				<!-- Expanded Review Details -->
				{#if expandedReview === review.id && review.status === 'completed'}
					<div class="p-6 space-y-6">
						<!-- Competency Ratings -->
						<div>
							<h4 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
								<Award class="h-5 w-5" />
								Competency Ratings
							</h4>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{#each review.competencies as competency}
									{@const { fullStars, hasHalfStar } = getRatingStars(competency.rating)}
									<div class="bg-muted dark:bg-muted p-4 rounded-lg">
										<div class="flex items-center justify-between mb-2">
											<span class="font-medium text-foreground">{competency.name}</span>
											<div class="flex items-center gap-1">
												{#each Array(fullStars) as _}
													<Star class="h-3 w-3 fill-yellow-400 text-yellow-400" />
												{/each}
												{#if hasHalfStar}
													<Star class="h-3 w-3 fill-yellow-200 text-yellow-400" />
												{/if}
												{#each Array(5 - fullStars - (hasHalfStar ? 1 : 0)) as _}
													<Star class="h-3 w-3 text-muted-foreground" />
												{/each}
												<span class="ml-1 text-xs text-muted-foreground">{competency.rating}</span>
											</div>
										</div>
										<p class="text-xs text-muted-foreground">{competency.feedback}</p>
									</div>
								{/each}
							</div>
						</div>

						<!-- Goals Assessment -->
						{#if review.goals && review.goals.length > 0}
							<div>
								<h4 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
									<Target class="h-5 w-5" />
									Goal Achievement
								</h4>
								<div class="space-y-3">
									{#each review.goals as goal}
										<div class="bg-muted dark:bg-muted p-4 rounded-lg">
											<div class="flex items-center justify-between mb-2">
												<span class="font-medium text-foreground">{goal.title}</span>
												<span class="text-sm font-medium {getGoalStatusColor(goal.status)}">
													{goal.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
												</span>
											</div>
											<p class="text-sm text-muted-foreground mb-2">{goal.description}</p>
											<div class="w-full bg-gray-200 rounded-full h-2">
												<div
													class="h-2 rounded-full bg-blue-500"
													style="width: {goal.progress}%"
												></div>
											</div>
											<span class="text-xs text-muted-foreground">{goal.progress}% complete</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Feedback -->
						<div>
							<h4 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
								<MessageSquare class="h-5 w-5" />
								Feedback
							</h4>
							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div>
									<h5 class="font-medium text-green-700 mb-2">Strengths</h5>
									<ul class="space-y-1">
										{#each review.feedback.strengths as strength}
											<li class="text-sm text-muted-foreground">• {strength}</li>
										{/each}
									</ul>
								</div>
								<div>
									<h5 class="font-medium text-blue-700 mb-2">Areas for Improvement</h5>
									<ul class="space-y-1">
										{#each review.feedback.improvements as improvement}
											<li class="text-sm text-muted-foreground">• {improvement}</li>
										{/each}
									</ul>
								</div>
							</div>

							<div class="mt-4 space-y-4">
								<div>
									<h5 class="font-medium text-foreground mb-2">Manager's Comments</h5>
									<p class="text-sm text-muted-foreground bg-muted dark:bg-muted p-3 rounded">{review.feedback.managerComments}</p>
								</div>
								{#if review.feedback.employeeComments}
									<div>
										<h5 class="font-medium text-foreground mb-2">Employee's Response</h5>
										<p class="text-sm text-muted-foreground bg-blue-50 p-3 rounded">{review.feedback.employeeComments}</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Development Plan -->
						{#if review.developmentPlan && review.developmentPlan.length > 0}
							<div>
								<h4 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
									<BookOpen class="h-5 w-5" />
									Development Plan
								</h4>
								<ul class="space-y-2">
									{#each review.developmentPlan as item}
										<li class="flex items-center gap-2 text-sm text-muted-foreground">
											<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
											{item}
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}

				<!-- In-Progress Review Status -->
				{#if expandedReview === review.id && review.status === 'in_progress'}
					<div class="p-6 bg-blue-50 border-t border-blue-200">
						<div class="flex items-center gap-2 mb-2">
							<Clock class="h-5 w-5 text-blue-600" />
							<h4 class="font-medium text-blue-900">Review in Progress</h4>
						</div>
						<p class="text-sm text-blue-700">
							This review is currently being conducted. Details will be available once completed.
						</p>
					</div>
				{/if}

				<!-- Scheduled Review Status -->
				{#if expandedReview === review.id && review.status === 'scheduled'}
					<div class="p-6 bg-muted dark:bg-muted border-t border">
						<div class="flex items-center gap-2 mb-2">
							<Calendar class="h-5 w-5 text-muted-foreground" />
							<h4 class="font-medium text-foreground">Scheduled Review</h4>
						</div>
						<p class="text-sm text-foreground">
							This review is scheduled for {formatDate(review.scheduledDate)}.
							You will receive a notification when it's time to begin.
						</p>
					</div>
				{/if}
			</div>
		{:else}
			<div class="rounded-lg bg-card p-8 shadow-sm border text-center">
				<FileText class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
				<h3 class="text-lg font-medium text-foreground mb-2">No reviews found</h3>
				<p class="text-muted-foreground">
					{selectedStatus !== 'all' || selectedType !== 'all'
						? 'No reviews match your current filters.'
						: isOwnReviews
						? 'You have no performance reviews yet.'
						: 'This user has no performance reviews yet.'}
				</p>
			</div>
		{/each}
	</div>
</div>