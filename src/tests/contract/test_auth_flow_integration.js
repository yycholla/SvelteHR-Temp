/**
 * Authentication Flow Integration Contract Tests
 *
 * Tests the complete authentication workflow including login, token refresh,
 * logout, and password management. These tests validate that our PostgreSQL
 * SECURITY DEFINER functions work correctly with JWT tokens and role switching.
 */

const { Client } = require('pg');
const { expect } = require('chai');

describe('Authentication Flow Contract Tests', function () {
	let dbClient;
	let testUsers = {};

	before(async function () {
		this.timeout(15000);

		// Connect to test database
		dbClient = new Client({
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || 5432,
			database: process.env.DB_NAME || 'hr_system',
			user: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || 'postgres123'
		});

		await dbClient.connect();

		// Get test user credentials from seeded data
		const result = await dbClient.query(`
      SELECT 
        e.id,
        e.email,
        e.first_name,
        e.last_name,
        e.role_level,
        e.department_id
      FROM hr_public.employees e
      WHERE e.email IN (
        'admin@company.com',
        'jane.smith@company.com', 
        'john.doe@company.com',
        'alice.johnson@company.com'
      )
      ORDER BY e.role_level DESC
    `);

		result.rows.forEach((user) => {
			const roleMap = {
				100: 'super_admin',
				80: 'hr_admin',
				60: 'manager',
				20: 'employee'
			};
			testUsers[roleMap[user.role_level]] = {
				...user,
				// Default passwords from seed data
				password:
					user.role_level >= 80
						? user.role_level === 100
							? 'AdminPass123!'
							: 'HRPass123!'
						: user.role_level === 60
							? 'TechPass123!'
							: 'EmpPass123!'
			};
		});
	});

	after(async function () {
		if (dbClient) {
			await dbClient.end();
		}
	});

	describe('User Authentication', function () {
		it('should authenticate super admin with valid credentials', async function () {
			const user = testUsers.super_admin;

			const result = await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			expect(result.rows).to.have.length(1);
			const token = result.rows[0].token;

			// Verify JWT token structure
			expect(token).to.have.property('role');
			expect(token).to.have.property('exp');
			expect(token).to.have.property('employee_id');
			expect(token).to.have.property('role_level');
			expect(token).to.have.property('is_admin');
			expect(token).to.have.property('permissions');

			// Verify token contents
			expect(token.role).to.equal('hr_super_admin');
			expect(token.employee_id).to.equal(user.id);
			expect(token.role_level).to.equal(100);
			expect(token.is_admin).to.be.true;
			expect(token.permissions).to.be.an('array');
			expect(token.permissions).to.include('system_administration');
		});

		it('should authenticate HR admin with valid credentials', async function () {
			const user = testUsers.hr_admin;

			const result = await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			expect(result.rows).to.have.length(1);
			const token = result.rows[0].token;

			expect(token.role).to.equal('hr_admin');
			expect(token.employee_id).to.equal(user.id);
			expect(token.role_level).to.equal(80);
			expect(token.is_admin).to.be.true;
			expect(token.permissions).to.include('manage_employees');
		});

		it('should authenticate manager with valid credentials', async function () {
			const user = testUsers.manager;

			const result = await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			expect(result.rows).to.have.length(1);
			const token = result.rows[0].token;

			expect(token.role).to.equal('hr_manager');
			expect(token.employee_id).to.equal(user.id);
			expect(token.role_level).to.equal(60);
			expect(token.is_admin).to.be.false;
			expect(token.permissions).to.include('approve_timeoff');
		});

		it('should authenticate employee with valid credentials', async function () {
			const user = testUsers.employee;

			const result = await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			expect(result.rows).to.have.length(1);
			const token = result.rows[0].token;

			expect(token.role).to.equal('hr_employee');
			expect(token.employee_id).to.equal(user.id);
			expect(token.role_level).to.equal(20);
			expect(token.is_admin).to.be.false;
			expect(token.permissions).to.include('view_own_profile');
		});

		it('should reject authentication with invalid email', async function () {
			try {
				await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
					'nonexistent@company.com',
					'anypassword'
				]);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error.message).to.include('Invalid credentials');
			}
		});

		it('should reject authentication with invalid password', async function () {
			const user = testUsers.employee;

			try {
				await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
					user.email,
					'wrongpassword'
				]);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error.message).to.include('Invalid credentials');
			}
		});

		it('should handle account lockout after multiple failed attempts', async function () {
			const user = testUsers.employee;

			// Reset failed attempts first
			await dbClient.query(
				`
        UPDATE hr_private.employee_account 
        SET failed_attempts = 0, locked_until = NULL
        WHERE employee_id = $1
      `,
				[user.id]
			);

			// Make 5 failed attempts to trigger lockout
			for (let i = 0; i < 5; i++) {
				try {
					await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
						user.email,
						'wrongpassword'
					]);
				} catch (error) {
					// Expected to fail
				}
			}

			// Verify account is locked
			try {
				await dbClient.query(
					`SELECT hr_public.authenticate($1, $2) as token`,
					[user.email, user.password] // Even with correct password
				);
				expect.fail('Should have thrown an error for locked account');
			} catch (error) {
				expect(error.message).to.include('Account is temporarily locked');
			}

			// Reset for other tests
			await dbClient.query(
				`
        UPDATE hr_private.employee_account 
        SET failed_attempts = 0, locked_until = NULL
        WHERE employee_id = $1
      `,
				[user.id]
			);
		});
	});

	describe('Token Refresh', function () {
		let refreshToken;
		let originalToken;

		before(async function () {
			// Login to get a refresh token
			const user = testUsers.employee;
			const result = await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);
			originalToken = result.rows[0].token;

			// Generate refresh token
			const refreshResult = await dbClient.query(
				`SELECT hr_hidden.generate_refresh_token($1) as refresh_token`,
				[user.id]
			);
			refreshToken = refreshResult.rows[0].refresh_token;
		});

		it('should refresh token with valid refresh token', async function () {
			const result = await dbClient.query(`SELECT hr_public.refresh_token($1) as token`, [
				refreshToken
			]);

			expect(result.rows).to.have.length(1);
			const newToken = result.rows[0].token;

			// Verify new token structure
			expect(newToken).to.have.property('role');
			expect(newToken).to.have.property('exp');
			expect(newToken).to.have.property('employee_id');

			// Verify same user data but new expiration
			expect(newToken.employee_id).to.equal(originalToken.employee_id);
			expect(newToken.role).to.equal(originalToken.role);
			expect(newToken.role_level).to.equal(originalToken.role_level);
			expect(newToken.exp).to.be.greaterThan(originalToken.exp);
		});

		it('should reject refresh with invalid token', async function () {
			try {
				await dbClient.query(`SELECT hr_public.refresh_token($1) as token`, [
					'invalid-refresh-token'
				]);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error.message).to.include('Invalid or expired refresh token');
			}
		});
	});

	describe('Password Management', function () {
		it('should allow password change with valid current password', async function () {
			// Set up session context for employee
			const user = testUsers.employee;
			await dbClient.query(`SET jwt.claims.employee_id = '${user.id}'`);

			const result = await dbClient.query(`SELECT hr_public.change_password($1, $2) as success`, [
				user.password,
				'NewPassword123!'
			]);

			expect(result.rows[0].success).to.be.true;

			// Verify new password works
			const loginResult = await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				'NewPassword123!'
			]);

			expect(loginResult.rows).to.have.length(1);
			expect(loginResult.rows[0].token).to.have.property('employee_id');

			// Reset password for other tests
			await dbClient.query(`SELECT hr_public.change_password($1, $2) as success`, [
				'NewPassword123!',
				user.password
			]);
		});

		it('should reject password change with invalid current password', async function () {
			const user = testUsers.employee;
			await dbClient.query(`SET jwt.claims.employee_id = '${user.id}'`);

			try {
				await dbClient.query(`SELECT hr_public.change_password($1, $2) as success`, [
					'wrongpassword',
					'NewPassword123!'
				]);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error.message).to.include('Current password is incorrect');
			}
		});

		it('should reject password change with weak new password', async function () {
			const user = testUsers.employee;
			await dbClient.query(`SET jwt.claims.employee_id = '${user.id}'`);

			try {
				await dbClient.query(
					`SELECT hr_public.change_password($1, $2) as success`,
					[user.password, '123'] // Too short
				);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error.message).to.include('New password must be at least 8 characters');
			}
		});
	});

	describe('Logout Functionality', function () {
		it('should successfully logout and invalidate refresh token', async function () {
			// Set up session context
			const user = testUsers.employee;
			await dbClient.query(`SET jwt.claims.employee_id = '${user.id}'`);

			// Generate refresh token first
			await dbClient.query(`SELECT hr_hidden.generate_refresh_token($1) as refresh_token`, [
				user.id
			]);

			// Verify refresh token exists
			let tokenCheck = await dbClient.query(
				`
        SELECT refresh_token_hash, refresh_token_expires_at
        FROM hr_private.employee_account
        WHERE employee_id = $1
      `,
				[user.id]
			);

			expect(tokenCheck.rows[0].refresh_token_hash).to.not.be.null;

			// Logout
			const result = await dbClient.query(`SELECT hr_public.logout() as success`);
			expect(result.rows[0].success).to.be.true;

			// Verify refresh token is cleared
			tokenCheck = await dbClient.query(
				`
        SELECT refresh_token_hash, refresh_token_expires_at
        FROM hr_private.employee_account
        WHERE employee_id = $1
      `,
				[user.id]
			);

			expect(tokenCheck.rows[0].refresh_token_hash).to.be.null;
			expect(tokenCheck.rows[0].refresh_token_expires_at).to.be.null;
		});
	});

	describe('Authentication Logging', function () {
		it('should log successful login attempts', async function () {
			const user = testUsers.employee;

			// Clear any existing logs
			await dbClient.query(`DELETE FROM hr_private.auth_log WHERE email = $1`, [user.email]);

			// Perform login
			await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			// Check log entry
			const result = await dbClient.query(
				`
        SELECT event_type, success, employee_id
        FROM hr_private.auth_log
        WHERE email = $1 AND event_type = 'login'
        ORDER BY created_at DESC
        LIMIT 1
      `,
				[user.email]
			);

			expect(result.rows).to.have.length(1);
			expect(result.rows[0].event_type).to.equal('login');
			expect(result.rows[0].success).to.be.true;
			expect(result.rows[0].employee_id).to.equal(user.id);
		});

		it('should log failed login attempts', async function () {
			const user = testUsers.employee;

			// Clear any existing logs
			await dbClient.query(`DELETE FROM hr_private.auth_log WHERE email = $1`, [user.email]);

			// Perform failed login
			try {
				await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
					user.email,
					'wrongpassword'
				]);
			} catch (error) {
				// Expected to fail
			}

			// Check log entry
			const result = await dbClient.query(
				`
        SELECT event_type, success, failure_reason
        FROM hr_private.auth_log
        WHERE email = $1 AND event_type = 'failed_login'
        ORDER BY created_at DESC
        LIMIT 1
      `,
				[user.email]
			);

			expect(result.rows).to.have.length(1);
			expect(result.rows[0].event_type).to.equal('failed_login');
			expect(result.rows[0].success).to.be.false;
			expect(result.rows[0].failure_reason).to.equal('invalid_password');
		});

		it('should track failed login attempts per email', async function () {
			const testEmail = 'test.security@company.com';

			// Clear any existing logs
			await dbClient.query(`DELETE FROM hr_private.auth_log WHERE email = $1`, [testEmail]);

			// Make 3 failed attempts
			for (let i = 0; i < 3; i++) {
				try {
					await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
						testEmail,
						'wrongpassword'
					]);
				} catch (error) {
					// Expected to fail
				}
			}

			// Check failed attempt count
			const result = await dbClient.query(
				`SELECT hr_hidden.get_failed_login_attempts($1, $2) as attempt_count`,
				[testEmail, new Date(Date.now() - 3600000)] // 1 hour ago
			);

			expect(result.rows[0].attempt_count).to.equal(3);
		});
	});

	describe('Account Security Features', function () {
		it('should update last login timestamp on successful authentication', async function () {
			const user = testUsers.employee;

			// Get current last_login
			const beforeResult = await dbClient.query(
				`
        SELECT last_login
        FROM hr_private.employee_account
        WHERE employee_id = $1
      `,
				[user.id]
			);

			const lastLoginBefore = beforeResult.rows[0].last_login;

			// Wait a moment then login
			await new Promise((resolve) => setTimeout(resolve, 1000));

			await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			// Check last_login was updated
			const afterResult = await dbClient.query(
				`
        SELECT last_login
        FROM hr_private.employee_account
        WHERE employee_id = $1
      `,
				[user.id]
			);

			const lastLoginAfter = afterResult.rows[0].last_login;

			expect(new Date(lastLoginAfter)).to.be.greaterThan(new Date(lastLoginBefore));
		});

		it('should reset failed attempts counter on successful login', async function () {
			const user = testUsers.employee;

			// Make a failed attempt
			try {
				await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
					user.email,
					'wrongpassword'
				]);
			} catch (error) {
				// Expected to fail
			}

			// Verify failed attempts is incremented
			let accountResult = await dbClient.query(
				`
        SELECT failed_attempts
        FROM hr_private.employee_account
        WHERE employee_id = $1
      `,
				[user.id]
			);

			expect(accountResult.rows[0].failed_attempts).to.be.greaterThan(0);

			// Successful login
			await dbClient.query(`SELECT hr_public.authenticate($1, $2) as token`, [
				user.email,
				user.password
			]);

			// Verify failed attempts is reset
			accountResult = await dbClient.query(
				`
        SELECT failed_attempts
        FROM hr_private.employee_account
        WHERE employee_id = $1
      `,
				[user.id]
			);

			expect(accountResult.rows[0].failed_attempts).to.equal(0);
		});
	});
});
