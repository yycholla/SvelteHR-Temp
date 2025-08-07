<script lang="ts">
	import { ChevronRight, ChevronDown, Mail, Phone, Edit, Eye, MapPin, Calendar, DollarSign, User, Award } from 'lucide-svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { Employee } from '$lib/data/mockEmployees.js';

	let {
		employee,
		selected = false,
		expanded = false,
		density = 'comfortable',
		cardMode = false,
		onToggleSelection,
		onToggleExpansion
	}: {
		employee: Employee;
		selected?: boolean;
		expanded?: boolean;
		density?: 'compact' | 'comfortable' | 'spacious';
		cardMode?: boolean;
		onToggleSelection: () => void;
		onToggleExpansion: () => void;
	} = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case 'ACTIVE': return 'bg-green-500/20 text-green-700 border-green-500/30';
			case 'ON_LEAVE': return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
			case 'INACTIVE': return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
			default: return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
		}
	}

	function getDepartmentColor(color: string) {
		const colors: Record<string, string> = {
			'blue': 'bg-blue-500/20 text-blue-700 border-blue-500/30',
			'green': 'bg-green-500/20 text-green-700 border-green-500/30',
			'purple': 'bg-purple-500/20 text-purple-700 border-purple-500/30',
			'orange': 'bg-orange-500/20 text-orange-700 border-orange-500/30',
			'emerald': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
			'indigo': 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
			'pink': 'bg-pink-500/20 text-pink-700 border-pink-500/30',
			'slate': 'bg-slate-500/20 text-slate-700 border-slate-500/30'
		};
		return colors[color] || colors['slate'];
	}

	function getInitials(firstName: string, lastName: string) {
		return `${firstName.charAt(0)}${lastName.charAt(0)}`;
	}

	function getCardClasses() {
		const baseClasses = "rounded-2xl border border-slate-200/50 bg-gradient-to-r from-white/80 via-blue-50/30 to-purple-50/30 backdrop-blur-md shadow-xl transition-all duration-200 hover:shadow-2xl hover:from-blue-50/50 hover:to-purple-50/50";
		if (selected) {
			return `${baseClasses} ring-2 ring-blue-300/50 bg-gradient-to-r from-blue-100/60 to-purple-100/50 border-blue-300/60`;
		}
		return baseClasses;
	}

	function getPaddingClasses() {
		switch (density) {
			case 'compact': return 'py-2 px-4';
			case 'spacious': return 'py-6 px-4';
			default: return 'py-4 px-4';
		}
	}

	// Action handlers
	function viewEmployee() {
		console.log('Viewing employee:', employee.id);
	}

	function editEmployee() {
		console.log('Editing employee:', employee.id);
	}

	function messageEmployee() {
		console.log('Messaging employee:', employee.id);
	}
</script>

<!-- Employee Card -->
<div class={getCardClasses()}>
	<!-- Single Row Card Content -->
	<div class="{getPaddingClasses()} grid grid-cols-[auto_auto_280px_200px_120px_100px_120px_100px] gap-4 items-center">
		<!-- Selection Checkbox -->
		<div class="flex justify-center">
			<Checkbox
				checked={selected}
				onCheckedChange={onToggleSelection}
				aria-label="Select employee {employee.firstName} {employee.lastName}"
			/>
		</div>

		<!-- Expand Toggle -->
		<div class="flex justify-center">
			<Button
				variant="ghost"
				size="sm"
				onclick={onToggleExpansion}
				class="w-6 h-6 p-0 rounded-md hover:bg-background/20"
				aria-label={expanded ? 'Collapse employee details' : 'Expand employee details'}
			>
				{#if expanded}
					<ChevronDown class="h-4 w-4" />
				{:else}
					<ChevronRight class="h-4 w-4" />
				{/if}
			</Button>
		</div>
		
		<!-- Avatar and Name -->
		<div class="flex items-center space-x-3 min-w-0">
			<Avatar class="h-10 w-10 ring-2 ring-blue-200/60 flex-shrink-0">
				{#if employee.avatar}
					<AvatarImage src={employee.avatar} alt="{employee.firstName} {employee.lastName}" />
				{/if}
				<AvatarFallback class="bg-gradient-to-br from-blue-100/80 to-purple-100/80 font-semibold text-blue-700 text-sm">
					{getInitials(employee.firstName, employee.lastName)}
				</AvatarFallback>
			</Avatar>
			
			<div class="min-w-0 flex-1">
				<div class="font-medium text-foreground truncate">
					{employee.firstName} {employee.lastName}
				</div>
				<div class="text-sm text-muted-foreground truncate">
					{employee.employeeId}
				</div>
			</div>
		</div>

		<!-- Position -->
		<div class="min-w-0">
			<div class="font-medium text-foreground truncate">
				{employee.position.title}
			</div>
			<div class="text-sm text-muted-foreground truncate">
				{employee.position.level}
			</div>
		</div>

		<!-- Department -->
		<div class="flex justify-start">
			<Badge class="rounded-lg border {getDepartmentColor(employee.department.color)} truncate">
				{employee.department.name}
			</Badge>
		</div>

		<!-- Status -->
		<div class="flex justify-start">
			<Badge class="rounded-lg border {getStatusColor(employee.status)} truncate">
				{employee.status.replace('_', ' ')}
			</Badge>
		</div>

		<!-- Hire Date -->
		<div class="text-sm text-foreground whitespace-nowrap">
			{new Date(employee.hireDate).toLocaleDateString('en-US', { 
				year: 'numeric', 
				month: 'short', 
				day: 'numeric' 
			})}
		</div>

		<!-- Actions -->
		<div class="flex items-center justify-end space-x-1">
			<Button size="sm" variant="ghost" onclick={viewEmployee} class="rounded-lg h-10 w-10 p-0 flex-shrink-0">
				<Eye class="h-8 w-8" />
			</Button>
			<Button size="sm" variant="ghost" onclick={editEmployee} class="rounded-lg h-10 w-10 p-0 flex-shrink-0">
				<Edit class="h-8 w-8" />
			</Button>
		</div>
	</div>

	<!-- Expanded Content -->
	{#if expanded}
		<div class="border-t border-slate-200/30 bg-gradient-to-br from-slate-50/60 via-blue-50/20 to-purple-50/20 rounded-b-2xl">
			<div class="p-6 animate-in slide-in-from-top-2 duration-200">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<!-- Employment Details -->
					<div class="space-y-3">
						<h4 class="font-semibold text-foreground flex items-center">
							<User class="h-4 w-4 mr-2 text-primary" />
							Employment Details
						</h4>
						<div class="space-y-2 text-sm">
							<div class="flex items-center space-x-2">
								<Calendar class="h-3 w-3 text-muted-foreground" />
								<span class="text-muted-foreground">Hired:</span>
								<span class="font-medium">
									{new Date(employee.hireDate).toLocaleDateString('en-US', { 
										year: 'numeric', 
										month: 'long', 
										day: 'numeric' 
									})}
								</span>
							</div>
							{#if employee.salary}
								<div class="flex items-center space-x-2">
									<DollarSign class="h-3 w-3 text-muted-foreground" />
									<span class="text-muted-foreground">Salary:</span>
									<span class="font-medium">
										${employee.salary.toLocaleString()}
									</span>
								</div>
							{/if}
							<div class="flex items-center space-x-2">
								<Award class="h-3 w-3 text-muted-foreground" />
								<span class="text-muted-foreground">Level:</span>
								<span class="font-medium">{employee.position.level}</span>
							</div>
						</div>
					</div>

					<!-- Contact Information -->
					<div class="space-y-3">
						<h4 class="font-semibold text-foreground flex items-center">
							<Mail class="h-4 w-4 mr-2 text-primary" />
							Contact Information
						</h4>
						<div class="space-y-2 text-sm">
							<div class="flex items-center space-x-2">
								<Mail class="h-3 w-3 text-muted-foreground" />
								<span class="text-foreground truncate">{employee.email}</span>
							</div>
							{#if employee.phone}
								<div class="flex items-center space-x-2">
									<Phone class="h-3 w-3 text-muted-foreground" />
									<span class="text-foreground">{employee.phone}</span>
								</div>
							{/if}
							<div class="flex items-center space-x-2">
								<MapPin class="h-3 w-3 text-muted-foreground" />
								<span class="text-foreground">{employee.location}</span>
							</div>
						</div>
					</div>

					<!-- Quick Actions -->
					<div class="space-y-3">
						<h4 class="font-semibold text-foreground">Quick Actions</h4>
						<div class="flex flex-wrap gap-2">
							<Button size="sm" onclick={viewEmployee} class="rounded-xl">
								<Eye class="h-3 w-3 mr-1" />
								View Profile
							</Button>
							<Button size="sm" variant="outline" onclick={editEmployee} class="rounded-xl">
								<Edit class="h-3 w-3 mr-1" />
								Edit
							</Button>
							<Button size="sm" variant="outline" onclick={messageEmployee} class="rounded-xl">
								<Mail class="h-3 w-3 mr-1" />
								Message
							</Button>
						</div>
					</div>
				</div>

				<Separator class="my-4" />

				<!-- Additional Stats or Information -->
				<div class="text-xs text-muted-foreground">
					Employee ID: {employee.employeeId} • 
					Department: {employee.department.name} • 
					Status: {employee.status.replace('_', ' ')} • 
					Tenure: {Math.floor((Date.now() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} year(s)
				</div>
			</div>
		</div>
	{/if}
</div>