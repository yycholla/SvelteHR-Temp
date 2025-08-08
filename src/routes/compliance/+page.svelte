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
			case 'compliant': return { variant: 'success', label: 'Compliant', icon: CheckCircle };
			case 'non_compliant': return { variant: 'destructive', label: 'Non-Compliant', icon: XCircle };
			case 'pending': return { variant: 'warning', label: 'Pending Review', icon: Clock };
			case 'in_progress': return { variant: 'info', label: 'In Progress', icon: Clock };
			case 'overdue': return { variant: 'destructive', label: 'Overdue', icon: AlertTriangle };
			default: return { variant: 'default', label: status, icon: Clock };
		}
	}
	
	// Get category badge
	function getCategoryBadge(category: string) {
		switch (category.toLowerCase()) {
			case 'safety': return { label: 'Safety & Health', icon: Shield };
			case 'training': return { label: 'Training', icon: BookOpen };
			case 'legal': return { label: 'Legal', icon: FileText };
			case 'financial': return { label: 'Financial', icon: Target };
			case 'data': return { label: 'Data Protection', icon: Shield };
			case 'hr': return { label: 'HR Policies', icon: User };
			default: return { label: category, icon: FileText };
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
			.map(n => n[0])
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

<div class="container mx-auto px-6 pb-6 pt-6 space-y-6 max-w-7xl">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Compliance Tracking</h1>
			<p class="text-muted-foreground mt-2">Monitor and manage compliance requirements and deadlines</p>
		</div>
		<Button class="rounded-xl hover:scale-[1.02] transition-all duration-200">
			<Plus class="h-4 w-4 mr-2" />
			New Requirement
		</Button>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-5 gap-6">
		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Items</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.totalItems}</p>
					</div>
					<div class="p-3 bg-primary/10 rounded-full">
						<FileText class="h-5 w-5 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Compliant</p>
						<p class="text-2xl font-bold text-green-600">{data.stats.compliant}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-full">
						<CheckCircle class="h-5 w-5 text-green-600" />
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Non-Compliant</p>
						<p class="text-2xl font-bold text-red-600">{data.stats.nonCompliant}</p>
					</div>
					<div class="p-3 bg-red-100 rounded-full">
						<XCircle class="h-5 w-5 text-red-600" />
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Pending</p>
						<p class="text-2xl font-bold text-yellow-600">{data.stats.pending}</p>
					</div>
					<div class="p-3 bg-yellow-100 rounded-full">
						<Clock class="h-5 w-5 text-yellow-600" />
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card class="bg-white border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardContent class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Due Soon</p>
						<p class="text-2xl font-bold text-orange-600">{data.stats.upcomingDeadlines}</p>
					</div>
					<div class="p-3 bg-orange-100 rounded-full">
						<AlertTriangle class="h-5 w-5 text-orange-600" />
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Compliance Rate -->
	<Card class="bg-white border-border shadow-lg rounded-2xl border">
		<CardHeader>
			<CardTitle class="flex items-center">
				<TrendingUp class="h-5 w-5 mr-2 text-primary" />
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
	<Card class="bg-white border-border shadow-lg rounded-2xl border">
		<CardHeader class="pb-4">
			<CardTitle class="flex items-center text-lg font-semibold">
				<Filter class="h-5 w-5 mr-2 text-primary" />
				Filters
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
				<div class="space-y-2">
					<Label for="search">Search Requirements</Label>
					<div class="relative">
						<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input 
							id="search"
							bind:value={searchQuery}
							placeholder="Search by title or description..."
							class="pl-10 rounded-xl"
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
						class="w-full px-3 py-2 rounded-xl bg-background border-border focus:bg-background transition-all duration-200"
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
						class="w-full px-3 py-2 rounded-xl bg-background border-border focus:bg-background transition-all duration-200"
					>
						{#each categoryOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				
				<div class="flex items-end space-x-2 col-span-2">
					<Button onclick={applyFilters} class="rounded-xl flex-1">
						Apply
					</Button>
					<Button variant="outline" onclick={clearFilters} class="rounded-xl">
						Clear
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Compliance Items List -->
	<Card class="bg-white border-border shadow-lg rounded-2xl border">
		<CardHeader>
			<CardTitle>Compliance Requirements ({data.complianceItems.length})</CardTitle>
		</CardHeader>
		<CardContent>
			{#if data.complianceItems.length === 0}
				<div class="text-center py-12">
					<Shield class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 class="text-lg font-semibold text-muted-foreground mb-2">No Compliance Items Found</h3>
					<p class="text-muted-foreground">
						{data.isUsingMockData ? 'Connect to your API to see real compliance requirements.' : 'No items match your current filters.'}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.complianceItems as item}
						{@const statusBadge = getStatusBadge(item.status)}
						{@const categoryBadge = getCategoryBadge(item.category)}
						{@const StatusIcon = statusBadge.icon}
						{@const CategoryIcon = categoryBadge.icon}
						
						<div class="p-4 border border-border rounded-xl hover:bg-muted/30 transition-all duration-200">
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-3">
									<div class="flex items-center space-x-3">
										<h3 class="font-semibold text-foreground hover:text-primary cursor-pointer">
											{item.title}
										</h3>
										<Badge variant={statusBadge.variant} class="text-xs">
											<StatusIcon class="h-3 w-3 mr-1" />
											{statusBadge.label}
										</Badge>
										<Badge variant="outline" class="text-xs">
											<CategoryIcon class="h-3 w-3 mr-1" />
											{categoryBadge.label}
										</Badge>
										{#if item.dueDate && isApproaching(item.dueDate)}
											<Badge variant="warning" class="text-xs">
												<AlertTriangle class="h-3 w-3 mr-1" />
												Due Soon
											</Badge>
										{/if}
									</div>
									
									{#if item.description}
										<p class="text-sm text-muted-foreground line-clamp-2">
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
										<AvatarFallback class="bg-primary/10 text-primary text-xs">
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
					<div class="flex items-center justify-between mt-6">
						<p class="text-sm text-muted-foreground">
							Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.totalCount)} of {data.totalCount} items
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