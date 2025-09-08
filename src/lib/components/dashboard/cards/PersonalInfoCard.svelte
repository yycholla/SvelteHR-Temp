<script lang="ts">
	import { User, Mail, Phone, MapPin } from 'lucide-svelte';
	import type { CardProps } from '../types.js';

	let { instance, metadata, data }: CardProps = $props();

	// Mock user data - in real app this would come from props.data
	const mockUser = {
		name: 'John Doe',
		email: 'john.doe@company.com',
		phone: '+1 (555) 123-4567',
		department: 'Engineering',
		position: 'Senior Developer',
		location: 'New York, NY',
		employeeId: 'EMP001',
		startDate: '2022-01-15'
	};
</script>

<div class="h-full overflow-hidden">
	<div class="flex h-full items-center space-x-3">
		<div
			class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10"
		>
			<User class="h-6 w-6 text-primary" />
		</div>
		<div class="min-w-0 flex-1">
			<h3 class="truncate text-base font-semibold text-foreground">{mockUser.name}</h3>
			<p class="truncate text-sm text-muted-foreground">{mockUser.position}</p>
			<p class="truncate text-sm text-muted-foreground">{mockUser.department}</p>
		</div>
	</div>
</div>
