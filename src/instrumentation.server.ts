import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://2beda36f672fae16a103f17b6ed8cda2@o4510297355583488.ingest.us.sentry.io/4510297357156352',

	tracesSampleRate: 1.0,

	// Enable logs to be sent to Sentry
	enableLogs: true,

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	spotlight: import.meta.env.DEV
});
