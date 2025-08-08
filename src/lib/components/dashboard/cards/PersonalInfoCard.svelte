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
	<div class="flex items-center space-x-3 h-full">
		<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
			<User class="h-6 w-6 text-primary" />
		</div>
		<div class="flex-1 min-w-0">
			<h3 class="font-semibold text-foreground text-base truncate">{mockUser.name}</h3>
			<p class="text-sm text-muted-foreground truncate">{mockUser.position}</p>
			<p class="text-sm text-muted-foreground truncate">{mockUser.department}</p>
		</div>
	</div>
</div>