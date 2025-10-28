<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between pb-2">
		<Skeleton class="h-4 w-24" />
		<Skeleton class="h-8 w-8 rounded-full" />
	</Card.Header>
	<Card.Content>
		<Skeleton class="h-8 w-16 mb-1" />
		<Skeleton class="h-3 w-32" />
	</Card.Content>
</Card.Root>
