<!--
	Employee Bulk Actions Component
	
	Provides bulk operation capabilities for employee management
	with progress tracking and confirmation dialogs.
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { 
		Trash2, 
		Download, 
		Mail, 
		UserCheck, 
		UserX, 
		Users, 
		Building,
		MoreHorizontal,
		X,
		AlertTriangle,
		CheckCircle,
		RefreshCw
	} from 'lucide-svelte';

	// UI Components
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
		DropdownMenuSeparator,
		DropdownMenuLabel
	} from '$lib/components/ui/dropdown-menu/index.js';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Select from '$lib/components/ui/select/select.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	// Auth
	import { checkAnyPermission } from '$lib/auth/store.js';

	// Props
	interface Props {
		selectedCount: number;
		onAction: (action: string, data?: any) => Promise<void>;
		onClear: () => void;
		className?: string;
	}

	let { selectedCount, onAction, onClear, className = '' }: Props = $props();

	// Events
	const dispatch = createEventDispatcher<{
		action: { action: string; data?: any };
		clear: void;
	}>();

	// State
	let showConfirmDialog = $state(false);
	let showStatusDialog = $state(false);
	let showDepartmentDialog = $state(false);
	let showNotificationDialog = $state(false);
	let currentAction = $state<string | null>(null);
	let processing = $state(false);
	let processingMessage = $state('');

	// Form data
	let newStatus = $state('active');
	let newDepartmentId = $state('');
	let notificationMessage = $state('');

	// Permissions
	const canDeleteEmployees = $derived(() => checkAnyPermission(['employees:delete', 'employees:*', '*']));
	const canUpdateEmployees = $derived(() => checkAnyPermission(['employees:update', 'employees:*', '*']));
	const canExportEmployees = $derived(() => checkAnyPermission(['employees:export', 'employees:*', '*']));
	const canNotifyEmployees = $derived(() => checkAnyPermission(['notifications:send', '*']));

	// Status options
	const statusOptions = [
		{ value: 'active', label: 'Active', color: 'green' },
		{ value: 'inactive', label: 'Inactive', color: 'gray' },
		{ value: 'on_leave', label: 'On Leave', color: 'orange' },
		{ value: 'terminated', label: 'Terminated', color: 'red' }
	];

	// Sample departments (would be loaded from API)
	const departments = [
		{ id: '1', name: 'Engineering' },
		{ id: '2', name: 'Marketing' },
		{ id: '3', name: 'Sales' },
		{ id: '4', name: 'HR' },
		{ id: '5', name: 'Finance' }
	];

	// Handle action initiation
	async function handleAction(action: string, data?: any) {
		currentAction = action;

		switch (action) {
			case 'delete':
				showConfirmDialog = true;
				break;
			case 'update_status':
				showStatusDialog = true;
				break;
			case 'update_department':
				showDepartmentDialog = true;
				break;
			case 'send_notification':
				showNotificationDialog = true;
				break;
			case 'export':
				await executeAction(action, data);
				break;
			default:
				await executeAction(action, data);
		}
	}

	// Execute the action
	async function executeAction(action: string, data?: any) {
		try {
			processing = true;
			processingMessage = getProcessingMessage(action);

			await onAction(action, data);
			closeAllDialogs();

		} catch (error) {
			console.error(`Bulk action ${action} failed:`, error);
			// Error handling would be done by parent component
		} finally {
			processing = false;
			processingMessage = '';
		}
	}

	// Get processing message for action
	function getProcessingMessage(action: string): string {
		switch (action) {
			case 'delete':
				return `Deleting ${selectedCount} employees...`;
			case 'update_status':
				return `Updating status for ${selectedCount} employees...`;
			case 'update_department':
				return `Moving ${selectedCount} employees...`;
			case 'send_notification':
				return `Sending notification to ${selectedCount} employees...`;
			case 'export':
				return `Exporting ${selectedCount} employees...`;
			default:
				return `Processing ${selectedCount} employees...`;
		}
	}

	// Close all dialogs
	function closeAllDialogs() {
		showConfirmDialog = false;
		showStatusDialog = false;
		showDepartmentDialog = false;
		showNotificationDialog = false;
		currentAction = null;
	}

	// Handle confirm action
	async function handleConfirm() {
		if (currentAction === 'delete') {
			await executeAction('delete');
		}
	}

	// Handle status update
	async function handleStatusUpdate() {
		if (newStatus) {
			await executeAction('update_status', { status: newStatus });
		}
	}

	// Handle department update
	async function handleDepartmentUpdate() {
		if (newDepartmentId) {
			await executeAction('update_department', { departmentId: newDepartmentId });
		}
	}

	// Handle send notification
	async function handleSendNotification() {
		if (notificationMessage.trim()) {
			await executeAction('send_notification', { message: notificationMessage.trim() });
		}
	}
</script>

<!-- Bulk Actions Bar -->
<div class="flex items-center gap-2 {className}">
	<!-- Selected Count Badge -->
	<Badge variant="secondary" class="flex items-center gap-1">
		<Users class="h-3 w-3" />
		{selectedCount}
	</Badge>

	<!-- Quick Actions -->
	{#if canExportEmployees}
		<Button
			variant="outline"
			size="sm"
			onclick={() => handleAction('export')}
			disabled={processing}
			class="flex items-center gap-2"
		>
			<Download class="h-4 w-4" />
			Export
		</Button>
	{/if}

	{#if canNotifyEmployees}
		<Button
			variant="outline"
			size="sm"
			onclick={() => handleAction('send_notification')}
			disabled={processing}
			class="flex items-center gap-2"
		>
			<Mail class="h-4 w-4" />
			Notify
		</Button>
	{/if}

	<!-- More Actions Dropdown -->
	<DropdownMenu>
		<DropdownMenuTrigger asChild let:builder>
			<Button
				builders={[builder]}
				variant="outline"
				size="sm"
				disabled={processing}
				class="flex items-center gap-2"
			>
				<MoreHorizontal class="h-4 w-4" />
				More Actions
			</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" class="w-48">
			<DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
			<DropdownMenuSeparator />
			
			{#if canUpdateEmployees}
				<DropdownMenuItem onclick={() => handleAction('update_status')}>
					<UserCheck class="mr-2 h-4 w-4" />
					Update Status
				</DropdownMenuItem>
				
				<DropdownMenuItem onclick={() => handleAction('update_department')}>
					<Building class="mr-2 h-4 w-4" />
					Change Department
				</DropdownMenuItem>
			{/if}

			{#if canDeleteEmployees}
				<DropdownMenuSeparator />
				<DropdownMenuItem 
					onclick={() => handleAction('delete')}
					class="text-red-600 focus:text-red-600"
				>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Selected
				</DropdownMenuItem>
			{/if}
		</DropdownMenuContent>
	</DropdownMenu>

	<!-- Clear Selection -->
	<Button
		variant="ghost"
		size="sm"
		onclick={onClear}
		disabled={processing}
		class="flex items-center gap-2 text-gray-500 hover:text-gray-700"
	>
		<X class="h-4 w-4" />
		Clear
	</Button>

	<!-- Processing Indicator -->
	{#if processing}
		<div class="flex items-center gap-2 text-sm text-blue-600">
			<RefreshCw class="h-4 w-4 animate-spin" />
			{processingMessage}
		</div>
	{/if}
</div>

<!-- Confirmation Dialog -->
<Dialog bind:open={showConfirmDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2 text-red-600">
				<AlertTriangle class="h-5 w-5" />
				Confirm Deletion
			</DialogTitle>
			<DialogDescription>
				Are you sure you want to delete {selectedCount} selected employee{selectedCount !== 1 ? 's' : ''}?
				This action cannot be undone.
			</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={closeAllDialogs} disabled={processing}>
				Cancel
			</Button>
			<Button 
				variant="destructive" 
				onclick={handleConfirm}
				disabled={processing}
				class="flex items-center gap-2"
			>
				{#if processing}
					<RefreshCw class="h-4 w-4 animate-spin" />
				{:else}
					<Trash2 class="h-4 w-4" />
				{/if}
				Delete {selectedCount} Employee{selectedCount !== 1 ? 's' : ''}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Status Update Dialog -->
<Dialog bind:open={showStatusDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<UserCheck class="h-5 w-5" />
				Update Employee Status
			</DialogTitle>
			<DialogDescription>
				Change the status for {selectedCount} selected employee{selectedCount !== 1 ? 's' : ''}
			</DialogDescription>
		</DialogHeader>
		
		<div class="space-y-4 py-4">
			<div>
				<label class="mb-2 block text-sm font-medium">New Status</label>
				<select
					bind:value={newStatus}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					{#each statusOptions as status}
						<option value={status.value}>{status.label}</option>
					{/each}
				</select>
			</div>
			
			<!-- Status Preview -->
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<span>Preview:</span>
				{#if newStatus}
					{@const selectedStatus = statusOptions.find(s => s.value === newStatus)}
					<Badge 
						variant="secondary" 
						class={selectedStatus?.color === 'green' ? 'bg-green-100 text-green-800' :
							   selectedStatus?.color === 'red' ? 'bg-red-100 text-red-800' :
							   selectedStatus?.color === 'orange' ? 'bg-orange-100 text-orange-800' :
							   'bg-gray-100 text-gray-800'}
					>
						{selectedStatus?.label}
					</Badge>
				{/if}
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeAllDialogs} disabled={processing}>
				Cancel
			</Button>
			<Button 
				onclick={handleStatusUpdate}
				disabled={processing || !newStatus}
				class="flex items-center gap-2"
			>
				{#if processing}
					<RefreshCw class="h-4 w-4 animate-spin" />
				{:else}
					<CheckCircle class="h-4 w-4" />
				{/if}
				Update Status
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Department Update Dialog -->
<Dialog bind:open={showDepartmentDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Building class="h-5 w-5" />
				Change Department
			</DialogTitle>
			<DialogDescription>
				Move {selectedCount} selected employee{selectedCount !== 1 ? 's' : ''} to a new department
			</DialogDescription>
		</DialogHeader>
		
		<div class="space-y-4 py-4">
			<div>
				<label class="mb-2 block text-sm font-medium">New Department</label>
				<select
					bind:value={newDepartmentId}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="">Select department...</option>
					{#each departments as department}
						<option value={department.id}>{department.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeAllDialogs} disabled={processing}>
				Cancel
			</Button>
			<Button 
				onclick={handleDepartmentUpdate}
				disabled={processing || !newDepartmentId}
				class="flex items-center gap-2"
			>
				{#if processing}
					<RefreshCw class="h-4 w-4 animate-spin" />
				{:else}
					<Building class="h-4 w-4" />
				{/if}
				Move Employees
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- Notification Dialog -->
<Dialog bind:open={showNotificationDialog}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Mail class="h-5 w-5" />
				Send Notification
			</DialogTitle>
			<DialogDescription>
				Send a notification to {selectedCount} selected employee{selectedCount !== 1 ? 's' : ''}
			</DialogDescription>
		</DialogHeader>
		
		<div class="space-y-4 py-4">
			<div>
				<label class="mb-2 block text-sm font-medium">Message</label>
				<Textarea
					bind:value={notificationMessage}
					placeholder="Enter your message..."
					class="min-h-[100px] resize-none"
				/>
				<p class="mt-1 text-xs text-gray-500">
					This notification will be sent to all selected employees
				</p>
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={closeAllDialogs} disabled={processing}>
				Cancel
			</Button>
			<Button 
				onclick={handleSendNotification}
				disabled={processing || !notificationMessage.trim()}
				class="flex items-center gap-2"
			>
				{#if processing}
					<RefreshCw class="h-4 w-4 animate-spin" />
				{:else}
					<Mail class="h-4 w-4" />
				{/if}
				Send Notification
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<style>
	/* Custom select styling */
	select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}
</style>