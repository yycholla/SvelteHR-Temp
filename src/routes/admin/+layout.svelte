<script lang="ts">
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
	import { onMount } from 'svelte';

	const { children } = $props();

	onMount(() => {
		console.log('Mounting Admin Layout');
	});
</script>

<div class="flex h-screen w-full bg-background overflow-hidden">
	<!-- Admin Sidebar -->
	<AdminSidebar />

	<!-- Content Area -->
	<main class="flex-1 min-w-0 overflow-auto">
		{@render children()}
	</main>
</div>
