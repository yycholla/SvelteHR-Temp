// Server-side encryption key management service (Feature 024)
// Handles encrypted storage and retrieval of client-side encryption keys

import type { KeyRegistration, KeyRetrievalResponse } from '$lib/types/document';
import { createUrqlClient } from '$lib/graphql/client';
import { CREATE_ENCRYPTION_KEY } from '$lib/graphql/encryption-operations';
import type { CreateEncryptionKeyInput } from '$lib/graphql/encryption-operations';

// Register a new encryption key via GraphQL (server-side pgcrypto encrypted storage)
// Note: userId is determined server-side from authenticated session
export async function registerKey(
	keyData: ArrayBuffer,
	keyIdentifier: string
): Promise<string> {
	// Convert ArrayBuffer to base64 for transmission
	const keyBytes = new Uint8Array(keyData);
	const base64Key = btoa(String.fromCharCode(...keyBytes));

	const input: CreateEncryptionKeyInput = {
		keyName: keyIdentifier,
		algorithm: 'AES-GCM-256',
		encryptedKey: base64Key
	};

	// Create urql client and execute mutation
	const client = createUrqlClient();
	const result = await client.mutation(CREATE_ENCRYPTION_KEY, { input }).toPromise();

	if (result.error) {
		throw new Error(result.error.message || 'Failed to register encryption key');
	}

	if (!result.data?.createEncryptionKey) {
		throw new Error('Failed to register encryption key: No data returned');
	}

	return result.data.createEncryptionKey.id;
}

// Retrieve an encryption key (server-side decrypted)
export async function retrieveKey(keyId: string): Promise<ArrayBuffer> {
	const response = await fetch(`/api/encryption/keys/${keyId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve encryption key');
	}

	const result: KeyRetrievalResponse = await response.json();

	// Decode base64 to ArrayBuffer
	const binaryString = atob(result.encryptedKeyData);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return bytes.buffer;
}

// Retrieve key by identifier
export async function retrieveKeyByIdentifier(keyIdentifier: string): Promise<ArrayBuffer> {
	const response = await fetch(`/api/encryption/keys?identifier=${encodeURIComponent(keyIdentifier)}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve encryption key by identifier');
	}

	const result: KeyRetrievalResponse = await response.json();

	const binaryString = atob(result.encryptedKeyData);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return bytes.buffer;
}

// Rotate encryption key (create new key, mark old as inactive)
export async function rotateKey(
	oldKeyId: string,
	newKeyData: ArrayBuffer,
	newKeyIdentifier: string
): Promise<string> {
	const newKeyBytes = new Uint8Array(newKeyData);
	const base64NewKey = btoa(String.fromCharCode(...newKeyBytes));

	const response = await fetch('/api/encryption/keys/rotate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include', // Include cookies for authentication
		body: JSON.stringify({
			oldKeyId,
			newKeyIdentifier,
			newEncryptedKeyData: base64NewKey,
			newKeyAlgorithm: 'AES-GCM-256'
		})
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to rotate encryption key');
	}

	const result = await response.json();
	return result.newKeyId;
}

// List user's encryption keys
export async function listUserKeys(): Promise<KeyRetrievalResponse[]> {
	const response = await fetch('/api/encryption/keys', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to list encryption keys');
	}

	return await response.json();
}

// Delete encryption key (only if no documents use it)
export async function deleteKey(keyId: string): Promise<void> {
	const response = await fetch(`/api/encryption/keys/${keyId}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to delete encryption key');
	}
}
