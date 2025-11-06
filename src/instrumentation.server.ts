import * as Sentry from '@sentry/sveltekit';

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

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	spotlight: import.meta.env.DEV
});
