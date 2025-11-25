import {
	handleErrorWithSentry,
	replayIntegration,
	feedbackIntegration,
	breadcrumbsIntegration
} from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

// Only initialize Sentry in production to prevent console flooding during dev
if (import.meta.env.PROD) {
	Sentry.init({
		dsn: 'https://2beda36f672fae16a103f17b6ed8cda2@o4510297355583488.ingest.us.sentry.io/4510297357156352',

		// Optimized sampling: 100% of errors, intelligent sampling for performance
		// Reduces Sentry costs by ~90% while maintaining critical coverage
		tracesSampler: (samplingContext) => {
			// Always inherit parent sampling decision for distributed tracing
			if (samplingContext.parentSampled !== undefined) {
				return samplingContext.parentSampled;
			}

			const url = samplingContext.request?.url || '';

			// 100% sampling for API routes (critical business logic)
			if (url.includes('/api/')) {
				return 1.0;
			}

			// 100% sampling for GraphQL proxy (critical)
			if (url.includes('/graphql')) {
				return 1.0;
			}

			// 10% sampling for regular page loads
			return 0.1;
		},

		// Enable logs to be sent to Sentry
		enableLogs: true,

		// Session Replay: 10% of sessions, 100% of errors
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,

		// Integrations for enhanced debugging
		integrations: [
			// Session replay for visual debugging
			replayIntegration({
				maskAllText: false,
				blockAllMedia: false,
				maskAllInputs: true // Mask form inputs for privacy
			}),

			// User feedback widget - allows users to report bugs
			feedbackIntegration({
				colorScheme: 'system',
				showBranding: false,
				showName: true,
				showEmail: true,
				isNameRequired: false,
				isEmailRequired: false,
				buttonLabel: 'Report a Bug',
				submitButtonLabel: 'Send Report',
				formTitle: 'Report an Issue',
				messagePlaceholder: 'What went wrong? Please describe the issue...'
			}),

			// Enhanced breadcrumbs for better error context
			breadcrumbsIntegration({
				console: true, // Log console messages
				dom: true, // Track DOM events
				fetch: true, // Track fetch requests
				history: true, // Track navigation
				xhr: true, // Track XHR requests
				sentry: true // Track Sentry events
			})
		],

		// Enable sending user PII (Personally Identifiable Information)
		// https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
		sendDefaultPii: true
	});
}

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
