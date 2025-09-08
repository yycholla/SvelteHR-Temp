/**
 * SEO utilities for meta tags, structured data, and optimization
 */

export interface SEOMetadata {
	title?: string;
	description?: string;
	keywords?: string[];
	image?: string;
	url?: string;
	type?: 'website' | 'article' | 'profile' | 'app';
	siteName?: string;
	locale?: string;
	author?: string;
	publishedTime?: string;
	modifiedTime?: string;
	section?: string;
	tags?: string[];
	noindex?: boolean;
	nofollow?: boolean;
	canonical?: string;
}

export interface StructuredData {
	'@type': string;
	'@context'?: string;
	[key: string]: any;
}

/**
 * Default SEO configuration for MountainHR
 */
export const DEFAULT_SEO: SEOMetadata = {
	title: 'MountainHR - Modern HR Management System',
	description: 'Streamline your HR processes with MountainHR\'s comprehensive employee management, communication tools, and analytics dashboard.',
	keywords: [
		'HR management',
		'employee management', 
		'human resources',
		'HR software',
		'employee portal',
		'workforce management',
		'HR analytics',
		'employee communication'
	],
	image: '/images/mountainhr-og-image.jpg',
	type: 'website',
	siteName: 'MountainHR',
	locale: 'en_US',
	author: 'MountainHR Team'
};

/**
 * Generate page title with site name
 */
export function generateTitle(pageTitle?: string, siteName: string = 'MountainHR'): string {
	if (!pageTitle) return siteName;
	return `${pageTitle} | ${siteName}`;
}

/**
 * Generate meta description with fallback
 */
export function generateDescription(description?: string, fallback?: string): string {
	return description || fallback || DEFAULT_SEO.description!;
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string, baseUrl: string = 'https://mountainhr.com'): string {
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	return `${baseUrl}${cleanPath}`;
}

/**
 * Generate keywords meta content
 */
export function generateKeywords(keywords: string[] = []): string {
	const combinedKeywords = [...DEFAULT_SEO.keywords!, ...keywords];
	return [...new Set(combinedKeywords)].join(', ');
}

/**
 * Generate Open Graph meta tags
 */
export function generateOpenGraphTags(metadata: SEOMetadata): Record<string, string> {
	const baseUrl = metadata.url || 'https://mountainhr.com';
	
	return {
		'og:title': metadata.title || DEFAULT_SEO.title!,
		'og:description': metadata.description || DEFAULT_SEO.description!,
		'og:type': metadata.type || DEFAULT_SEO.type!,
		'og:url': generateCanonicalUrl(metadata.url || '', baseUrl),
		'og:image': metadata.image || DEFAULT_SEO.image!,
		'og:site_name': metadata.siteName || DEFAULT_SEO.siteName!,
		'og:locale': metadata.locale || DEFAULT_SEO.locale!,
		...(metadata.author && { 'og:author': metadata.author }),
		...(metadata.publishedTime && { 'og:published_time': metadata.publishedTime }),
		...(metadata.modifiedTime && { 'og:modified_time': metadata.modifiedTime }),
		...(metadata.section && { 'og:section': metadata.section }),
		...(metadata.tags && metadata.tags.length > 0 && { 
			'og:article:tag': metadata.tags.join(', ') 
		})
	};
}

/**
 * Generate Twitter Card meta tags
 */
export function generateTwitterTags(metadata: SEOMetadata): Record<string, string> {
	return {
		'twitter:card': 'summary_large_image',
		'twitter:site': '@MountainHR',
		'twitter:creator': '@MountainHR',
		'twitter:title': metadata.title || DEFAULT_SEO.title!,
		'twitter:description': metadata.description || DEFAULT_SEO.description!,
		'twitter:image': metadata.image || DEFAULT_SEO.image!,
		...(metadata.url && { 'twitter:url': generateCanonicalUrl(metadata.url) })
	};
}

/**
 * Generate robots meta tag
 */
export function generateRobotsTag(metadata: SEOMetadata): string {
	const directives: string[] = [];
	
	if (metadata.noindex) {
		directives.push('noindex');
	} else {
		directives.push('index');
	}
	
	if (metadata.nofollow) {
		directives.push('nofollow');
	} else {
		directives.push('follow');
	}
	
	// Default directives for better SEO
	directives.push('max-snippet:-1');
	directives.push('max-image-preview:large');
	directives.push('max-video-preview:-1');
	
	return directives.join(', ');
}

/**
 * Generate JSON-LD structured data for organization
 */
export function generateOrganizationStructuredData(): StructuredData {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'MountainHR',
		description: 'Modern HR Management System for growing companies',
		url: 'https://mountainhr.com',
		logo: {
			'@type': 'ImageObject',
			url: 'https://mountainhr.com/images/logo.png',
			width: 400,
			height: 400
		},
		sameAs: [
			'https://twitter.com/MountainHR',
			'https://linkedin.com/company/mountainhr',
			'https://github.com/mountainhr'
		],
		contactPoint: {
			'@type': 'ContactPoint',
			telephone: '+1-555-HR-HELP',
			contactType: 'customer service',
			availableLanguage: 'English'
		},
		address: {
			'@type': 'PostalAddress',
			streetAddress: '123 Mountain View Drive',
			addressLocality: 'Denver',
			addressRegion: 'CO',
			postalCode: '80202',
			addressCountry: 'US'
		}
	};
}

/**
 * Generate JSON-LD structured data for software application
 */
export function generateSoftwareApplicationStructuredData(): StructuredData {
	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'MountainHR',
		description: 'Comprehensive HR management system with employee portal, analytics, and communication tools',
		url: 'https://mountainhr.com',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web Browser',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			description: 'Free trial available'
		},
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			reviewCount: '156',
			bestRating: '5',
			worstRating: '1'
		},
		author: {
			'@type': 'Organization',
			name: 'MountainHR Team'
		},
		datePublished: '2024-01-01',
		dateModified: new Date().toISOString().split('T')[0],
		version: '1.0.0'
	};
}

/**
 * Generate JSON-LD structured data for webpage
 */
export function generateWebPageStructuredData(metadata: SEOMetadata): StructuredData {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: metadata.title || DEFAULT_SEO.title!,
		description: metadata.description || DEFAULT_SEO.description!,
		url: generateCanonicalUrl(metadata.url || ''),
		inLanguage: 'en-US',
		isPartOf: {
			'@type': 'WebSite',
			name: DEFAULT_SEO.siteName!,
			url: 'https://mountainhr.com'
		},
		datePublished: metadata.publishedTime,
		dateModified: metadata.modifiedTime || new Date().toISOString(),
		author: {
			'@type': 'Organization',
			name: metadata.author || DEFAULT_SEO.author!
		}
	};
}

/**
 * Generate FAQ structured data for help pages
 */
export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>): StructuredData {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(faq => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer
			}
		}))
	};
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(
	breadcrumbs: Array<{ name: string; url: string }>
): StructuredData {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: breadcrumbs.map((crumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: crumb.name,
			item: generateCanonicalUrl(crumb.url)
		}))
	};
}

/**
 * Page-specific SEO configurations
 */
export const PAGE_SEO_CONFIGS: Record<string, Partial<SEOMetadata>> = {
	'/': {
		title: 'Dashboard',
		description: 'Access your HR dashboard with real-time analytics, employee insights, and workflow management tools.',
		keywords: ['HR dashboard', 'employee analytics', 'workforce insights', 'HR metrics']
	},
	'/login': {
		title: 'Sign In',
		description: 'Access your MountainHR account to manage employees, communications, and HR processes.',
		keywords: ['login', 'sign in', 'HR access', 'employee portal'],
		noindex: true
	},
	'/employees': {
		title: 'Employee Management',
		description: 'Manage your workforce with comprehensive employee profiles, contact information, and organizational tools.',
		keywords: ['employee management', 'staff directory', 'workforce management', 'employee profiles']
	},
	'/departments': {
		title: 'Departments Overview',
		description: 'View and manage organizational departments, team structures, and departmental analytics.',
		keywords: ['departments', 'organizational structure', 'team management', 'department analytics']
	},
	'/communications': {
		title: 'Communications Center',
		description: 'Send announcements, manage team communications, and track message engagement across your organization.',
		keywords: ['team communication', 'company announcements', 'internal messaging', 'employee engagement']
	},
	'/processes': {
		title: 'HR Processes',
		description: 'Streamline HR workflows including onboarding, performance reviews, leave requests, and compliance tracking.',
		keywords: ['HR processes', 'employee onboarding', 'performance reviews', 'leave management', 'HR workflows']
	}
};

/**
 * Get SEO configuration for a specific page
 */
export function getPageSEO(pathname: string): SEOMetadata {
	const pageConfig = PAGE_SEO_CONFIGS[pathname] || {};
	
	return {
		...DEFAULT_SEO,
		...pageConfig,
		title: generateTitle(pageConfig.title),
		description: generateDescription(pageConfig.description),
		url: pathname,
		canonical: generateCanonicalUrl(pathname),
		keywords: pageConfig.keywords ? 
			[...DEFAULT_SEO.keywords!, ...pageConfig.keywords] : 
			DEFAULT_SEO.keywords
	};
}

/**
 * Generate complete SEO metadata object for server-side rendering
 */
export function generateSEOMetadata(pathname: string, customMetadata?: Partial<SEOMetadata>): {
	meta: Record<string, string>;
	openGraph: Record<string, string>;
	twitter: Record<string, string>;
	structuredData: StructuredData[];
	title: string;
} {
	const seoConfig = {
		...getPageSEO(pathname),
		...customMetadata
	};

	const meta = {
		description: seoConfig.description!,
		keywords: generateKeywords(seoConfig.keywords),
		robots: generateRobotsTag(seoConfig),
		author: seoConfig.author!,
		'theme-color': '#2563eb',
		'msapplication-TileColor': '#2563eb',
		viewport: 'width=device-width, initial-scale=1.0',
		'format-detection': 'telephone=no'
	};

	if (seoConfig.canonical) {
		meta['canonical'] = seoConfig.canonical;
	}

	const structuredData = [
		generateOrganizationStructuredData(),
		generateSoftwareApplicationStructuredData(),
		generateWebPageStructuredData(seoConfig)
	];

	return {
		meta,
		openGraph: generateOpenGraphTags(seoConfig),
		twitter: generateTwitterTags(seoConfig),
		structuredData,
		title: seoConfig.title!
	};
}

/**
 * Sitemap generation helper
 */
export interface SitemapEntry {
	url: string;
	lastModified?: string;
	changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority?: number;
}

export function generateSitemapEntries(): SitemapEntry[] {
	const baseUrl = 'https://mountainhr.com';
	const now = new Date().toISOString().split('T')[0];

	return [
		{
			url: `${baseUrl}/`,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 1.0
		},
		{
			url: `${baseUrl}/employees`,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 0.8
		},
		{
			url: `${baseUrl}/departments`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.8
		},
		{
			url: `${baseUrl}/communications`,
			lastModified: now,
			changeFrequency: 'daily',
			priority: 0.8
		},
		{
			url: `${baseUrl}/processes`,
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 0.8
		},
		{
			url: `${baseUrl}/login`,
			lastModified: now,
			changeFrequency: 'monthly',
			priority: 0.3
		}
	];
}

/**
 * Performance optimization for SEO
 */
export function preloadCriticalResources() {
	if (typeof document === 'undefined') return;

	// Preload critical fonts
	const fontLinks = [
		'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
	];

	fontLinks.forEach(href => {
		const link = document.createElement('link');
		link.rel = 'preload';
		link.href = href;
		link.as = 'style';
		link.onload = function() {
			this.onload = null;
			this.rel = 'stylesheet';
		};
		document.head.appendChild(link);
	});

	// Preload critical images
	const criticalImages = [
		'/images/mountainhr-og-image.jpg',
		'/images/logo.png'
	];

	criticalImages.forEach(src => {
		const link = document.createElement('link');
		link.rel = 'preload';
		link.href = src;
		link.as = 'image';
		document.head.appendChild(link);
	});
}