<script lang="ts">
	import { Mail, Phone, MapPin, MoreHorizontal, Edit, Eye, MessageCircle } from 'lucide-svelte';
	import { formatHireDate } from '$lib/utils/date';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import DropdownMenu from '$lib/components/ui/dropdown-menu/dropdown-menu.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte';
	import DropdownMenuContent from '$lib/components/ui/dropdown-menu/dropdown-menu-content.svelte';
	import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
	import type { Employee } from '$lib/data/mockEmployees.js';
	import { goto } from '$app/navigation';

	let { employee }: { employee: Employee } = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE':
				return 'bg-green-500/20 text-green-700 border-green-500/30';
			case 'ON_LEAVE':
				return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
			case 'INACTIVE':
				return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
			default:
				return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
		}
	}

	function getDepartmentColor(color: string) {
		const colors: Record<string, string> = {
			blue: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
			green: 'bg-green-500/20 text-green-700 border-green-500/30',
			purple: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
			orange: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
			emerald: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
			indigo: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
			pink: 'bg-pink-500/20 text-pink-700 border-pink-500/30',
			slate: 'bg-slate-500/20 text-slate-700 border-slate-500/30'
		};
		return colors[color] || colors['slate'];
	}

	function getInitials(firstName: string, lastName: string) {
		return `${firstName.charAt(0)}${lastName.charAt(0)}`;
	}

	function viewEmployee() {
		goto(`/employees/${employee.id}`);
	}

	function editEmployee() {
		goto(`/employees/${employee.id}/edit`);
	}

	function messageEmployee() {
		// TODO: Implement messaging functionality
		console.log('Messaging employee:', employee.id);
	}
</script>

<div class="group relative">
	<div
		class="rounded-2xl border border-border/40 bg-background/10 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:bg-background/20 hover:shadow-xl"
	>
		<!-- Header with Avatar and Actions -->
		<div class="mb-4 flex items-start justify-between">
			<div class="flex items-center space-x-3">
				<Avatar class="h-12 w-12 ring-2 ring-background/50">
					{#if employee.avatar}
						<AvatarImage src={employee.avatar} alt="{employee.firstName} {employee.lastName}" />
					{/if}
					<AvatarFallback class="bg-primary/10 font-semibold text-primary">
						{getInitials(employee.firstName, employee.lastName)}
					</AvatarFallback>
				</Avatar>
				<div>
					<h3 class="text-lg font-semibold text-foreground">
						{employee.firstName}
						{employee.lastName}
					</h3>
					<p class="text-sm text-muted-foreground">{employee.employeeId}</p>
				</div>
			</div>

			<!-- Actions Menu -->
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						class="rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
					>
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					class="w-48 rounded-xl border-border/40 bg-background/95 backdrop-blur-md"
				>
					<DropdownMenuItem onclick={viewEmployee} class="rounded-lg">
						<Eye class="mr-2 h-4 w-4" />
						View Details
					</DropdownMenuItem>
					<DropdownMenuItem onclick={editEmployee} class="rounded-lg">
						<Edit class="mr-2 h-4 w-4" />
						Edit Employee
					</DropdownMenuItem>
					<DropdownMenuItem onclick={messageEmployee} class="rounded-lg">
						<MessageCircle class="mr-2 h-4 w-4" />
						Send Message
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>

		<!-- Position and Department -->
		<div class="mb-4">
			<p class="mb-2 font-medium text-foreground">{employee.position.title}</p>
			<div class="flex items-center justify-between">
				<Badge class="rounded-lg border {getDepartmentColor(employee.department.color)}">
					{employee.department.name}
				</Badge>
				<Badge class="rounded-lg border {getStatusColor(employee.status)}">
					{employee.status.replace('_', ' ')}
				</Badge>
			</div>
		</div>

		<!-- Contact Information -->
		<div class="mb-4 space-y-2">
			<div class="flex items-center space-x-2 text-sm text-muted-foreground">
				<Mail class="h-3 w-3 flex-shrink-0" />
				<span class="truncate">{employee.email}</span>
			</div>
			{#if employee.phone}
				<div class="flex items-center space-x-2 text-sm text-muted-foreground">
					<Phone class="h-3 w-3 flex-shrink-0" />
					<span>{employee.phone}</span>
				</div>
			{/if}
			<div class="flex items-center space-x-2 text-sm text-muted-foreground">
				<MapPin class="h-3 w-3 flex-shrink-0" />
				<span class="truncate">{employee.location}</span>
			</div>
		</div>

		<!-- Footer with Hire Date -->
		<div class="border-t border-border/20 pt-3 text-xs text-muted-foreground">
			Hired {formatHireDate(employee.hireDate)}
		</div>

		<!-- Quick Actions (visible on hover) -->
		<div
			class="absolute right-4 bottom-4 flex translate-y-2 transform items-center space-x-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
		>
			<Button size="sm" onclick={viewEmployee} class="rounded-xl shadow-lg">
				<Eye class="mr-1 h-3 w-3" />
				View
			</Button>
		</div>
	</div>
</div>
