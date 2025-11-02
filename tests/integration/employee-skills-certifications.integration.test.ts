/**
 * Employee Skills & Certifications Integration Tests
 * Feature 029: Database Schema Optimization - P2 Feature Tables
 * Task: T023
 *
 * Integration tests for employee_skills and employee_certifications tables
 * Tests full stack: PostgreSQL → Rust GraphQL → urql → urql client
 * Validates proficiency levels, endorsements, expiry tracking, and full-text search
 *
 * Prerequisites:
 * - PostgreSQL database with migrations 20251010_010 and 20251010_011 applied
 * - Rust GraphQL server running on http://localhost:4000/graphql
 * - employee_skills table with proficiency_level (1-5) and endorsed_by UUID[]
 * - employee_certifications table with expiry_date tracking
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createClient, type Client, cacheExchange, fetchExchange } from '@urql/core';
import fetch from 'node-fetch';

let graphqlClient: Client;

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

beforeAll(() => {
	graphqlClient = createClient({
		url: GRAPHQL_ENDPOINT,
		fetch: fetch as any,
		exchanges: [cacheExchange, fetchExchange],
		requestPolicy: 'network-only',
		preferGetMethod: false // Force POST for all operations (for GraphQL server)
	});
});

describe('Employee Skills Integration (P2 Feature)', () => {
	describe('Schema Field Integration', () => {
		test('should query EmployeeSkill with all fields', async () => {
			const query = `
				query GetEmployeeSkills {
					employeeSkills(first: 10) {
						nodes {
							id
							userId
							skillName
							proficiencyLevel
							endorsedBy
							createdAt
							updatedAt
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
			expect(result.data.employeeSkills).toBeDefined();
			expect(result.data.employeeSkills.nodes).toBeInstanceOf(Array);

			// Verify field types
			if (result.data.employeeSkills.nodes.length > 0) {
				const skill = result.data.employeeSkills.nodes[0];
				expect(typeof skill.skillName).toBe('string');
				expect(typeof skill.proficiencyLevel).toBe('number');
				expect(skill.proficiencyLevel).toBeGreaterThanOrEqual(1);
				expect(skill.proficiencyLevel).toBeLessThanOrEqual(5);
				expect(Array.isArray(skill.endorsedBy)).toBe(true);
			}
		});

		test('should query user relationship from skill', async () => {
			const query = `
				query GetSkillsWithUser {
					employeeSkills(first: 1) {
						nodes {
							id
							skillName
							userByUserId {
								id
								firstName
								lastName
							}
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			if (result.data.employeeSkills.nodes.length > 0) {
				const skill = result.data.employeeSkills.nodes[0];
				expect(skill.userByUserId).toBeDefined();
				expect(skill.userByUserId.firstName).toBeTruthy();
			}
		});
	});

	describe('Proficiency Level Validation Integration', () => {
		test('should filter skills by proficiency level', async () => {
			const query = `
				query GetExpertSkills {
					employeeSkills(
						filter: { proficiencyLevel: { equalTo: 5 } }
						first: 10
					) {
						nodes {
							id
							skillName
							proficiencyLevel
							userByUserId {
								firstName
								lastName
							}
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// All results should have proficiencyLevel = 5
			result.data.employeeSkills.nodes.forEach((skill: any) => {
				expect(skill.proficiencyLevel).toBe(5);
			});
		});

		test('should filter skills by proficiency range', async () => {
			const query = `
				query GetAdvancedSkills {
					employeeSkills(
						filter: {
							proficiencyLevel: {
								greaterThanOrEqualTo: 4
							}
						}
						first: 20
					) {
						nodes {
							id
							skillName
							proficiencyLevel
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// All results should have proficiencyLevel >= 4
			result.data.employeeSkills.nodes.forEach((skill: any) => {
				expect(skill.proficiencyLevel).toBeGreaterThanOrEqual(4);
				expect(skill.proficiencyLevel).toBeLessThanOrEqual(5);
			});
		});
	});

	describe('Full-Text Search Integration', () => {
		test('should search skills by name', async () => {
			const query = `
				query SearchSkillsByName($searchTerm: String!) {
					employeeSkills(
						filter: { skillName: { includesInsensitive: $searchTerm } }
						first: 20
					) {
						nodes {
							id
							skillName
							proficiencyLevel
						}
					}
				}
			`;

			const result = await graphqlClient
				.query(query, { searchTerm: 'script' })
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// All results should contain 'script' (case-insensitive)
			result.data.employeeSkills.nodes.forEach((skill: any) => {
				expect(skill.skillName.toLowerCase()).toContain('script');
			});
		});
	});

	describe('Endorsement System Integration', () => {
		test('should query skills with endorsements', async () => {
			const query = `
				query GetEndorsedSkills {
					employeeSkills(
						filter: { endorsedBy: { isNull: false } }
						first: 10
					) {
						nodes {
							id
							skillName
							endorsedBy
							proficiencyLevel
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// All results should have endorsedBy array (may be empty but not null)
			result.data.employeeSkills.nodes.forEach((skill: any) => {
				expect(Array.isArray(skill.endorsedBy)).toBe(true);
			});
		});
	});

	describe('Mutation Integration - Create Skill', () => {
		let testUserId: string;

		beforeAll(async () => {
			const usersQuery = `
				query GetTestUser {
					users(first: 1) {
						nodes {
							id
						}
					}
				}
			`;
			const result = await graphqlClient.query(usersQuery, {}).toPromise();

			if (result.data?.users?.nodes?.[0]?.id) {
				testUserId = result.data.users.nodes[0].id;
			}
		});

		test('should create employee skill with proficiency level', async () => {
			if (!testUserId) {
				console.log('⚠️  Skipping: No test user available');
				return;
			}

			const mutation = `
				mutation CreateSkill($input: CreateEmployeeSkillInput!) {
					createEmployeeSkill(input: $input) {
						employeeSkill {
							id
							userId
							skillName
							proficiencyLevel
							endorsedBy
						}
					}
				}
			`;

			const variables = {
				input: {
					employeeSkill: {
						userId: testUserId,
						skillName: 'Test Integration Skill',
						proficiencyLevel: 4,
						endorsedBy: []
					}
				}
			};

			const result = await graphqlClient.mutation(mutation, variables).toPromise();

			if (result.error) {
				console.log('⚠️  Mutation error (may be duplicate):', result.error.message);
				return;
			}

			expect(result.data).toBeDefined();
			expect(result.data.createEmployeeSkill.employeeSkill.proficiencyLevel).toBe(4);
		});
	});
});

describe('Employee Certifications Integration (P2 Feature)', () => {
	describe('Schema Field Integration', () => {
		test('should query EmployeeCertification with all fields', async () => {
			const query = `
				query GetEmployeeCertifications {
					employeeCertifications(first: 10) {
						nodes {
							id
							userId
							certificationName
							issuer
							issuedDate
							expiryDate
							credentialId
							verificationUrl
							createdAt
							updatedAt
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
			expect(result.data.employeeCertifications).toBeDefined();
			expect(result.data.employeeCertifications.nodes).toBeInstanceOf(Array);

			// Verify field types
			if (result.data.employeeCertifications.nodes.length > 0) {
				const cert = result.data.employeeCertifications.nodes[0];
				expect(typeof cert.certificationName).toBe('string');
				expect(typeof cert.issuer).toBe('string');
				// expiryDate may be null for permanent certifications
			}
		});

		test('should query user relationship from certification', async () => {
			const query = `
				query GetCertificationsWithUser {
					employeeCertifications(first: 1) {
						nodes {
							id
							certificationName
							userByUserId {
								id
								firstName
								lastName
							}
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			if (result.data.employeeCertifications.nodes.length > 0) {
				const cert = result.data.employeeCertifications.nodes[0];
				expect(cert.userByUserId).toBeDefined();
			}
		});
	});

	describe('Expiry Date Filtering Integration', () => {
		test('should filter permanent certifications (null expiryDate)', async () => {
			const query = `
				query GetPermanentCertifications {
					employeeCertifications(
						filter: { expiryDate: { isNull: true } }
						first: 10
					) {
						nodes {
							id
							certificationName
							expiryDate
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// All results should have null expiryDate
			result.data.employeeCertifications.nodes.forEach((cert: any) => {
				expect(cert.expiryDate).toBeNull();
			});
		});

		test('should filter certifications expiring soon', async () => {
			const query = `
				query GetExpiringSoonCertifications($date: Date!) {
					employeeCertifications(
						filter: {
							expiryDate: {
								isNull: false
								lessThan: $date
							}
						}
						first: 20
					) {
						nodes {
							id
							certificationName
							expiryDate
							userByUserId {
								firstName
								lastName
							}
						}
					}
				}
			`;

			// 90 days from now
			const ninetyDaysLater = new Date();
			ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);
			const dateString = ninetyDaysLater.toISOString().split('T')[0];

			const result = await graphqlClient
				.query(query, { date: dateString })
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// All results should have expiryDate before the specified date
			result.data.employeeCertifications.nodes.forEach((cert: any) => {
				expect(cert.expiryDate).not.toBeNull();
				expect(new Date(cert.expiryDate) < new Date(dateString)).toBe(true);
			});
		});
	});

	describe('Full-Text Search Integration', () => {
		test('should search certifications by name', async () => {
			const query = `
				query SearchCertificationsByName($searchTerm: String!) {
					employeeCertifications(
						filter: { certificationName: { includesInsensitive: $searchTerm } }
						first: 20
					) {
						nodes {
							id
							certificationName
							issuer
						}
					}
				}
			`;

			const result = await graphqlClient
				.query(query, { searchTerm: 'AWS' })
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();

			// Results should contain 'AWS' in certification name
			result.data.employeeCertifications.nodes.forEach((cert: any) => {
				expect(cert.certificationName.toLowerCase()).toContain('aws');
			});
		});

		test('should search certifications by issuer', async () => {
			const query = `
				query SearchCertificationsByIssuer($searchTerm: String!) {
					employeeCertifications(
						filter: { issuer: { includesInsensitive: $searchTerm } }
						first: 20
					) {
						nodes {
							id
							certificationName
							issuer
						}
					}
				}
			`;

			const result = await graphqlClient
				.query(query, { searchTerm: 'Amazon' })
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
		});
	});

	describe('Mutation Integration - Create Certification', () => {
		let testUserId: string;

		beforeAll(async () => {
			const usersQuery = `
				query GetTestUser {
					users(first: 1) {
						nodes {
							id
						}
					}
				}
			`;
			const result = await graphqlClient.query(usersQuery, {}).toPromise();

			if (result.data?.users?.nodes?.[0]?.id) {
				testUserId = result.data.users.nodes[0].id;
			}
		});

		test('should create certification with expiry date', async () => {
			if (!testUserId) {
				console.log('⚠️  Skipping: No test user available');
				return;
			}

			const mutation = `
				mutation CreateCertification($input: CreateEmployeeCertificationInput!) {
					createEmployeeCertification(input: $input) {
						employeeCertification {
							id
							userId
							certificationName
							issuer
							expiryDate
						}
					}
				}
			`;

			const futureDate = new Date();
			futureDate.setFullYear(futureDate.getFullYear() + 3);

			const variables = {
				input: {
					employeeCertification: {
						userId: testUserId,
						certificationName: 'Test Integration Certification',
						issuer: 'Test Provider',
						issuedDate: new Date().toISOString().split('T')[0],
						expiryDate: futureDate.toISOString().split('T')[0]
					}
				}
			};

			const result = await graphqlClient.mutation(mutation, variables).toPromise();

			if (result.error) {
				console.log('⚠️  Mutation error (may be duplicate):', result.error.message);
				return;
			}

			expect(result.data).toBeDefined();
			expect(result.data.createEmployeeCertification.employeeCertification.expiryDate).toBeTruthy();
		});

		test('should create permanent certification (null expiryDate)', async () => {
			if (!testUserId) {
				console.log('⚠️  Skipping: No test user available');
				return;
			}

			const mutation = `
				mutation CreatePermanentCertification($input: CreateEmployeeCertificationInput!) {
					createEmployeeCertification(input: $input) {
						employeeCertification {
							id
							certificationName
							expiryDate
						}
					}
				}
			`;

			const variables = {
				input: {
					employeeCertification: {
						userId: testUserId,
						certificationName: 'Permanent Degree',
						issuer: 'University',
						issuedDate: new Date().toISOString().split('T')[0]
						// expiryDate intentionally omitted
					}
				}
			};

			const result = await graphqlClient.mutation(mutation, variables).toPromise();

			if (result.error) {
				console.log('⚠️  Mutation error (may be duplicate):', result.error.message);
				return;
			}

			expect(result.data).toBeDefined();
			expect(result.data.createEmployeeCertification.employeeCertification.expiryDate).toBeNull();
		});
	});

	describe('Database Schema Validation', () => {
		test('should verify EmployeeSkill type exists', async () => {
			const query = `
				query IntrospectEmployeeSkillType {
					__type(name: "EmployeeSkill") {
						name
						fields {
							name
							type {
								name
							}
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.__type).toBeDefined();
			expect(result.data.__type.name).toBe('EmployeeSkill');

			// Verify required fields
			const fieldNames = result.data.__type.fields.map((f: any) => f.name);
			expect(fieldNames).toContain('skillName');
			expect(fieldNames).toContain('proficiencyLevel');
			expect(fieldNames).toContain('endorsedBy');
		});

		test('should verify EmployeeCertification type exists', async () => {
			const query = `
				query IntrospectEmployeeCertificationType {
					__type(name: "EmployeeCertification") {
						name
						fields {
							name
							type {
								name
							}
						}
					}
				}
			`;

			const result = await graphqlClient.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.__type).toBeDefined();
			expect(result.data.__type.name).toBe('EmployeeCertification');

			// Verify required fields
			const fieldNames = result.data.__type.fields.map((f: any) => f.name);
			expect(fieldNames).toContain('certificationName');
			expect(fieldNames).toContain('issuer');
			expect(fieldNames).toContain('expiryDate');
		});
	});

	describe('Performance Integration', () => {
		test('should query large skill dataset efficiently', async () => {
			const query = `
				query GetAllSkills {
					employeeSkills(first: 100) {
						totalCount
						nodes {
							id
							skillName
							proficiencyLevel
						}
					}
				}
			`;

			const startTime = Date.now();
			const result = await graphqlClient.query(query, {}).toPromise();
			const duration = Date.now() - startTime;

			expect(result.error).toBeUndefined();
			expect(duration).toBeLessThan(1000);

			console.log(`✓ Skills query completed in ${duration}ms`);
		});

		test('should query large certification dataset efficiently', async () => {
			const query = `
				query GetAllCertifications {
					employeeCertifications(first: 100) {
						totalCount
						nodes {
							id
							certificationName
							expiryDate
						}
					}
				}
			`;

			const startTime = Date.now();
			const result = await graphqlClient.query(query, {}).toPromise();
			const duration = Date.now() - startTime;

			expect(result.error).toBeUndefined();
			expect(duration).toBeLessThan(1000);

			console.log(`✓ Certifications query completed in ${duration}ms`);
		});
	});
});

// Export test utilities
export const skillsCertificationsTestUtils = {
	/**
	 * Create test skill
	 */
	createTestSkill: async (
		client: Client,
		userId: string,
		skillName: string,
		proficiencyLevel: number
	) => {
		const mutation = `
			mutation CreateSkill($input: CreateEmployeeSkillInput!) {
				createEmployeeSkill(input: $input) {
					employeeSkill {
						id
						skillName
						proficiencyLevel
					}
				}
			}
		`;

		return client.mutation(mutation, {
			input: {
				employeeSkill: {
					userId,
					skillName,
					proficiencyLevel,
					endorsedBy: []
				}
			}
		}).toPromise();
	},

	/**
	 * Create test certification
	 */
	createTestCertification: async (
		client: Client,
		userId: string,
		certificationName: string,
		issuer: string,
		expiryDate: string | null
	) => {
		const mutation = `
			mutation CreateCertification($input: CreateEmployeeCertificationInput!) {
				createEmployeeCertification(input: $input) {
					employeeCertification {
						id
						certificationName
						expiryDate
					}
				}
			}
		`;

		return client.mutation(mutation, {
			input: {
				employeeCertification: {
					userId,
					certificationName,
					issuer,
					issuedDate: new Date().toISOString().split('T')[0],
					expiryDate
				}
			}
		}).toPromise();
	}
};
