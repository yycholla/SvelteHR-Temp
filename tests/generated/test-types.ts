/**
 * Generated types for GraphQL contract testing
 */

export interface DeprecatedField {
	type: string;
	field: string;
	reason?: string;
}

export interface SchemaContract {
	version: string;
	types: string[];
	queries: string[];
	mutations: string[];
	subscriptions?: string[];
}
