/**
 * Encryption Key Operations - GraphQL Integration
 *
 * GraphQL operations for server-side encrypted key management using pgcrypto.
 * Part of Feature 024: Document encryption system.
 */

import { gql } from '@urql/svelte';

/**
 * GraphQL Mutation: Create Encryption Key
 *
 * Creates a new encryption key with server-side pgcrypto encryption.
 * The encrypted key data should be base64-encoded before sending.
 */
export const CREATE_ENCRYPTION_KEY = gql`
	mutation CreateEncryptionKey($input: CreateEncryptionKeyInput!) {
		createEncryptionKey(input: $input) {
			id
			keyName
			algorithm
			createdAt
			rotatedAt
			isActive
		}
	}
`;

/**
 * CreateEncryptionKey input type definition
 */
export interface CreateEncryptionKeyInput {
	keyName: string;
	algorithm: string;
	encryptedKey: string; // Base64-encoded encrypted key data
	// Note: userId is determined server-side from authenticated session for security
}

/**
 * CreateEncryptionKey response type
 */
export interface EncryptionKeyResponse {
	id: string;
	keyName: string;
	algorithm: string;
	createdAt: string;
	rotatedAt: string | null;
	isActive: boolean;
}
