/**
 * RBAC-aware data loader with integrated GraphQL client
 */

import type { RequestEvent } from '@sveltejs/kit';
import { BaseRouteLoader } from './base-loader';
import { AccessTier } from '$lib/server/rbac-utils';
import { createGraphQLClient, type UnifiedGraphQLClient } from '$lib/server/graphql/unified-client';

export class RBACDataLoader extends BaseRouteLoader {
	protected client: UnifiedGraphQLClient;

	constructor(event: RequestEvent, requiredPermissions: string[] | AccessTier = []) {
		super(event, requiredPermissions);
		this.client = createGraphQLClient(event);
	}

	async loadWithClient(
		loadFn: (client: UnifiedGraphQLClient) => Promise<Record<string, any>>
	): Promise<Record<string, any>> {
		this['load'] = () => loadFn(this.client);
		return this.execute();
	}

	protected async load(): Promise<Record<string, any>> {
		return {};
	}
}

export async function quickLoad(
	event: RequestEvent,
	requiredPermissions: string[] | AccessTier,
	loadFn: (client: UnifiedGraphQLClient) => Promise<Record<string, any>>
): Promise<Record<string, any>> {
	const loader = new RBACDataLoader(event, requiredPermissions);
	loader['load'] = () => loadFn(loader['client']);
	return loader.execute();
}
