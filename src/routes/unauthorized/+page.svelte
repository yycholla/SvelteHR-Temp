<script lang="ts">
	// T012: Unauthorized access page
	// Displayed when users attempt to access resources without proper permissions
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Get the attempted URL from query params if available
	const attemptedUrl = $derived($page.url.searchParams.get('from') || '/dashboard');

	// Get user info if available
	const userEmail = $derived(data.user?.email || 'Unknown');
	const userRole = $derived(data.user?.role || 'Unknown');

	function goToDashboard() {
		goto('/dashboard');
	}

	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
		} else {
			goto('/dashboard');
		}
	}
</script>

<svelte:head>
	<title>Access Denied - SvelteHR</title>
</svelte:head>

<div class="unauthorized-container">
	<div class="unauthorized-card">
		<!-- Icon -->
		<div class="icon-wrapper">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="icon"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
				/>
			</svg>
		</div>

		<!-- Heading -->
		<h1 class="heading">Access Denied</h1>

		<!-- Message -->
		<p class="message">You don't have permission to access this resource.</p>

		<!-- Details -->
		<div class="details">
			<p class="detail-item">
				<span class="detail-label">Account:</span>
				<span class="detail-value">{userEmail}</span>
			</p>
			<p class="detail-item">
				<span class="detail-label">Role:</span>
				<span class="detail-value">{userRole}</span>
			</p>
			{#if attemptedUrl !== '/dashboard'}
				<p class="detail-item">
					<span class="detail-label">Attempted URL:</span>
					<span class="detail-value attempted-url">{attemptedUrl}</span>
				</p>
			{/if}
		</div>

		<!-- Help Text -->
		<div class="help-text">
			<p>
				If you believe you should have access to this resource, please contact your system
				administrator or HR department.
			</p>
		</div>

		<!-- Actions -->
		<div class="actions">
			<button onclick={goToDashboard} class="btn btn-primary"> Go to Dashboard </button>
			<button onclick={goBack} class="btn btn-secondary"> Go Back </button>
		</div>

		<!-- Contact Info -->
		<div class="contact-info">
			<p class="contact-text">Need help?</p>
			<p class="contact-details">
				Contact HR at <a href="mailto:hr@company.com" class="contact-link">hr@company.com</a> or
				call <a href="tel:+1234567890" class="contact-link">(123) 456-7890</a>
			</p>
		</div>
	</div>
</div>

<style>
	.unauthorized-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.unauthorized-card {
		background: white;
		border-radius: 1rem;
		padding: 3rem 2rem;
		max-width: 600px;
		width: 100%;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		text-align: center;
	}

	.icon-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.icon {
		width: 5rem;
		height: 5rem;
		color: #dc2626;
	}

	.heading {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.message {
		font-size: 1.125rem;
		color: #6b7280;
		margin-bottom: 2rem;
	}

	.details {
		background: #f9fafb;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
		text-align: left;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.detail-item:last-child {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.detail-label {
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
	}

	.detail-value {
		font-size: 0.875rem;
		color: #6b7280;
		text-align: right;
	}

	.attempted-url {
		font-family: monospace;
		font-size: 0.75rem;
		word-break: break-all;
	}

	.help-text {
		background: #fef3c7;
		border-left: 4px solid #f59e0b;
		padding: 1rem;
		border-radius: 0.375rem;
		margin-bottom: 2rem;
		text-align: left;
	}

	.help-text p {
		color: #92400e;
		font-size: 0.875rem;
		margin: 0;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.btn-primary {
		background: #4f46e5;
		color: white;
	}

	.btn-primary:hover {
		background: #4338ca;
		transform: translateY(-2px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.btn-secondary {
		background: #e5e7eb;
		color: #374151;
	}

	.btn-secondary:hover {
		background: #d1d5db;
		transform: translateY(-2px);
	}

	.contact-info {
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.contact-text {
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.contact-details {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.contact-link {
		color: #4f46e5;
		text-decoration: none;
		font-weight: 500;
	}

	.contact-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.unauthorized-card {
			padding: 2rem 1.5rem;
		}

		.heading {
			font-size: 1.5rem;
		}

		.actions {
			flex-direction: column;
		}

		.btn {
			width: 100%;
		}
	}
</style>
