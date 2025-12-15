<script lang="ts">
	import { Search, Shield, Users } from '@lucide/svelte';

	interface Props {
		activeTab: 'roles' | 'users';
		searchQuery: string;
	}

	let { activeTab = $bindable(), searchQuery = $bindable() }: Props = $props();
</script>

<div class="border-b">
	<div class="flex gap-4">
		<button
			onclick={() => (activeTab = 'roles')}
			class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors"
			class:border-primary={activeTab === 'roles'}
			class:text-primary={activeTab === 'roles'}
			class:border-transparent={activeTab !== 'roles'}
			class:text-muted-foreground={activeTab !== 'roles'}
		>
			<Shield class="h-4 w-4" />
			Roles & Permissions
		</button>
		<button
			onclick={() => (activeTab = 'users')}
			class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors"
			class:border-primary={activeTab === 'users'}
			class:text-primary={activeTab === 'users'}
			class:border-transparent={activeTab !== 'users'}
			class:text-muted-foreground={activeTab !== 'users'}
		>
			<Users class="h-4 w-4" />
			User Role Assignment
		</button>
	</div>
</div>

<!-- Search Bar -->
<div class="relative mt-6">
	<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
	<input
		type="text"
		bind:value={searchQuery}
		placeholder={activeTab === 'roles'
			? 'Search roles by name or description...'
			: 'Search users by email or name...'}
		class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
	/>
</div>
