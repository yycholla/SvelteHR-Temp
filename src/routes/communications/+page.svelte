<!--
	Communications Inbox Page
	
	Message center for announcements, direct messages, notifications, and reminders
	Features inbox management, message composition, and real-time updates
-->

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Form from '$lib/components/ui/Form.svelte';
	import { communicationService } from '$lib/services/communication.service';
	import type { PageData } from './$types';
	import { z } from 'zod';
	import { onMount } from 'svelte';

	// Props from page data
	export let data: PageData;

	// Message composition schema
	const messageSchema = z.object({
		type: z.enum(['ANNOUNCEMENT', 'DIRECT_MESSAGE', 'NOTIFICATION', 'REMINDER']),
		subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject is too long'),
		content: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long'),
		recipientIds: z.array(z.string()).optional(),
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
	});

	type MessageForm = z.infer<typeof messageSchema>;

	// Component state
	let communications = $state([
		{
			id: '1',
			type: 'ANNOUNCEMENT',
			subject: 'Quarterly All-Hands Meeting',
			content: 'Join us for our Q1 all-hands meeting on Friday, March 15th at 2:00 PM in the main auditorium.',
			sender: { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@company.com' },
			priority: 'HIGH',
			isRead: false,
			createdAt: '2024-03-10T10:00:00Z',
			recipients: []
		},
		{
			id: '2',
			type: 'DIRECT_MESSAGE',
			subject: 'Welcome to the Team!',
			content: 'Hi John, welcome to our engineering team! Looking forward to working with you.',
			sender: { id: '2', firstName: 'Mike', lastName: 'Chen', email: 'mike.chen@company.com' },
			priority: 'MEDIUM',
			isRead: true,
			createdAt: '2024-03-09T14:30:00Z',
			recipients: [{ id: 'current-user', firstName: 'Current', lastName: 'User' }]
		},
		{
			id: '3',
			type: 'NOTIFICATION',
			subject: 'Leave Request Approved',
			content: 'Your leave request for March 18-22 has been approved by your manager.',
			sender: { id: 'system', firstName: 'HR', lastName: 'System', email: 'hr@company.com' },
			priority: 'MEDIUM',
			isRead: false,
			createdAt: '2024-03-08T09:15:00Z',
			recipients: [{ id: 'current-user', firstName: 'Current', lastName: 'User' }]
		},
		{
			id: '4',
			type: 'REMINDER',
			subject: 'Performance Review Due',
			content: 'Reminder: Your quarterly performance review is due by end of day Friday.',
			sender: { id: 'system', firstName: 'HR', lastName: 'System', email: 'hr@company.com' },
			priority: 'HIGH',
			isRead: false,
			createdAt: '2024-03-07T16:45:00Z',
			recipients: [{ id: 'current-user', firstName: 'Current', lastName: 'User' }]
		}
	]);

	let isLoading = $state(false);
	let searchQuery = $state('');
	let selectedCommunications = $state([]);
	let showComposeModal = $state(false);
	let showMessageModal = $state(false);
	let viewingMessage = $state(null);
	let filterType = $state('');
	let filterUnread = $state(false);

	// Communication statistics
	$: totalMessages = communications.length;
	$: unreadCount = communications.filter(comm => !comm.isRead).length;
	$: byType = communications.reduce((acc, comm) => {
		acc[comm.type] = (acc[comm.type] || 0) + 1;
		return acc;
	}, {});

	// Communications table columns
	const communicationColumns = [
		{
			key: 'type',
			label: 'Type',
			sortable: true,
			width: '120px',
			render: (value) => {
				const typeColors = {
					ANNOUNCEMENT: 'bg-blue-100 text-blue-800',
					DIRECT_MESSAGE: 'bg-green-100 text-green-800',
					NOTIFICATION: 'bg-yellow-100 text-yellow-800',
					REMINDER: 'bg-purple-100 text-purple-800'
				};
				const typeLabels = {
					ANNOUNCEMENT: 'Announcement',
					DIRECT_MESSAGE: 'Message',
					NOTIFICATION: 'Notification',
					REMINDER: 'Reminder'
				};
				return `<span class="px-2 py-1 rounded-full text-xs font-medium ${typeColors[value] || typeColors.NOTIFICATION}">${typeLabels[value] || value}</span>`;
			}
		},
		{
			key: 'subject',
			label: 'Subject',
			sortable: true,
			render: (value, row) => `
				<div class="flex items-center space-x-2">
					${!row.isRead ? '<div class="w-2 h-2 bg-primary rounded-full"></div>' : '<div class="w-2 h-2"></div>'}
					<div class="flex-1 min-w-0">
						<div class="font-medium text-foreground ${!row.isRead ? 'font-semibold' : ''} truncate">${value}</div>
						<div class="text-sm text-muted-foreground truncate">${row.content.substring(0, 100)}...</div>
					</div>
				</div>
			`
		},
		{
			key: 'sender',
			label: 'From',
			sortable: true,
			render: (value) => `
				<div>
					<div class="font-medium text-foreground">${value.firstName} ${value.lastName}</div>
					<div class="text-sm text-muted-foreground">${value.email}</div>
				</div>
			`
		},
		{
			key: 'priority',
			label: 'Priority',
			sortable: true,
			align: 'center',
			render: (value) => {
				const priorityColors = {
					LOW: 'bg-gray-100 text-gray-800',
					MEDIUM: 'bg-blue-100 text-blue-800',
					HIGH: 'bg-orange-100 text-orange-800',
					URGENT: 'bg-red-100 text-red-800'
				};
				return `<span class="px-2 py-1 rounded-full text-xs font-medium ${priorityColors[value] || priorityColors.MEDIUM}">${value}</span>`;
			}
		},
		{
			key: 'createdAt',
			label: 'Date',
			sortable: true,
			align: 'right',
			render: (value) => {
				const date = new Date(value);
				return `
					<div class="text-right">
						<div class="text-sm font-medium text-foreground">${date.toLocaleDateString()}</div>
						<div class="text-xs text-muted-foreground">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
					</div>
				`;
			}
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false,
			align: 'right',
			render: (value, row) => `
				<div class="flex items-center space-x-2">
					<button 
						class="text-blue-600 hover:text-blue-900 text-sm font-medium"
						onclick="viewMessage('${row.id}')"
					>
						${row.isRead ? 'View' : 'Read'}
					</button>
					<button 
						class="text-red-600 hover:text-red-900 text-sm font-medium"
						onclick="deleteMessage('${row.id}')"
					>
						Delete
					</button>
				</div>
			`
		}
	];

	// Filtered communications
	$: filteredCommunications = communications.filter(comm => {
		const matchesSearch = !searchQuery || 
			comm.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
			comm.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
			`${comm.sender.firstName} ${comm.sender.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
		
		const matchesType = !filterType || comm.type === filterType;
		const matchesUnread = !filterUnread || !comm.isRead;
		
		return matchesSearch && matchesType && matchesUnread;
	}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	// Load communications from service
	async function loadCommunications() {
		isLoading = true;
		try {
			const result = await communicationService.getCommunications({
				page: 1,
				limit: 100,
				unreadOnly: filterUnread,
				type: filterType || undefined
			});

			if (result.success && result.data) {
				// For now, keep using mock data since service returns empty
				// communications = result.data.communications;
			}
		} catch (error) {
			console.error('Failed to load communications:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle message composition
	async function handleSendMessage(formData: MessageForm) {
		isLoading = true;
		try {
			const result = await communicationService.sendCommunication(formData);
			
			if (result.success) {
				showComposeModal = false;
				// Add to local state for demo
				const newMessage = {
					id: String(Date.now()),
					...formData,
					sender: { id: 'current-user', firstName: 'You', lastName: '', email: 'you@company.com' },
					isRead: true,
					createdAt: new Date().toISOString(),
					recipients: formData.recipientIds ? [] : []
				};
				communications = [newMessage, ...communications];
			} else {
				console.error('Failed to send message:', result.error);
			}
		} catch (error) {
			console.error('Error sending message:', error);
		} finally {
			isLoading = false;
		}
	}

	// Handle mark as read
	async function markAsRead(communicationId: string) {
		try {
			const result = await communicationService.markAsRead(communicationId);
			
			if (result.success) {
				// Update local state
				communications = communications.map(comm =>
					comm.id === communicationId ? { ...comm, isRead: true } : comm
				);
			}
		} catch (error) {
			console.error('Error marking as read:', error);
		}
	}

	// Handle delete message
	async function handleDeleteMessage(communicationId: string) {
		try {
			const result = await communicationService.deleteCommunication(communicationId);
			
			if (result.success) {
				// Remove from local state
				communications = communications.filter(comm => comm.id !== communicationId);
			}
		} catch (error) {
			console.error('Error deleting message:', error);
		}
	}

	// Mark all as read
	async function markAllAsRead() {
		try {
			const result = await communicationService.markAllAsRead();
			
			if (result.success) {
				// Update local state
				communications = communications.map(comm => ({ ...comm, isRead: true }));
			}
		} catch (error) {
			console.error('Error marking all as read:', error);
		}
	}

	// Global functions for table actions
	(globalThis as any).viewMessage = (messageId: string) => {
		const message = communications.find(comm => comm.id === messageId);
		if (message) {
			viewingMessage = message;
			showMessageModal = true;
			
			// Mark as read when viewing
			if (!message.isRead) {
				markAsRead(messageId);
			}
		}
	};

	(globalThis as any).deleteMessage = (messageId: string) => {
		if (confirm('Are you sure you want to delete this message?')) {
			handleDeleteMessage(messageId);
		}
	};

	// Handle search
	function handleSearch() {
		// Search is reactive via filteredCommunications
	}

	// Handle sort
	function handleSort(sort) {
		console.log('Sort by:', sort);
		// TODO: Implement sorting
	}

	// Handle row click
	function handleRowClick(communication) {
		(globalThis as any).viewMessage(communication.id);
	}

	// Handle selection change
	function handleSelectionChange(selected) {
		selectedCommunications = selected;
	}

	// Initialize
	onMount(() => {
		loadCommunications();
	});
</script>

<svelte:head>
	<title>Communications - MountainHR</title>
	<meta name="description" content="Message center and communication hub" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Communications</h1>
			<p class="text-muted-foreground mt-1">
				Message center for announcements, direct messages, and notifications
			</p>
		</div>
		
		<div class="flex items-center space-x-3">
			<Button variant="outline" onclick={markAllAsRead} disabled={isLoading || unreadCount === 0}>
				✅ Mark All Read
			</Button>
			<Button onclick={() => showComposeModal = true} disabled={isLoading}>
				✍️ Compose
			</Button>
		</div>
	</div>

	<!-- Communication Statistics -->
	<div class="grid grid-cols-1 md:grid-cols-5 gap-6">
		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Messages</p>
					<p class="text-3xl font-bold text-foreground">{totalMessages}</p>
				</div>
				<div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">💬</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Unread</p>
					<p class="text-3xl font-bold text-foreground">{unreadCount}</p>
				</div>
				<div class="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">🔴</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Announcements</p>
					<p class="text-3xl font-bold text-foreground">{byType.ANNOUNCEMENT || 0}</p>
				</div>
				<div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">📢</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Direct Messages</p>
					<p class="text-3xl font-bold text-foreground">{byType.DIRECT_MESSAGE || 0}</p>
				</div>
				<div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">💌</span>
				</div>
			</div>
		</div>

		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Notifications</p>
					<p class="text-3xl font-bold text-foreground">{byType.NOTIFICATION || 0}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
					<span class="text-2xl">🔔</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="bg-card border rounded-lg p-6">
		<div class="flex items-center space-x-4 mb-4">
			<div class="flex-1">
				<Input
					type="search"
					placeholder="Search messages..."
					bind:value={searchQuery}
					oninput={handleSearch}
					class="max-w-md"
				/>
			</div>
			
			<div class="flex items-center space-x-3">
				<select
					bind:value={filterType}
					onchange={handleSearch}
					class="border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">All Types</option>
					<option value="ANNOUNCEMENT">Announcements</option>
					<option value="DIRECT_MESSAGE">Direct Messages</option>
					<option value="NOTIFICATION">Notifications</option>
					<option value="REMINDER">Reminders</option>
				</select>
				
				<label class="flex items-center space-x-2 text-sm">
					<input
						type="checkbox"
						bind:checked={filterUnread}
						onchange={handleSearch}
						class="rounded border-input focus:ring-2 focus:ring-ring"
					/>
					<span>Unread only</span>
				</label>
			</div>
		</div>

		<!-- Results Summary -->
		<div class="flex items-center justify-between text-sm text-muted-foreground">
			<span>
				Showing {filteredCommunications.length} of {totalMessages} messages
			</span>
			
			{#if selectedCommunications.length > 0}
				<span class="text-primary font-medium">
					{selectedCommunications.length} selected
				</span>
			{/if}
		</div>
	</div>

	<!-- Messages Data Table -->
	<div class="bg-card border rounded-lg overflow-hidden">
		<DataTable
			data={filteredCommunications}
			columns={communicationColumns}
			{isLoading}
			selectable
			bind:selectedRows={selectedCommunications}
			onSort={handleSort}
			onSelectionChange={handleSelectionChange}
			onRowClick={handleRowClick}
			emptyMessage="No messages found"
			hover
		/>
	</div>
</div>

<!-- Compose Message Modal -->
<Modal bind:open={showComposeModal} title="Compose Message" size="lg">
	{#snippet content()}
		<Form
			schema={messageSchema}
			onSubmit={handleSendMessage}
			class="space-y-4"
		>
			{#snippet content({ form, errors, handleChange, handleBlur })}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-2">Message Type</label>
						<select
							bind:value={form.type}
							onchange={(e) => handleChange('type', e.currentTarget.value)}
							class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="DIRECT_MESSAGE">Direct Message</option>
							<option value="ANNOUNCEMENT">Announcement</option>
							<option value="NOTIFICATION">Notification</option>
							<option value="REMINDER">Reminder</option>
						</select>
						{#if errors.type}
							<p class="text-sm text-destructive mt-1">{errors.type}</p>
						{/if}
					</div>
					
					<div>
						<label class="block text-sm font-medium mb-2">Priority</label>
						<select
							bind:value={form.priority}
							onchange={(e) => handleChange('priority', e.currentTarget.value)}
							class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="LOW">Low</option>
							<option value="MEDIUM">Medium</option>
							<option value="HIGH">High</option>
							<option value="URGENT">Urgent</option>
						</select>
						{#if errors.priority}
							<p class="text-sm text-destructive mt-1">{errors.priority}</p>
						{/if}
					</div>
				</div>
				
				<Input
					name="subject"
					label="Subject"
					required
					bind:value={form.subject}
					error={errors.subject}
					oninput={(e) => handleChange('subject', e.currentTarget.value)}
					onblur={(e) => handleBlur('subject', e.currentTarget.value)}
				/>
				
				<div>
					<label class="block text-sm font-medium mb-2">Message Content</label>
					<textarea
						bind:value={form.content}
						oninput={(e) => handleChange('content', e.currentTarget.value)}
						onblur={(e) => handleBlur('content', e.currentTarget.value)}
						placeholder="Type your message here..."
						rows="6"
						class="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					></textarea>
					{#if errors.content}
						<p class="text-sm text-destructive mt-1">{errors.content}</p>
					{/if}
				</div>
				
				{#if form.type === 'DIRECT_MESSAGE'}
					<div>
						<label class="block text-sm font-medium mb-2">Recipients</label>
						<Input
							placeholder="Enter recipient email addresses (comma separated)"
							bind:value={form.recipientEmails}
							error={errors.recipientIds}
							oninput={(e) => {
								const emails = e.currentTarget.value.split(',').map(email => email.trim()).filter(email => email);
								handleChange('recipientIds', emails);
							}}
						/>
						<p class="text-xs text-muted-foreground mt-1">
							Leave empty for announcements to all users
						</p>
					</div>
				{/if}
			{/snippet}
		</Form>
	{/snippet}
	
	{#snippet actions()}
		<Button variant="outline" onclick={() => showComposeModal = false}>
			Cancel
		</Button>
		<Button type="submit" loading={isLoading} disabled={isLoading}>
			Send Message
		</Button>
	{/snippet}
</Modal>

<!-- View Message Modal -->
{#if viewingMessage}
	<Modal bind:open={showMessageModal} title="Message Details" size="lg">
		{#snippet content()}
			<div class="space-y-4">
				<!-- Message Header -->
				<div class="border-b pb-4">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-lg font-semibold text-foreground">{viewingMessage.subject}</h3>
						<div class="flex items-center space-x-2">
							{#if viewingMessage.type === 'ANNOUNCEMENT'}
								<span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Announcement</span>
							{:else if viewingMessage.type === 'DIRECT_MESSAGE'}
								<span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Message</span>
							{:else if viewingMessage.type === 'NOTIFICATION'}
								<span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Notification</span>
							{:else if viewingMessage.type === 'REMINDER'}
								<span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Reminder</span>
							{/if}
							
							<span class="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
								{viewingMessage.priority}
							</span>
						</div>
					</div>
					
					<div class="flex items-center text-sm text-muted-foreground">
						<span>From: {viewingMessage.sender.firstName} {viewingMessage.sender.lastName} ({viewingMessage.sender.email})</span>
						<span class="mx-2">•</span>
						<span>{new Date(viewingMessage.createdAt).toLocaleString()}</span>
					</div>
				</div>
				
				<!-- Message Content -->
				<div class="prose prose-sm max-w-none">
					<div class="whitespace-pre-wrap text-foreground">{viewingMessage.content}</div>
				</div>
			</div>
		{/snippet}
		
		{#snippet actions()}
			<Button variant="outline" onclick={() => showMessageModal = false}>
				Close
			</Button>
			<Button 
				variant="destructive" 
				onclick={() => {
					(globalThis as any).deleteMessage(viewingMessage.id);
					showMessageModal = false;
				}}
			>
				Delete
			</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	/* Message row styling for unread messages */
	:global(.table-row.unread) {
		background-color: hsl(var(--accent));
		border-left: 3px solid hsl(var(--primary));
	}

	/* Custom scrollbar for message content */
	textarea::-webkit-scrollbar {
		width: 8px;
	}
	
	textarea::-webkit-scrollbar-track {
		background: hsl(var(--muted));
		border-radius: 4px;
	}
	
	textarea::-webkit-scrollbar-thumb {
		background: hsl(var(--border));
		border-radius: 4px;
	}
	
	textarea::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground));
	}
</style>