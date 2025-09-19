/**
 * Performance Budget Configuration
 * Defines performance targets and budgets for the MountainHR application
 */

export const performanceBudget = {
	// Bundle size limits (in bytes)
	budgets: [
		// Main bundle
		{
			type: 'bundle',
			name: 'main',
			maximumWarning: 250_000, // 250KB
			maximumError: 500_000 // 500KB
		},

		// Vendor bundle
		{
			type: 'bundle',
			name: 'vendor',
			maximumWarning: 300_000, // 300KB
			maximumError: 600_000 // 600KB
		},

		// Individual chunks
		{
			type: 'anyComponentStyle',
			maximumWarning: 6_000, // 6KB per component CSS
			maximumError: 12_000 // 12KB max
		},

		// Initial bundle (critical path)
		{
			type: 'initial',
			maximumWarning: 200_000, // 200KB
			maximumError: 350_000 // 350KB
		}
	],

	// Core Web Vitals targets
	webVitals: {
		// Largest Contentful Paint (LCP)
		lcp: {
			good: 2.5, // seconds
			poor: 4.0 // seconds
		},

		// First Input Delay (FID)
		fid: {
			good: 0.1, // seconds (100ms)
			poor: 0.3 // seconds (300ms)
		},

		// Cumulative Layout Shift (CLS)
		cls: {
			good: 0.1, // score
			poor: 0.25 // score
		},

		// First Contentful Paint (FCP)
		fcp: {
			good: 1.8, // seconds
			poor: 3.0 // seconds
		},

		// Time to Interactive (TTI)
		tti: {
			good: 3.8, // seconds
			poor: 7.3 // seconds
		}
	},

	// Network performance targets
	network: {
		// GraphQL query response time
		graphql: {
			good: 200, // ms
			poor: 1000 // ms
		},

		// API endpoint response time
		api: {
			good: 500, // ms
			poor: 2000 // ms
		},

		// Navigation timing
		navigation: {
			good: 1000, // ms
			poor: 2500 // ms
		}
	},

	// Resource limits
	resources: {
		// Maximum number of HTTP requests per page
		maxRequests: 50,

		// Image size limits
		images: {
			maxSize: 500_000, // 500KB per image
			totalSize: 2_000_000 // 2MB total images per page
		},

		// Font loading
		fonts: {
			maxSize: 200_000, // 200KB per font file
			totalSize: 500_000, // 500KB total fonts
			maxCount: 4 // Maximum 4 font files
		},

		// Third-party resources
		thirdParty: {
			maxSize: 100_000, // 100KB total third-party code
			maxCount: 3 // Maximum 3 third-party requests
		}
	},

	// Performance monitoring thresholds
	monitoring: {
		// Alert thresholds for slow operations
		slowQueryThreshold: 1000, // 1 second
		slowNavigationThreshold: 2000, // 2 seconds
		memoryLeakThreshold: 50_000_000, // 50MB memory usage

		// Error rate thresholds
		errorRateWarning: 0.01, // 1%
		errorRateCritical: 0.05, // 5%

		// Cache hit rate targets
		cacheHitRateTarget: 0.8, // 80%

		// CPU usage thresholds
		cpuUsageWarning: 70, // 70%
		cpuUsageCritical: 90 // 90%
	},

	// Lighthouse audit thresholds
	lighthouse: {
		performance: {
			target: 90, // Target score
			warning: 75 // Warning threshold
		},

		accessibility: {
			target: 95, // Target score
			warning: 90 // Warning threshold
		},

		bestPractices: {
			target: 90, // Target score
			warning: 80 // Warning threshold
		},

		seo: {
			target: 90, // Target score
			warning: 80 // Warning threshold
		}
	},

	// Mobile performance targets (more stringent)
	mobile: {
		webVitals: {
			lcp: {
				good: 2.0, // seconds (tighter than desktop)
				poor: 3.5 // seconds
			},

			fid: {
				good: 0.08, // seconds (80ms)
				poor: 0.25 // seconds
			}
		},

		// Mobile-specific resource limits
		resources: {
			maxRequests: 30, // Fewer requests on mobile
			totalBundleSize: 400_000 // 400KB total bundle size
		}
	}
};

// Export performance checking functions
export const performanceChecks = {
	// Check if bundle size is within budget
	checkBundleSize(bundleName, size) {
		const budget = performanceBudget.budgets.find((b) => b.name === bundleName);

		if (!budget) {
			console.warn(`No budget defined for bundle: ${bundleName}`);
			return { status: 'unknown', size };
		}

		if (size > budget.maximumError) {
			return { status: 'error', size, budget: budget.maximumError };
		} else if (size > budget.maximumWarning) {
			return { status: 'warning', size, budget: budget.maximumWarning };
		}

		return { status: 'good', size, budget: budget.maximumError };
	},

	// Check Web Vitals score
	checkWebVital(metric, value) {
		const thresholds = performanceBudget.webVitals[metric];

		if (!thresholds) {
			console.warn(`No thresholds defined for metric: ${metric}`);
			return { status: 'unknown', value };
		}

		if (value <= thresholds.good) {
			return { status: 'good', value, threshold: thresholds.good };
		} else if (value <= thresholds.poor) {
			return { status: 'needs-improvement', value, threshold: thresholds.poor };
		}

		return { status: 'poor', value, threshold: thresholds.poor };
	},

	// Check network performance
	checkNetworkPerformance(type, duration) {
		const thresholds = performanceBudget.network[type];

		if (!thresholds) {
			console.warn(`No thresholds defined for network type: ${type}`);
			return { status: 'unknown', duration };
		}

		if (duration <= thresholds.good) {
			return { status: 'good', duration, threshold: thresholds.good };
		} else if (duration <= thresholds.poor) {
			return { status: 'needs-improvement', duration, threshold: thresholds.poor };
		}

		return { status: 'poor', duration, threshold: thresholds.poor };
	},

	// Generate performance report
	generateReport(metrics) {
		const report = {
			timestamp: Date.now(),
			overall: 'good',
			details: {},
			recommendations: []
		};

		// Check each metric category
		if (metrics.bundles) {
			report.details.bundles = {};

			Object.entries(metrics.bundles).forEach(([name, size]) => {
				const check = this.checkBundleSize(name, size);
				report.details.bundles[name] = check;

				if (check.status === 'error') {
					report.overall = 'poor';
					report.recommendations.push(
						`Bundle "${name}" is ${Math.round(size / 1024)}KB, exceeding the ${Math.round(check.budget / 1024)}KB limit. Consider code splitting or removing unused dependencies.`
					);
				} else if (check.status === 'warning') {
					if (report.overall === 'good') report.overall = 'needs-improvement';
					report.recommendations.push(
						`Bundle "${name}" is approaching size limit. Consider optimizations.`
					);
				}
			});
		}

		if (metrics.webVitals) {
			report.details.webVitals = {};

			Object.entries(metrics.webVitals).forEach(([metric, value]) => {
				const check = this.checkWebVital(metric, value);
				report.details.webVitals[metric] = check;

				if (check.status === 'poor') {
					report.overall = 'poor';
					report.recommendations.push(
						`${metric.toUpperCase()} score is poor (${value}). Target: ${check.threshold}`
					);
				}
			});
		}

		return report;
	}
};

// Performance optimization recommendations
export const optimizationRecommendations = {
	bundleSize: [
		'Enable tree shaking for unused code elimination',
		'Use dynamic imports for code splitting',
		'Optimize images with WebP format and compression',
		'Remove unused dependencies from package.json',
		'Use CDN for static assets',
		'Enable gzip/brotli compression',
		'Minimize CSS and remove unused styles'
	],

	webVitals: {
		lcp: [
			'Optimize images (compress, modern formats, responsive)',
			'Eliminate render-blocking resources',
			'Improve server response times',
			'Preload key resources',
			'Use efficient cache policy'
		],

		fid: [
			'Minimize main thread work',
			'Reduce JavaScript execution time',
			'Defer non-critical JavaScript',
			'Use web workers for heavy computations',
			'Optimize third-party code'
		],

		cls: [
			'Set explicit dimensions for images and videos',
			'Reserve space for dynamic content',
			'Avoid inserting content above existing content',
			'Use transform animations instead of layout-triggering properties'
		]
	},

	network: [
		'Implement GraphQL query optimization',
		'Use request batching and caching',
		'Enable HTTP/2 server push',
		'Optimize database queries',
		'Implement CDN for static assets',
		'Use service worker for caching',
		'Minimize API payload sizes'
	]
};
