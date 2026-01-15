<script lang="ts">
	import { Building2, Grid, Maximize, RotateCcw, Search, ZoomIn, ZoomOut } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		searchTerm: string;
		selectedDepartment: string;
		selectedLevel: string;
		showStats: boolean;
		departments: string[];
		onZoomIn: () => void;
		onZoomOut: () => void;
		onResetZoom: () => void;
		onAutoLayout: () => void;
	}

	let {
		searchTerm = $bindable(),
		selectedDepartment = $bindable(),
		selectedLevel = $bindable(),
		showStats = $bindable(),
		departments,
		onZoomIn,
		onZoomOut,
		onResetZoom,
		onAutoLayout
	}: Props = $props();
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="flex items-center gap-3 text-2xl font-bold tracking-tight">
				<Building2 class="h-7 w-7" />
				Organization Map
			</h2>
			<p class="text-sm text-muted-foreground">
				Company-wide organizational structure by levels and departments
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => (showStats = !showStats)}>
				<Grid class="h-4 w-4" />
				{showStats ? 'Hide' : 'Show'} Stats
			</Button>
		</div>
	</div>

	<!-- Filters and Controls -->
	<Card.Root>
		<Card.Content class="p-4">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<!-- Search and Filters -->
				<div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
					<div class="relative">
						<Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input placeholder="Search employees..." bind:value={searchTerm} class="w-64 pl-10" />
					</div>

					<select
						bind:value={selectedDepartment}
						class="h-9 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="all">All Departments</option>
						{#each departments as dept}
							<option value={dept}>{dept}</option>
						{/each}
					</select>

					<select
						bind:value={selectedLevel}
						class="h-9 rounded-md border border-input bg-background px-3 text-sm"
					>
						<option value="all">All Levels</option>
						<option value="80-100">Executive (80+)</option>
						<option value="60-79">Management (60-79)</option>
						<option value="40-59">Senior (40-59)</option>
						<option value="20-39">Staff (20-39)</option>
					</select>
				</div>

				<!-- Zoom Controls -->
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={onZoomIn}>
						<ZoomIn class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={onZoomOut}>
						<ZoomOut class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={onResetZoom}>
						<RotateCcw class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={onAutoLayout}>
						<Maximize class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
