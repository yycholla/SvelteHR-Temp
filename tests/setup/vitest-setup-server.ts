// Vitest Server-Side Setup for Node.js Environment
// Database mocking and server-side utilities
// Created: 2025-09-24

import { afterEach, beforeAll, beforeEach, vi } from 'vitest';
import './vitest-setup'; // Import base setup

// Node.js environment setup
beforeAll(() => {
	// Ensure we're in Node.js environment
	if (typeof window !== 'undefined') {
		throw new Error('Server-side tests should not run in browser environment');
	}

	// Mock global Node.js APIs if needed
	global.TextEncoder = global.TextEncoder || require('util').TextEncoder;
	global.TextDecoder = global.TextDecoder || require('util').TextDecoder;

	// Mock server-side dependencies
	mockServerDependencies();
});

beforeEach(() => {
	// Reset server-side mocks
	vi.clearAllMocks();
});

function mockServerDependencies() {
	// Mock database connection
	vi.mock('pg', () => ({
		Pool: vi.fn(() => ({
			query: vi.fn(),
			connect: vi.fn(),
			end: vi.fn()
		})),
		Client: vi.fn(() => ({
			query: vi.fn(),
			connect: vi.fn(),
			end: vi.fn()
		}))
	}));

	// Mock PostGraphile
	vi.mock('postgraphile', () => ({
		default: vi.fn(() => (req: any, res: any, next: any) => next())
	}));

	// Mock JWT
	vi.mock('jsonwebtoken', () => ({
		sign: vi.fn(() => 'mock-jwt-token'),
		verify: vi.fn(() => ({ id: '1', email: 'test@example.com' })),
		decode: vi.fn(() => ({ id: '1', email: 'test@example.com' }))
	}));

	// Mock bcrypt
	vi.mock('bcryptjs', () => ({
		hash: vi.fn(() => Promise.resolve('hashed-password')),
		compare: vi.fn(() => Promise.resolve(true)),
		genSalt: vi.fn(() => Promise.resolve('salt'))
	}));

	// Mock nanoid
	vi.mock('nanoid', () => ({
		nanoid: vi.fn(() => 'mock-nanoid')
	}));
}
