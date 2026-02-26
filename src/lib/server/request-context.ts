import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
	accessToken?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();
const REQUEST_CONTEXT_TOKEN_GETTER_KEY = '__SVELTEHR_GET_REQUEST_ACCESS_TOKEN__';

function registerAccessTokenGetter(): void {
	(globalThis as Record<string, unknown>)[REQUEST_CONTEXT_TOKEN_GETTER_KEY] =
		getRequestContextAccessToken;
}

export async function runWithRequestContext<T>(
	context: RequestContext,
	callback: () => Promise<T>
): Promise<T> {
	return await requestContextStorage.run(context, callback);
}

export function setRequestContextAccessToken(accessToken?: string): void {
	const store = requestContextStorage.getStore();
	if (!store) return;
	store.accessToken = accessToken;
}

export function getRequestContextAccessToken(): string | undefined {
	return requestContextStorage.getStore()?.accessToken;
}

registerAccessTokenGetter();
