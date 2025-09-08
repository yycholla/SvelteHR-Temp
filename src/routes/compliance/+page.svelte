<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import {
		Search,
		Filter,
		Plus,
		CheckCircle,
		XCircle,
		Clock,
		AlertTriangle,
		User,
		Calendar,
		FileText,
		MoreVertical,
		Shield,
		Target,
		BookOpen,
		TrendingUp
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let searchQuery = $state(data.filters.search || '');
	let statusFilter = $state(data.filters.status || '');
	let categoryFilter = $state(data.filters.category || '');
	let newRequirementOpen = $state(false);

	// Filter options
	const statusOptions = [
		{ value: '', label: 'All Status' },
		{ value: 'compliant', label: 'Compliant' },
		{ value: 'non_compliant', label: 'Non-Compliant' },
		{ value: 'pending', label: 'Pending Review' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'overdue', label: 'Overdue' }
	];

	const categoryOptions = [
		{ value: '', label: 'All Categories' },
		{ value: 'safety', label: 'Safety & Health' },
		{ value: 'training', label: 'Training & Certification' },
		{ value: 'legal', label: 'Legal & Regulatory' },
		{ value: 'financial', label: 'Financial Compliance' },
		{ value: 'data', label: 'Data Protection' },
		{ value: 'hr', label: 'HR Policies' }
	];

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.append('search', searchQuery);
		if (statusFilter) params.append('status', statusFilter);
		if (categoryFilter) params.append('category', categoryFilter);

		const query = params.toString();
		goto(`/compliance${query ? '?' + query : ''}`, { replaceState: true });
	}

	// Clear filters
	function clearFilters() {
		searchQuery = '';
		statusFilter = '';
		categoryFilter = '';
		goto('/compliance', { replaceState: true });
	}

	// Get status badge variant
	function getStatusBadge(status: string) {
		switch (status.toLowerCase()) {
			case 'compliant':
				return { variant: 'success', label: 'Compliant', icon: CheckCircle };
			case 'non_compliant':
				return { variant: 'destructive', label: 'Non-Compliant', icon: XCircle };
			case 'pending':
				return { variant: 'warning', label: 'Pending Review', icon: Clock };
			case 'in_progress':
				return { variant: 'info', label: 'In Progress', icon: Clock };
			case 'overdue':
				return { variant: 'destructive', label: 'Overdue', icon: AlertTriangle };
			default:
				return { variant: 'default', label: status, icon: Clock };
		}
	}

	// Get category badge
	function getCategoryBadge(category: string) {
		switch (category.toLowerCase()) {
			case 'safety':
				return { label: 'Safety & Health', icon: Shield };
			case 'training':
				return { label: 'Training', icon: BookOpen };
			case 'legal':
				return { label: 'Legal', icon: FileText };
			case 'financial':
				return { label: 'Financial', icon: Target };
			case 'data':
				return { label: 'Data Protection', icon: Shield };
			case 'hr':
				return { label: 'HR Policies', icon: User };
			default:
				return { label: category, icon: FileText };
		}
	}

	// Format date
	function formatDate(dateString: string) {
		if (!dateString) return 'No due date';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString();
		} catch {
			return 'Invalid date';
		}
	}

	// Check if date is approaching (within 30 days)
	function isApproaching(dateString: string) {
		if (!dateString) return false;
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffTime = date.getTime() - now.getTime();
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			return diffDays <= 30 && diffDays >= 0;
		} catch {
			return false;
		}
	}

	// Get initials for avatar
	function getInitials(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	// Calculate compliance percentage
	const compliancePercentage = $derived(() => {
		if (data.stats.totalItems === 0) return 0;
		return Math.round((data.stats.compliant / data.stats.totalItems) * 100);
	});
</script>

<div class="container mx-auto max-w-7xl space-y-6 px-6 pt-6 pb-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1
				class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-3xl font-bold text-transparent"
			>
				Compliance Tracking
			</h1>
			<p class="mt-2 text-muted-foreground">
				Monitor and manage compliance requirements and deadlines
			</p>
		</div>
		<Button
			class="rounded-xl transition-all duration-200 hover:scale-[1.02]"
			onclick={() => (newRequirementOpen = true)}
		>
			<Plus class="mr-2 h-4 w-4" />
			New Requirement
		</Button>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-5">
		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Items</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.totalItems}</p>
					</div>
					<div class="rounded-full bg-primary/10 p-3">
						<FileText class="h-5 w-5 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Compliant</p>
						<p class="text-2xl font-bold text-green-600">{data.stats.compliant}</p>
					</div>
					<div class="rounded-full bg-green-100 p-3">
						<CheckCircle class="h-5 w-5 text-green-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Non-Compliant</p>
						<p class="text-2xl font-bold text-red-600">{data.stats.nonCompliant}</p>
					</div>
					<div class="rounded-full bg-red-100 p-3">
						<XCircle class="h-5 w-5 text-red-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pending</p>
						<p class="text-2xl font-bold text-yellow-600">{data.stats.pending}</p>
					</div>
					<div class="rounded-full bg-yellow-100 p-3">
						<Clock class="h-5 w-5 text-yellow-600" />
					</div>
				</div>
			</CardContent>
		</Card>

		<Card
			class="rounded-2xl border border-border bg-white shadow-lg transition-all duration-200 hover:shadow-xl"
		>
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Due Soon</p>
						<p class="text-2xl font-bold text-orange-600">{data.stats.upcomingDeadlines}</p>
					</div>
					<div class="rounded-full bg-orange-100 p-3">
						<AlertTriangle class="h-5 w-5 text-orange-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Compliance Rate -->
	<Card class="rounded-2xl border border-border bg-white shadow-lg">
		<CardHeader>
			<CardTitle class="flex items-center">
				<TrendingUp class="mr-2 h-5 w-5 text-primary" />
				Compliance Rate
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-muted-foreground">Overall Compliance</span>
					<span class="text-2xl font-bold text-primary">{compliancePercentage()}%</span>
				</div>
				<Progress value={compliancePercentage()} class="h-2" />
				<p class="text-xs text-muted-foreground">
					{data.stats.compliant} of {data.stats.totalItems} requirements are compliant
				</p>
			</div>
		</CardContent>
	</Card>

	<!-- Filters -->
	<Card class="rounded-2xl border border-border bg-white shadow-lg">
		<CardHeader class="pb-4">
			<CardTitle class="flex items-center text-lg font-semibold">
				<Filter class="mr-2 h-5 w-5 text-primary" />
				Filters
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
				<div class="space-y-2">
					<Label for="search">Search Requirements</Label>
					<div class="relative">
						<Search class="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							id="search"
							bind:value={searchQuery}
							placeholder="Search by title or description..."
							class="rounded-xl pl-10"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									applyFilters();
								}
							}}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="status">Status</Label>
					<select
						id="status"
						bind:value={statusFilter}
						class="w-full rounded-xl border-border bg-background px-3 py-2 transition-all duration-200 focus:bg-background"
					>
						{#each statusOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<Label for="category">Category</Label>
					<select
						id="category"
						bind:value={categoryFilter}
						class="w-full rounded-xl border-border bg-background px-3 py-2 transition-all duration-200 focus:bg-background"
					>
						{#each categoryOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div class="col-span-2 flex items-end space-x-2">
					<Button onclick={applyFilters} class="flex-1 rounded-xl">Apply</Button>
					<Button variant="outline" onclick={clearFilters} class="rounded-xl">Clear</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Compliance Items List -->
	<Card class="rounded-2xl border border-border bg-white shadow-lg">
		<CardHeader>
			<CardTitle>Compliance Requirements ({data.complianceItems.length})</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.complianceItems.length === 0}
				<div class="py-12 text-center">
					<Shield class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<h3 class="mb-2 text-lg font-semibold text-muted-foreground">
						No Compliance Items Found
					</h3>
					<p class="text-muted-foreground">
						{data.isUsingMockData
							? 'Connect to your API to see real compliance requirements.'
							: 'No items match your current filters.'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.complianceItems as item}
						{@const statusBadge = getStatusBadge(item.status)}
						{@const categoryBadge = getCategoryBadge(item.category)}
						{@const StatusIcon = statusBadge.icon}
						{@const CategoryIcon = categoryBadge.icon}

						<div
							class="rounded-xl border border-border p-4 transition-all duration-200 hover:bg-muted/30"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-3">
									<div class="flex items-center space-x-3">
										<h3 class="cursor-pointer font-semibold text-foreground hover:text-primary">
											{item.title}
										</h3>
										<Badge variant={statusBadge.variant} class="text-xs">
											<StatusIcon class="mr-1 h-3 w-3" />
											{statusBadge.label}
										</Badge>
										<Badge variant="outline" class="text-xs">
											<CategoryIcon class="mr-1 h-3 w-3" />
											{categoryBadge.label}
										</Badge>
										{#if item.dueDate && isApproaching(item.dueDate)}
											<Badge variant="warning" class="text-xs">
												<AlertTriangle class="mr-1 h-3 w-3" />
												Due Soon
											</Badge>
										{/if}
									</div>

									{#if item.description}
										<p class="line-clamp-2 text-sm text-muted-foreground">
											{item.description}
										</p>
									{/if}

									<div class="flex items-center space-x-6 text-xs text-muted-foreground">
										<div class="flex items-center space-x-1">
											<User class="h-3 w-3" />
											<span>{item.assignedToName}</span>
										</div>
										{#if item.dueDate}
											<div class="flex items-center space-x-1">
												<Calendar class="h-3 w-3" />
												<span>Due: {formatDate(item.dueDate)}</span>
											</div>
										{/if}
										{#if item.completedDate}
											<div class="flex items-center space-x-1">
												<CheckCircle class="h-3 w-3" />
												<span>Completed: {formatDate(item.completedDate)}</span>
											</div>
										{/if}
										{#if item.documents && item.documents.length > 0}
											<div class="flex items-center space-x-1">
												<FileText class="h-3 w-3" />
												<span>{item.documents.length} documents</span>
											</div>
										{/if}
									</div>
								</div>

								<div class="flex items-center space-x-2">
									<Avatar size="sm">
										<AvatarFallback class="bg-primary/10 text-xs text-primary">
											{getInitials(item.assignedToName)}
										</AvatarFallback>
									</Avatar>
									<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
										<MoreVertical class="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.totalPages > 1}
					<div class="mt-6 flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Showing {(data.page - 1) * data.limit + 1} to {Math.min(
								data.page * data.limit,
								data.totalCount
							)} of {data.totalCount} items
						</p>
						<div class="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								disabled={data.page <= 1}
								onclick={() => goto(`/compliance?page=${data.page - 1}`)}
								class="rounded-lg"
							>
								Previous
							</Button>
							<span class="text-sm font-medium">
								Page {data.page} of {data.totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={!data.hasMore}
								onclick={() => goto(`/compliance?page=${data.page + 1}`)}
								class="rounded-lg"
							>
								Next
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>

{#if typeof newRequirementOpen === 'undefined'}
	{@html ''}
{/if}
{#if newRequirementOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="w-full max-w-md rounded-xl border border-border bg-background p-6">
			<h3 class="mb-2 font-semibold">Create Compliance Item</h3>
			<p class="mb-4 text-sm text-muted-foreground">
				Placeholder modal. Hook up your compliance form here.
			</p>
			<div class="flex justify-end">
				<Button variant="outline" onclick={() => (newRequirementOpen = false)}>Close</Button>
			</div>
		</div>
	</div>
{/if}
