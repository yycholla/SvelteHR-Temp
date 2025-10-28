<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="space-y-6">
	<!-- Page header with title and actions -->
	<div class="flex items-start justify-between">
		<div class="space-y-2">
			<Skeleton class="h-8 w-64" />
			<Skeleton class="h-4 w-96" />
		</div>
		<Skeleton class="h-10 w-32" />
	</div>

	<!-- Main content cards -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Primary content (left column, 2/3 width) -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Details card -->
			<Card.Root>
				<Card.Header>
					<Skeleton class="h-6 w-48" />
				</Card.Header>
				<Card.Content class="space-y-4">
					{#each Array(6) as _}
						<div class="flex items-center gap-4">
							<Skeleton class="h-4 w-32 flex-shrink-0" />
							<Skeleton class="h-4 flex-1" />
						</div>
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Description/content card -->
			<Card.Root>
				<Card.Header>
					<Skeleton class="h-6 w-32" />
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-3/4" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar (right column, 1/3 width) -->
		<div class="space-y-6">
			<!-- Metadata card -->
			<Card.Root>
				<Card.Header>
					<Skeleton class="h-6 w-32" />
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each Array(4) as _}
						<div class="space-y-1">
							<Skeleton class="h-3 w-24" />
							<Skeleton class="h-4 w-32" />
						</div>
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Actions card -->
			<Card.Root>
				<Card.Header>
					<Skeleton class="h-6 w-32" />
				</Card.Header>
				<Card.Content class="space-y-2">
					<Skeleton class="h-10 w-full" />
					<Skeleton class="h-10 w-full" />
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
