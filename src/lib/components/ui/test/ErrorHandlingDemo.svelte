<script lang="ts">
	import Button from '../button/button.svelte';
	import { showError, showSuccess, showWarning, showInfo, handleApiCall } from '$lib/utils/errors';
	import { ApiErrorHandler } from '$lib/utils/errors';
	import { apiClient } from '$lib/api';

	function testSuccessToast() {
		showSuccess('Operation completed successfully!', { title: 'Success' });
	}

	function testErrorToast() {
		showError('Something went wrong with your request', { title: 'Error', timeout: 6000 });
	}

	function testWarningToast() {
		showWarning('This action cannot be undone', { title: 'Warning' });
	}

	function testInfoToast() {
		showInfo('New update available for download', { title: 'Information' });
	}

	async function testApiError() {
		// Simulate API call to test error handling
		const result = await handleApiCall(() => apiClient.get('/nonexistent-endpoint'), {
			successMessage: 'Data loaded successfully!',
			errorMessage: 'Failed to load data',
			showSuccessToast: true,
			showErrorToast: true
		});
		console.log('API call result:', result);
	}

	async function testNetworkError() {
		// Simulate network error
		try {
			await fetch('http://invalid-url-that-does-not-exist.com');
		} catch (error) {
			const apiError = {
				data: null,
				success: false,
				error: 'Network error occurred',
				status: 0,
				details: { originalError: error }
			};

			ApiErrorHandler.handleWithToast(apiError, 'Failed to connect to server');
		}
	}

	function testValidationError() {
		const apiError = {
			data: {
				field_errors: {
					email: ['Email is required', 'Email must be valid'],
					password: ['Password must be at least 8 characters']
				}
			},
			success: false,
			error: 'Validation failed',
			status: 422
		};

		ApiErrorHandler.handleWithToast(apiError);
	}
</script>

<div class="mx-auto max-w-md space-y-4 p-6">
	<h3 class="text-lg font-semibold text-foreground">Toast Notification Tests</h3>

	<div class="grid grid-cols-2 gap-2">
		<Button on:click={testSuccessToast} variant="default" size="sm">Success Toast</Button>

		<Button on:click={testErrorToast} variant="destructive" size="sm">Error Toast</Button>

		<Button on:click={testWarningToast} variant="secondary" size="sm">Warning Toast</Button>

		<Button on:click={testInfoToast} variant="outline" size="sm">Info Toast</Button>
	</div>

	<div class="border-t pt-4">
		<h4 class="text-md mb-2 font-medium text-foreground">API Error Tests</h4>

		<div class="grid grid-cols-1 gap-2">
			<Button on:click={testApiError} variant="outline" size="sm">Test API 404 Error</Button>

			<Button on:click={testNetworkError} variant="outline" size="sm">Test Network Error</Button>

			<Button on:click={testValidationError} variant="outline" size="sm">
				Test Validation Error
			</Button>
		</div>
	</div>

	<p class="text-sm text-muted-foreground">
		Click the buttons above to test different types of toast notifications and error handling
		scenarios.
	</p>
</div>
