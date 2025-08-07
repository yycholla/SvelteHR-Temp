<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import { 
		Users, 
		UserPlus, 
		Calendar, 
		Clock, 
		TrendingUp, 
		TrendingDown,
		AlertCircle,
		CheckCircle,
		BarChart3,
		PieChart
	} from 'lucide-svelte';
	
	// Mock data for home page
	const stats = [
		{
			title: 'Your Team',
			value: '248',
			change: '+12',
			changeType: 'positive',
			icon: Users,
			description: 'Team members'
		},
		{
			title: 'New Colleagues',
			value: '16',
			change: '+4',
			changeType: 'positive',
			icon: UserPlus,
			description: 'Joined this month'
		},
		{
			title: 'Tasks Due',
			value: '5',
			change: '-2',
			changeType: 'positive',
			icon: Clock,
			description: 'This week'
		},
		{
			title: 'Time Off',
			value: '3',
			change: 'days',
			changeType: 'neutral',
			icon: Calendar,
			description: 'Available'
		}
	];
	
	const recentActivities = [
		{
			id: 1,
			type: 'welcome',
			message: 'Welcome Sarah Johnson, our new Senior Developer!',
			time: '2 hours ago',
			avatar: 'SJ'
		},
		{
			id: 2,
			type: 'achievement',
			message: 'Congratulations Mike Davis on completing your Q1 goals!',
			time: '4 hours ago',
			avatar: 'MD'
		},
		{
			id: 3,
			type: 'celebration',
			message: 'Emma Wilson is enjoying her well-deserved vacation',
			time: '1 day ago',
			avatar: 'EW'
		},
		{
			id: 4,
			type: 'birthday',
			message: 'Don\'t forget to wish John Smith a happy birthday tomorrow! 🎉',
			time: '1 day ago',
			avatar: 'JS'
		}
	];
	
	const upcomingEvents = [
		{
			id: 1,
			title: 'Coffee Chat & Connect',
			date: 'Today, 2:00 PM',
			attendees: 15,
			type: 'social'
		},
		{
			id: 2,
			title: 'Learning & Development Workshop',
			date: 'Tomorrow, 9:00 AM',
			attendees: 12,
			type: 'learning'
		},
		{
			id: 3,
			title: 'Welcome New Team Members',
			date: 'Friday, 10:00 AM',
			attendees: 5,
			type: 'welcome'
		}
	];
	
	const departmentData = [
		{ name: 'Engineering', employees: 89, budget: 85 },
		{ name: 'Sales', employees: 45, budget: 92 },
		{ name: 'Marketing', employees: 32, budget: 78 },
		{ name: 'HR', employees: 12, budget: 95 },
		{ name: 'Operations', employees: 28, budget: 68 }
	];
	
	// Reactive window width
	let windowWidth = $state(1200);
	
	function updateWindowWidth() {
		windowWidth = window.innerWidth;
	}
	
	// Set up window resize listener
	if (typeof window !== 'undefined') {
		updateWindowWidth(); // Initialize
		window.addEventListener('resize', updateWindowWidth);
	}
</script>

<div class="container mx-auto px-6 pb-6 pt-6 space-y-10">
	<!-- Branding Section -->
	<div class="fixed left-6 z-40 flex items-center space-x-4" style="top: 16px;">
		<div class="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
			<span class="text-primary-foreground font-bold text-sm">HR</span>
		</div>
		{#if windowWidth >= 884}
			<div class="flex items-center">
				<h1 class="font-bold text-3xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					SvelteHR
				</h1>
			</div>
		{/if}
	</div>

	<!-- Hero Welcome Section -->
	<div class="text-center space-y-4 py-8">
		<h2 class="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
			Welcome back, John! 
		</h2>
		<p class="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
			Ready to make today amazing? Here's your personalized workspace with everything you need.
		</p>
		<div class="flex items-center justify-center space-x-2 text-muted-foreground">
			<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
			<span class="text-sm">All systems running smoothly</span>
		</div>
	</div>

	<!-- Stats Overview -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each stats as stat}
			<Card class="bg-background/20 backdrop-blur-md border-border/40 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 rounded-2xl border">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
					<CardTitle class="text-sm font-semibold text-foreground/90">{stat.title}</CardTitle>
					{@const IconComponent = stat.icon}
					<div class="p-2 bg-primary/10 rounded-full">
						<IconComponent class="h-4 w-4 text-primary" />
					</div>
				</CardHeader>
				<CardContent class="pt-0">
					<div class="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
						{stat.value}
					</div>
					<div class="flex items-center mt-2 gap-1">
						{#if stat.changeType === 'positive'}
							<div class="flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
								<TrendingUp class="h-3 w-3 text-green-600 dark:text-green-400" />
								<span class="text-xs font-medium text-green-600 dark:text-green-400 ml-1">{stat.change}</span>
							</div>
						{:else if stat.changeType === 'negative'}
							<div class="flex items-center px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
								<TrendingDown class="h-3 w-3 text-red-600 dark:text-red-400" />
								<span class="text-xs font-medium text-red-600 dark:text-red-400 ml-1">{stat.change}</span>
							</div>
						{:else}
							<div class="flex items-center px-2 py-1 bg-muted rounded-full">
								<span class="text-xs font-medium text-muted-foreground">{stat.change}</span>
							</div>
						{/if}
						<span class="text-xs text-muted-foreground ml-1">{stat.description}</span>
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
		<!-- Recent Activity -->
		<Card class="col-span-4 bg-background/20 backdrop-blur-md border-border/40 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader>
				<CardTitle>What's Happening</CardTitle>
				<CardDescription>Latest updates and celebrations from your workplace</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#each recentActivities as activity}
					<div class="flex items-center space-x-4 p-3 rounded-2xl hover:bg-muted/50 transition-all duration-200">
						<Avatar size="sm">
							<AvatarFallback class="bg-primary/10 text-primary font-semibold">{activity.avatar}</AvatarFallback>
						</Avatar>
						<div class="flex-1 space-y-1">
							<p class="text-sm font-medium">{activity.message}</p>
							<p class="text-xs text-muted-foreground">{activity.time}</p>
						</div>
						{#if activity.type === 'welcome'}
							<Badge variant="success" class="rounded-full px-3">Welcome</Badge>
						{:else if activity.type === 'achievement'}
							<Badge variant="info" class="rounded-full px-3">Achievement</Badge>
						{:else if activity.type === 'celebration'}
							<Badge variant="warning" class="rounded-full px-3">Celebration</Badge>
						{:else if activity.type === 'birthday'}
							<Badge variant="default" class="rounded-full px-3">🎉 Birthday</Badge>
						{:else}
							<Badge variant="default" class="rounded-full px-3">Update</Badge>
						{/if}
					</div>
				{/each}
				<div class="pt-2">
					<Button variant="outline" class="w-full rounded-xl hover:scale-[1.02] transition-all duration-200">View All Activities</Button>
				</div>
			</CardContent>
		</Card>

		<!-- Upcoming Events -->
		<Card class="col-span-3 bg-background/20 backdrop-blur-md border-border/40 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader>
				<CardTitle>Coming Up</CardTitle>
				<CardDescription>Events and activities you won't want to miss</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#each upcomingEvents as event}
					<div class="flex items-center justify-between space-x-4">
						<div class="space-y-1">
							<p class="text-sm font-medium">{event.title}</p>
							<p class="text-xs text-muted-foreground">{event.date}</p>
							<p class="text-xs text-muted-foreground">{event.attendees} attendees</p>
						</div>
						{#if event.type === 'social'}
							<Calendar class="h-4 w-4 text-blue-500" />
						{:else if event.type === 'learning'}
							<CheckCircle class="h-4 w-4 text-green-500" />
						{:else if event.type === 'welcome'}
							<UserPlus class="h-4 w-4 text-purple-500" />
						{:else}
							<Calendar class="h-4 w-4 text-muted-foreground" />
						{/if}
					</div>
				{/each}
				<div class="pt-2">
					<Button variant="outline" class="w-full rounded-xl hover:scale-[1.02] transition-all duration-200">View Calendar</Button>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Quick Actions -->
	<Card class="bg-background/20 backdrop-blur-md border-border/40 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
		<CardHeader>
			<CardTitle>Quick Actions</CardTitle>
			<CardDescription>Everything you need, right at your fingertips</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Button variant="outline" class="h-24 flex-col space-y-3 rounded-xl border-2 hover:scale-105 hover:shadow-md transition-all duration-200 hover:border-primary/50">
					<div class="p-2 bg-primary/10 rounded-full">
						<Users class="h-5 w-5 text-primary" />
					</div>
					<span class="text-sm font-medium">Find Colleagues</span>
				</Button>
				<Button variant="outline" class="h-24 flex-col space-y-3 rounded-xl border-2 hover:scale-105 hover:shadow-md transition-all duration-200 hover:border-primary/50">
					<div class="p-2 bg-primary/10 rounded-full">
						<Calendar class="h-5 w-5 text-primary" />
					</div>
					<span class="text-sm font-medium">Request Time Off</span>
				</Button>
				<Button variant="outline" class="h-24 flex-col space-y-3 rounded-xl border-2 hover:scale-105 hover:shadow-md transition-all duration-200 hover:border-primary/50">
					<div class="p-2 bg-primary/10 rounded-full">
						<BarChart3 class="h-5 w-5 text-primary" />
					</div>
					<span class="text-sm font-medium">View My Goals</span>
				</Button>
				<Button variant="outline" class="h-24 flex-col space-y-3 rounded-xl border-2 hover:scale-105 hover:shadow-md transition-all duration-200 hover:border-primary/50">
					<div class="p-2 bg-primary/10 rounded-full">
						<CheckCircle class="h-5 w-5 text-primary" />
					</div>
					<span class="text-sm font-medium">Complete Training</span>
				</Button>
			</div>
		</CardContent>
	</Card>
</div>