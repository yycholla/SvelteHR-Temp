<!--
GraphQL Error Handling Demo Component

Demonstrates the enhanced GraphQL error handling system with:
- Different error types and their user feedback
- Interactive error simulation
- Toast notifications with actionable buttons
- Error logging and monitoring integration
-->

<script lang="ts">
	import { GraphQLClientError } from '$lib/graphql/client';
	import { GraphQLErrorHandler, handleGraphQLError, withGraphQLErrorHandling } from '$lib/graphql/error-handler';
	import { showSuccess, showInfo } from '$lib/utils/errors';

	let isLoading = false;
	let lastError: GraphQLClientError | null = null;
	let errorCount = 0;

	/**
	 * Simulate different types of GraphQL errors for demonstration
	 */
	function simulateError(errorType: string) {
		isLoading = true;
		errorCount++;
		
		setTimeout(() => {
			let error: GraphQLClientError;
			
			switch (errorType) {
				case 'auth':
					error = new GraphQLClientError(
						'Authentication token has expired',
						[{ message: 'Token expired', extensions: { code: 'UNAUTHENTICATED' } }],
						401,
						{ code: 'UNAUTHENTICATED' },
						'GetCurrentUser'
					);
					break;
				
				case 'permission':
					error = new GraphQLClientError(
						'Insufficient permissions to access employee data',
						[{ message: 'Access denied', extensions: { code: 'FORBIDDEN' } }],
						403,
						{ code: 'FORBIDDEN' },
						'GetEmployees',
						{ department: 'hr' }
					);
					break;
				
				case 'validation':
					error = new GraphQLClientError(
						'Invalid input provided',
						[{ 
							message: 'Validation failed', 
							extensions: { 
								code: 'VALIDATION_ERROR',
								validationErrors: [
									{ field: 'email', message: 'Email format is invalid' },
									{ field: 'firstName', message: 'First name is required' }
								]
							} 
						}],
						422,
						{ 
							code: 'VALIDATION_ERROR',
							validationErrors: [
								{ field: 'email', message: 'Email format is invalid' },
								{ field: 'firstName', message: 'First name is required' }
							]
						},
						'CreateEmployee'
					);
					break;
				
				case 'network':
					error = new GraphQLClientError(
						'Network connection failed',
						undefined,
						0,
						undefined,
						'GetDashboardStats'
					);
					break;
				
				case 'rate-limit':
					error = new GraphQLClientError(
						'Too many requests',
						[{ message: 'Rate limit exceeded', extensions: { code: 'RATE_LIMITED', retryAfter: '60' } }],
						429,
						{ code: 'RATE_LIMITED', retry_after: '60' },
						'BulkUpdateEmployees'
					);
					break;
				
				case 'server':
					error = new GraphQLClientError(
						'Internal server error',
						undefined,
						500,
						undefined,
						'ComplexQuery',
						{ filters: { department: 'engineering' } }
					);
					break;
				
				default:
					error = new GraphQLClientError(
						'Unknown GraphQL error occurred',
						undefined,
						undefined,
						undefined,
						'UnknownOperation'
					);
			}
			
			lastError = error;
			isLoading = false;
			
			// Handle the error with our enhanced system
			handleGraphQLError(error, 'error-demo', {
				showToast: true,
				showActions: true
			});
		}, 1000); // Simulate network delay
	}

	/**
	 * Demonstrate the async wrapper with error handling
	 */
	async function testAsyncWrapper() {
		isLoading = true;
		
		const result = await withGraphQLErrorHandling(
			async () => {
				// Simulate an async operation that fails
				await new Promise(resolve => setTimeout(resolve, 800));
				throw new GraphQLClientError(
					'Async operation failed',
					undefined,
					500,
					undefined,
					'AsyncTest'
				);
			},
			'async-wrapper-demo',
			{
				showToast: true,
				showActions: true,
				customMessage: 'The async operation encountered an error',
				fallbackValue: 'fallback-data'
			}
		);
		
		isLoading = false;
		
		if (result) {
			showSuccess(`Async operation completed with fallback: ${result}`);
		}
	}

	/**
	 * Demonstrate specific error handler methods
	 */
	function testSpecificHandlers(handlerType: string) {
		isLoading = true;
		
		setTimeout(() => {
			let error: GraphQLClientError;
			
			switch (handlerType) {
				case 'auth':
					error = new GraphQLClientError(
						'Session expired',
						undefined,
						401,
						{ code: 'UNAUTHENTICATED' },
						'SecureOperation'
					);
					GraphQLErrorHandler.handleAuthError(error, { 
						showToast: true,
						redirectPath: '/demo-login'
					});
					break;
				
				case 'permission':
					error = new GraphQLClientError(
						'Access denied',
						undefined,
						403,
						{ code: 'FORBIDDEN' },
						'AdminOperation'
					);
					GraphQLErrorHandler.handlePermissionError(error, {
						resource: 'Employee Management',
						requiredPermission: 'employees:write',
						showToast: true
					});
					break;
				
				case 'validation':
					error = new GraphQLClientError(
						'Validation failed',
						undefined,
						422,
						{ 
							code: 'VALIDATION_ERROR',
							validationErrors: [
								{ field: 'username', message: 'Username must be unique' },
								{ field: 'password', message: 'Password must be at least 8 characters' }
							]
						},
						'UpdateProfile'
					);
					const result = GraphQLErrorHandler.handleValidationError(error, {
						showToast: true
					});
					showInfo(`Validation result: ${Object.keys(result.fieldErrors).length} field errors`);
					break;
				
				case 'network':
					error = new GraphQLClientError(
						'Network timeout',
						undefined,
						0,
						undefined,
						'DataSync'
					);
					GraphQLErrorHandler.handleNetworkError(
						error,
						() => showInfo('Retry function called!'),
						{ showToast: true, maxRetries: 3, currentRetry: 1 }
					);
					break;
			}
			
			lastError = error;
			isLoading = false;
		}, 500);
	}

	/**
	 * Clear the last error for testing
	 */
	function clearLastError() {
		lastError = null;
		errorCount = 0;
		showSuccess('Error state cleared');
	}
</script>

<div class="space-y-6 p-6 bg-surface-100 dark:bg-surface-800 rounded-lg">
	<div class="text-center">
		<h2 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
			GraphQL Error Handling Demo
		</h2>
		<p class="text-surface-700 dark:text-surface-300">
			Interactive demonstration of enhanced GraphQL error handling with user-friendly feedback
		</p>
	</div>

	<!-- Error Simulation Controls -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<div class="space-y-3">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200">Authentication Errors</h3>
			<button
				class="btn btn-sm variant-soft-warning w-full"
				disabled={isLoading}
				onclick={() => simulateError('auth')}
			>
				Token Expired
			</button>
			<button
				class="btn btn-sm variant-soft-secondary w-full"
				disabled={isLoading}
				onclick={() => testSpecificHandlers('auth')}
			>
				Auth Handler
			</button>
		</div>

		<div class="space-y-3">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200">Permission Errors</h3>
			<button
				class="btn btn-sm variant-soft-warning w-full"
				disabled={isLoading}
				onclick={() => simulateError('permission')}
			>
				Access Denied
			</button>
			<button
				class="btn btn-sm variant-soft-secondary w-full"
				disabled={isLoading}
				onclick={() => testSpecificHandlers('permission')}
			>
				Permission Handler
			</button>
		</div>

		<div class="space-y-3">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200">Validation Errors</h3>
			<button
				class="btn btn-sm variant-soft-warning w-full"
				disabled={isLoading}
				onclick={() => simulateError('validation')}
			>
				Invalid Input
			</button>
			<button
				class="btn btn-sm variant-soft-secondary w-full"
				disabled={isLoading}
				onclick={() => testSpecificHandlers('validation')}
			>
				Validation Handler
			</button>
		</div>

		<div class="space-y-3">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200">Network Errors</h3>
			<button
				class="btn btn-sm variant-soft-error w-full"
				disabled={isLoading}
				onclick={() => simulateError('network')}
			>
				Connection Failed
			</button>
			<button
				class="btn btn-sm variant-soft-secondary w-full"
				disabled={isLoading}
				onclick={() => testSpecificHandlers('network')}
			>
				Network Handler
			</button>
		</div>

		<div class="space-y-3">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200">Rate Limiting</h3>
			<button
				class="btn btn-sm variant-soft-warning w-full"
				disabled={isLoading}
				onclick={() => simulateError('rate-limit')}
			>
				Too Many Requests
			</button>
		</div>

		<div class="space-y-3">
			<h3 class="font-semibold text-surface-800 dark:text-surface-200">Server Errors</h3>
			<button
				class="btn btn-sm variant-soft-error w-full"
				disabled={isLoading}
				onclick={() => simulateError('server')}
			>
				Internal Server Error
			</button>
		</div>
	</div>

	<!-- Advanced Features -->
	<div class="border-t border-surface-300 dark:border-surface-600 pt-6">
		<h3 class="font-semibold text-surface-800 dark:text-surface-200 mb-4">Advanced Features</h3>
		<div class="flex flex-wrap gap-3">
			<button
				class="btn btn-sm variant-soft-primary"
				disabled={isLoading}
				onclick={testAsyncWrapper}
			>
				Test Async Wrapper
			</button>
			<button
				class="btn btn-sm variant-soft-tertiary"
				disabled={isLoading}
				onclick={() => simulateError('unknown')}
			>
				Unknown Error Type
			</button>
			<button
				class="btn btn-sm variant-soft-success"
				disabled={isLoading}
				onclick={clearLastError}
			>
				Clear Error State
			</button>
		</div>
	</div>

	<!-- Status Display -->
	<div class="bg-surface-200 dark:bg-surface-700 p-4 rounded">
		<div class="flex items-center justify-between mb-2">
			<span class="font-medium text-surface-800 dark:text-surface-200">Demo Status</span>
			{#if isLoading}
				<span class="animate-pulse text-primary-600">Processing...</span>
			{:else}
				<span class="text-success-600">Ready</span>
			{/if}
		</div>
		
		<div class="text-sm text-surface-600 dark:text-surface-400 space-y-1">
			<div>Errors Simulated: {errorCount}</div>
			{#if lastError}
				<div>Last Error Type: {lastError.isAuthError ? 'Authentication' : 
					lastError.isPermissionError ? 'Permission' : 
					lastError.isValidationError ? 'Validation' : 
					lastError.isNetworkError ? 'Network' : 
					lastError.isRateLimitError ? 'Rate Limit' : 'Other'}</div>
				<div>Operation: {lastError.operationName || 'Unknown'}</div>
				<div>Severity: {lastError.severity}</div>
				<div>Retryable: {lastError.isRetryable ? 'Yes' : 'No'}</div>
				{#if lastError.suggestedActions.length > 0}
					<div>Suggested Actions: {lastError.suggestedActions.join(', ')}</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Usage Notes -->
	<div class="text-xs text-surface-500 dark:text-surface-400 bg-surface-50 dark:bg-surface-900 p-3 rounded">
		<p class="font-medium mb-1">Usage Notes:</p>
		<ul class="list-disc list-inside space-y-1">
			<li>Each error type shows different toast notifications and user actions</li>
			<li>Authentication errors automatically offer sign-in redirects</li>
			<li>Network errors provide retry options when applicable</li>
			<li>Validation errors show field-specific guidance</li>
			<li>All errors are logged with appropriate severity levels</li>
			<li>Check browser console for detailed error logging</li>
		</ul>
	</div>
</div>