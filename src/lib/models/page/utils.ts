import { ApplicationPage } from './model';
import type { PageCachePolicy, PageMetadata, RequiredOperation } from './types';

/**
 * Factory function to create ApplicationPage from route metadata
 */
export function createApplicationPage(config: {
	route: string;
	title: string;
	requiredOperations: RequiredOperation[];
	requiredPermissions?: string[];
	requiredRoles?: string[];
	category?: PageMetadata['category'];
	cachePolicy?: Partial<PageCachePolicy>;
}): ApplicationPage {
	const metadata: PageMetadata = {
		route: config.route,
		title: config.title,
		requiredPermissions: config.requiredPermissions || [],
		requiredRoles: config.requiredRoles || [],
		isProtected:
			(config.requiredPermissions?.length || 0) > 0 || (config.requiredRoles?.length || 0) > 0,
		category: config.category || 'other',
		tags: [],
		version: '1.0.0',
		lastUpdated: new Date().toISOString()
	};

	return new ApplicationPage({
		title: config.title,
		requiredOperations: config.requiredOperations,
		cachePolicy: config.cachePolicy,
		metadata
	});
}

/**
 * Type guard to check if an object is an ApplicationPage
 */
export function isApplicationPage(obj: unknown): obj is ApplicationPage {
	return obj instanceof ApplicationPage;
}
