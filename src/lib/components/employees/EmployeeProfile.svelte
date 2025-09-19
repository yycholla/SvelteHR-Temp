<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { userService, currentUser as userServiceCurrentUser } from '$lib/services/userService';
	import { currentUser, hasPermission } from '$lib/services/auth';
	import Button from '../base/Button.svelte';
	import Badge from '../base/Badge.svelte';
	import Card from '../base/Card.svelte';
	import Modal from '../base/Modal.svelte';
	import type { User } from '$lib/types';

	const dispatch = createEventDispatcher();

	// Props
	export let employeeId: string;
	export let showActions: boolean = true;

	// State
	let employee: User | null = null;
	let loading = true;
	let error: string | null = null;
	let showDeactivateModal = false;
	let deactivateReason = '';
	let deactivating = false;

	// Computed values
	$: isOwnProfile = employee?.id === $currentUser?.id;
	$: canEdit = $currentUser && (isOwnProfile || hasPermission('user:update'));
	$: canDeactivate = $currentUser && hasPermission('user:delete') && !isOwnProfile;
	$: statusVariant = employee?.isActive ? 'success' : 'secondary';
	$: statusText = employee?.isActive ? 'Active' : 'Inactive';

	async function loadEmployee() {
		try {
			loading = true;
			error = null;
			employee = await userService.getUserDetails(employeeId);
		} catch (err: any) {
			error = err.message;
			employee = null;
		} finally {
			loading = false;
		}
	}

	async function handleDeactivate() {
		if (!employee) return;

		try {
			deactivating = true;
			await userService.deactivateUser(employee.id, deactivateReason);
			showDeactivateModal = false;
			deactivateReason = '';
			// Reload employee data
			await loadEmployee();
			dispatch('deactivated', { employee });
		} catch (err: any) {
			error = err.message;
		} finally {
			deactivating = false;
		}
	}

	function handleEdit() {
		if (employee) {
			dispatch('edit', { employee });
		}
	}

	function getEmployeeInitials(employee: User): string {
		return `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`;
	}

	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	function formatCurrency(amount: number | null | undefined): string {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatPhoneNumber(phone: string | null | undefined): string {
		if (!phone) return 'N/A';
		// Simple phone formatting - can be enhanced
		const cleaned = phone.replace(/\D/g, '');
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}
		return phone;
	}

	onMount(() => {
		loadEmployee();
	});
</script>

<div class="employee-profile">
	{#if loading}
		<div class="loading-state">
			<div class="loading-spinner">
				<svg class="animate-spin" viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						fill="none"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			</div>
			<p>Loading employee profile...</p>
		</div>
	{:else if error}
		<Card padding="lg">
			<div class="error-state">
				<div class="error-icon">
					<i class="icon-alert-circle"></i>
				</div>
				<div class="error-content">
					<h3>Error Loading Profile</h3>
					<p>{error}</p>
					<Button variant="secondary" size="sm" leftIcon="refresh-cw" on:click={loadEmployee}>
						Try Again
					</Button>
				</div>
			</div>
		</Card>
	{:else if employee}
		<!-- Profile Header -->
		<Card padding="lg" class="profile-header">
			<div class="profile-header__content">
				<div class="profile-avatar">
					{#if employee.profileImage}
						<img src={employee.profileImage} alt={employee.displayName} />
					{:else}
						<div class="profile-avatar__initials">
							{getEmployeeInitials(employee)}
						</div>
					{/if}
				</div>

				<div class="profile-info">
					<div class="profile-name">
						<h1>{employee.displayName}</h1>
						<Badge variant={statusVariant} size="sm">
							{statusText}
						</Badge>
					</div>

					<div class="profile-title">
						{employee.jobTitle || 'No title assigned'}
					</div>

					<div class="profile-department">
						{employee.department?.name || 'No department assigned'}
					</div>

					<div class="profile-contact">
						<div class="contact-item">
							<i class="icon-mail"></i>
							<a href="mailto:{employee.email}" class="contact-link">
								{employee.email}
							</a>
						</div>

						{#if employee.phoneNumber}
							<div class="contact-item">
								<i class="icon-phone"></i>
								<a href="tel:{employee.phoneNumber}" class="contact-link">
									{formatPhoneNumber(employee.phoneNumber)}
								</a>
							</div>
						{/if}
					</div>
				</div>

				{#if showActions}
					<div class="profile-actions">
						{#if canEdit}
							<Button variant="primary" leftIcon="edit" on:click={handleEdit}>Edit Profile</Button>
						{/if}

						{#if canDeactivate && employee.isActive}
							<Button
								variant="danger"
								leftIcon="user-x"
								on:click={() => (showDeactivateModal = true)}
							>
								Deactivate
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		</Card>

		<!-- Profile Details Grid -->
		<div class="profile-details">
			<!-- Employment Information -->
			<Card padding="lg">
				<div class="detail-section">
					<h3 class="detail-section__title">Employment Information</h3>
					<div class="detail-grid">
						<div class="detail-item">
							<span class="detail-label">Employee ID</span>
							<span class="detail-value">{employee.id}</span>
						</div>

						<div class="detail-item">
							<span class="detail-label">Hire Date</span>
							<span class="detail-value">
								{formatDate(employee.jobInfo?.hireDate)}
							</span>
						</div>

						<div class="detail-item">
							<span class="detail-label">Employment Type</span>
							<span class="detail-value">
								{employee.jobInfo?.employmentType || 'N/A'}
							</span>
						</div>

						<div class="detail-item">
							<span class="detail-label">Manager</span>
							<span class="detail-value">
								{employee.manager?.displayName || 'No manager assigned'}
							</span>
						</div>

						<div class="detail-item">
							<span class="detail-label">Work Location</span>
							<span class="detail-value">
								{employee.jobInfo?.isRemote ? 'Remote' : 'On-site'}
							</span>
						</div>

						{#if employee.jobInfo?.salary && (isOwnProfile || hasPermission('user:view_salary'))}
							<div class="detail-item">
								<span class="detail-label">Salary</span>
								<span class="detail-value">
									{formatCurrency(employee.jobInfo.salary)}
									<span class="detail-note">
										{employee.jobInfo.payType?.toLowerCase() || 'annually'}
									</span>
								</span>
							</div>
						{/if}
					</div>
				</div>
			</Card>

			<!-- Personal Information -->
			<Card padding="lg">
				<div class="detail-section">
					<h3 class="detail-section__title">Personal Information</h3>
					<div class="detail-grid">
						<div class="detail-item">
							<span class="detail-label">Full Name</span>
							<span class="detail-value">
								{employee.firstName}
								{employee.lastName}
							</span>
						</div>

						{#if employee.address}
							<div class="detail-item detail-item--full">
								<span class="detail-label">Address</span>
								<span class="detail-value">
									{#if employee.address.street}
										{employee.address.street}<br />
									{/if}
									{employee.address.city || ''}{employee.address.city && employee.address.state
										? ', '
										: ''}{employee.address.state || ''}
									{employee.address.zipCode || ''}
								</span>
							</div>
						{/if}
					</div>
				</div>
			</Card>

			<!-- Emergency Contact -->
			{#if employee.emergencyContact}
				<Card padding="lg">
					<div class="detail-section">
						<h3 class="detail-section__title">Emergency Contact</h3>
						<div class="detail-grid">
							<div class="detail-item">
								<span class="detail-label">Name</span>
								<span class="detail-value">
									{employee.emergencyContact.name || 'N/A'}
								</span>
							</div>

							<div class="detail-item">
								<span class="detail-label">Phone</span>
								<span class="detail-value">
									{formatPhoneNumber(employee.emergencyContact.phone)}
								</span>
							</div>

							<div class="detail-item">
								<span class="detail-label">Relationship</span>
								<span class="detail-value">
									{employee.emergencyContact.relationship || 'N/A'}
								</span>
							</div>
						</div>
					</div>
				</Card>
			{/if}

			<!-- Roles and Permissions -->
			<Card padding="lg">
				<div class="detail-section">
					<h3 class="detail-section__title">Roles & Permissions</h3>
					<div class="roles-list">
						{#if employee.roles && employee.roles.length > 0}
							{#each employee.roles as role}
								<Badge variant="primary" size="sm">
									{role.displayName || role.name}
								</Badge>
							{/each}
						{:else}
							<span class="detail-value">No roles assigned</span>
						{/if}
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>

<!-- Deactivate Modal -->
<Modal bind:open={showDeactivateModal} title="Deactivate Employee" size="md">
	<div class="deactivate-modal">
		<p class="modal-description">
			Are you sure you want to deactivate <strong>{employee?.displayName}</strong>? This will
			prevent them from accessing the system.
		</p>

		<div class="modal-field">
			<label for="deactivate-reason" class="modal-label">
				Reason for deactivation (optional)
			</label>
			<textarea
				id="deactivate-reason"
				bind:value={deactivateReason}
				rows="3"
				class="modal-textarea"
				placeholder="Enter reason for deactivation..."
			></textarea>
		</div>
	</div>

	<svelte:fragment slot="footer">
		<Button
			variant="tertiary"
			on:click={() => (showDeactivateModal = false)}
			disabled={deactivating}
		>
			Cancel
		</Button>

		<Button variant="danger" on:click={handleDeactivate} loading={deactivating}>
			Deactivate Employee
		</Button>
	</svelte:fragment>
</Modal>

<style lang="postcss">
	.employee-profile {
		@apply max-w-6xl space-y-6;
	}

	/* Loading State */
	.loading-state {
		@apply flex flex-col items-center justify-center py-12 text-gray-500;
	}

	.loading-spinner svg {
		@apply mb-4 h-8 w-8;
	}

	/* Error State */
	.error-state {
		@apply flex items-start space-x-4;
	}

	.error-icon {
		@apply flex-shrink-0 text-red-500;
	}

	.error-icon i {
		@apply h-6 w-6;
	}

	.error-content h3 {
		@apply mb-2 text-lg font-medium text-gray-900;
	}

	.error-content p {
		@apply mb-4 text-gray-600;
	}

	/* Profile Header */
	.profile-header__content {
		@apply flex items-start space-x-6;
	}

	.profile-avatar {
		@apply flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300;
	}

	.profile-avatar img {
		@apply h-full w-full object-cover;
	}

	.profile-avatar__initials {
		@apply text-2xl font-bold text-gray-700;
	}

	.profile-info {
		@apply flex-1 space-y-2;
	}

	.profile-name {
		@apply flex items-center space-x-3;
	}

	.profile-name h1 {
		@apply text-3xl font-bold text-gray-900;
	}

	.profile-title {
		@apply text-lg text-gray-600;
	}

	.profile-department {
		@apply text-sm text-gray-500;
	}

	.profile-contact {
		@apply space-y-1 pt-2;
	}

	.contact-item {
		@apply flex items-center space-x-2 text-sm;
	}

	.contact-item i {
		@apply h-4 w-4 text-gray-400;
	}

	.contact-link {
		@apply text-blue-600 hover:text-blue-800;
	}

	.profile-actions {
		@apply flex-shrink-0 space-x-3;
	}

	/* Profile Details */
	.profile-details {
		@apply grid grid-cols-1 gap-6 lg:grid-cols-2;
	}

	.detail-section {
		@apply space-y-4;
	}

	.detail-section__title {
		@apply border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900;
	}

	.detail-grid {
		@apply grid grid-cols-1 gap-4 sm:grid-cols-2;
	}

	.detail-item {
		@apply space-y-1;
	}

	.detail-item--full {
		@apply sm:col-span-2;
	}

	.detail-label {
		@apply block text-sm font-medium uppercase tracking-wide text-gray-500;
	}

	.detail-value {
		@apply text-sm text-gray-900;
	}

	.detail-note {
		@apply ml-1 text-xs text-gray-500;
	}

	.roles-list {
		@apply flex flex-wrap gap-2;
	}

	/* Deactivate Modal */
	.deactivate-modal {
		@apply space-y-4;
	}

	.modal-description {
		@apply text-sm text-gray-600;
	}

	.modal-field {
		@apply space-y-2;
	}

	.modal-label {
		@apply block text-sm font-medium text-gray-700;
	}

	.modal-textarea {
		@apply w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.profile-details {
			@apply grid-cols-1;
		}
	}

	@media (max-width: 640px) {
		.profile-header__content {
			@apply flex-col space-x-0 space-y-6 text-center;
		}

		.profile-actions {
			@apply w-full flex-col space-x-0 space-y-3;
		}

		.detail-grid {
			@apply grid-cols-1;
		}

		.detail-item--full {
			@apply col-span-1;
		}
	}

	/* Animations */
	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
