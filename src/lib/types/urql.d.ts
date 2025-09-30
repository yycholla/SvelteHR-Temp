/**
 * Local URQL Type Definitions
 *
 * These types are extracted from @urql/core to resolve import issues
 * where @urql/core types are not properly exported for this project's setup.
 */

import type { Source } from 'wonka';

export interface AnyVariables {
	[key: string]: any;
}

export interface OperationContext {
	url: string;
	fetchOptions?: RequestInit;
	fetch?: typeof fetch;
	preferGetMethod?: boolean;
	requestPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only';
	pollInterval?: number;
	meta?: any;
	suspense?: boolean;
	[key: string]: any;
}

export interface Operation<Data = any, Variables extends AnyVariables = AnyVariables> {
	key: number;
	query: import('graphql').DocumentNode;
	variables?: Variables;
	operationName: string;
	context: OperationContext;
	kind: 'query' | 'mutation' | 'subscription' | 'teardown';
}

export interface OperationResult<Data = any, Variables extends AnyVariables = AnyVariables> {
	operation: Operation<Data, Variables>;
	data?: Data;
	error?: import('@urql/core').CombinedError;
	extensions?: Record<string, any>;
	stale?: boolean;
	hasNext?: boolean;
}

export interface ExchangeInput {
	forward: (operation$: Source<Operation>) => Source<OperationResult>;
}

export interface ExchangeIO {
	(ops$: Source<Operation>): Source<OperationResult>;
}

export type Exchange = (input: ExchangeInput) => ExchangeIO;
