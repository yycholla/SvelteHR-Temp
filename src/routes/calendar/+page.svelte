<script lang="ts">
	import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<svelte:head>
	<title>Calendar - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					Calendar
				</h1>
				<p class="text-muted-foreground mt-1">
					Manage events, meetings, and time off
				</p>
			</div>
			
			<div class="flex items-center space-x-3">
				<Button variant="outline" class="rounded-xl">
					Today
				</Button>
				<Button class="rounded-xl">
					<Plus class="h-4 w-4 mr-2" />
					New Event
				</Button>
			</div>
		</div>
	</div>

	<!-- Calendar Navigation -->
	<div class="mb-6">
		<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md p-4 shadow-xl">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<Button variant="ghost" size="sm" class="rounded-xl">
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<h2 class="text-xl font-semibold">January 2024</h2>
					<Button variant="ghost" size="sm" class="rounded-xl">
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
				
				<div class="flex items-center rounded-xl border border-border/40 bg-background/20 p-1">
					<Button variant="default" size="sm" class="rounded-lg">
						Month
					</Button>
					<Button variant="ghost" size="sm" class="rounded-lg">
						Week
					</Button>
					<Button variant="ghost" size="sm" class="rounded-lg">
						Day
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Calendar Content -->
	<div class="rounded-2xl border border-border/40 bg-background/20 backdrop-blur-md p-6 shadow-xl">
		<div class="text-center py-20">
			<Calendar class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
			<h3 class="text-xl font-semibold mb-2">Calendar Coming Soon</h3>
			<p class="text-muted-foreground mb-6">
				The calendar feature is currently under development. It will include event management, scheduling, and time-off tracking.
			</p>
			<Button class="rounded-xl">
				<Plus class="h-4 w-4 mr-2" />
				Create First Event
			</Button>
		</div>
	</div>
</div>