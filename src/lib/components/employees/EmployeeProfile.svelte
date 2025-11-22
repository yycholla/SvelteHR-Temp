<script lang="ts">
	import { onMount } from 'svelte';
	import { userService, currentUser as userServiceCurrentUser } from '$lib/services/userService';
	import { currentUser, hasPermission } from '$lib/services/auth';
	import Button from '../base/Button.svelte';
	import Badge from '../base/Badge.svelte';
	import Card from '../base/Card.svelte';
	import Modal from '../base/Modal.svelte';
	import type { User } from '$lib/types';

	// Props
	let {
		employeeId,
		showActions = true,
		onedit = undefined,
		ondeactivated = undefined
	}: {
		employeeId: string;
		showActions?: boolean;
		onedit?: ((detail: { employee: User }) => void) | undefined;
		ondeactivated?: ((detail: { employee: User }) => void) | undefined;
	} = $props();

	// State
	let employee = $state<User | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDeactivateModal = $state(false);
	let deactivateReason = $state('');
	let deactivating = $state(false);

	// Computed values
	let isOwnProfile = $derived(employee?.id === auth.user?.id);
	let canEdit = $derived(auth.user && (isOwnProfile || auth.hasPermission('user:update')));
	let canDeactivate = $derived(auth.user && auth.hasPermission('user:delete') && !isOwnProfile);
	let statusVariant = $derived(employee?.isActive ? 'success' : 'secondary');
	let statusText = $derived(employee?.isActive ? 'Active' : 'Inactive');

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
			ondeactivated?.({ employee });
		} catch (err: any) {
			error = err.message;
		} finally {
			deactivating = false;
		}
	}

	function handleEdit() {
		if (employee) {
			onedit?.({ employee });
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
					<Button variant="secondary" size="sm" leftIcon="refresh-cw" onclick={loadEmployee}>
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
							<Button variant="primary" leftIcon="edit" onclick={handleEdit}>Edit Profile</Button>
						{/if}

						{#if canDeactivate && employee.isActive}
							<Button
								variant="danger"
								leftIcon="user-x"
								onclick={() => (showDeactivateModal = true)}
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

						{#if employee.jobInfo?.salary && (isOwnProfile || auth.hasPermission('user:view_salary'))}
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
							{#each employee.roles as role (role.id)}
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

	{#snippet footer()}
		<Button
			variant="tertiary"
			onclick={() => (showDeactivateModal = false)}
			disabled={deactivating}
		>
			Cancel
		</Button>

		<Button variant="danger" onclick={handleDeactivate} loading={deactivating}>
			Deactivate Employee
		</Button>
	{/snippet}
</Modal>


