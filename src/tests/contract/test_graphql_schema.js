/**
 * GraphQL Schema Contract Tests
 *
 * These tests validate that PostGraphile generates the expected GraphQL schema
 * from our PostgreSQL database structure. They ensure schema compatibility
 * and proper field exposure before frontend integration.
 */

const { Client } = require('pg');
const { expect } = require('chai');

describe('GraphQL Schema Contract Tests', function () {
	let dbClient;

	before(async function () {
		this.timeout(10000);

		// Connect to test database
		dbClient = new Client({
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || 5432,
			database: process.env.DB_NAME || 'hr_system',
			user: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || 'postgres123'
		});

		await dbClient.connect();
	});

	after(async function () {
		if (dbClient) {
			await dbClient.end();
		}
	});

	describe('Database Schema Structure', function () {
		it('should have all required schemas', async function () {
			const result = await dbClient.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('hr_public', 'hr_private', 'hr_hidden')
        ORDER BY schema_name
      `);

			const schemas = result.rows.map((row) => row.schema_name);
			expect(schemas).to.deep.equal(['hr_hidden', 'hr_private', 'hr_public']);
		});

		it('should have all required tables in hr_public schema', async function () {
			const result = await dbClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'hr_public' 
        ORDER BY table_name
      `);

			const tables = result.rows.map((row) => row.table_name);
			expect(tables).to.include.members([
				'departments',
				'employees',
				'time_off_requests',
				'performance_reviews'
			]);
		});

		it('should have required composite types', async function () {
			const result = await dbClient.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'hr_public')
        AND typtype = 'c'
        ORDER BY typname
      `);

			const types = result.rows.map((row) => row.typname);
			expect(types).to.include.members(['jwt_token', 'auth_result']);
		});

		it('should have required enum types', async function () {
			const result = await dbClient.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'hr_public')
        AND typtype = 'e'
        ORDER BY typname
      `);

			const enums = result.rows.map((row) => row.typname);
			expect(enums).to.include.members([
				'employee_status',
				'time_off_type',
				'request_status',
				'review_status'
			]);
		});
	});

	describe('Authentication Functions', function () {
		it('should expose authenticate function', async function () {
			const result = await dbClient.query(`
        SELECT routine_name, data_type
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name = 'authenticate'
      `);

			expect(result.rows).to.have.length(1);
			expect(result.rows[0].data_type).to.equal('USER-DEFINED');
		});

		it('should expose refresh_token function', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name = 'refresh_token'
      `);

			expect(result.rows).to.have.length(1);
		});

		it('should expose logout function', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name = 'logout'
      `);

			expect(result.rows).to.have.length(1);
		});

		it('should expose change_password function', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name = 'change_password'
      `);

			expect(result.rows).to.have.length(1);
		});
	});

	describe('Business Logic Functions', function () {
		it('should expose employee management functions', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name IN (
          'create_employee',
          'terminate_employee', 
          'update_employee_role'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(3);
			const functions = result.rows.map((row) => row.routine_name);
			expect(functions).to.deep.equal([
				'create_employee',
				'terminate_employee',
				'update_employee_role'
			]);
		});

		it('should expose time-off management functions', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name IN (
          'request_time_off',
          'process_time_off_request'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(2);
		});

		it('should expose performance review functions', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name IN (
          'create_performance_review',
          'update_performance_review'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(2);
		});

		it('should expose department management functions', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name = 'create_department'
      `);

			expect(result.rows).to.have.length(1);
		});
	});

	describe('Computed Fields', function () {
		it('should have employee computed fields', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name LIKE 'employee_%'
        AND routine_name IN (
          'employee_full_name',
          'employee_direct_reports',
          'employee_department_path',
          'employee_tenure_days',
          'employee_can_manage'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(5);
		});

		it('should have department computed fields', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name LIKE 'department_%'
        AND routine_name IN (
          'department_employee_count',
          'department_path',
          'department_subdepartments'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(3);
		});

		it('should have time-off request computed fields', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name LIKE 'time_off_request_%'
        AND routine_name IN (
          'time_off_request_can_approve',
          'time_off_request_can_modify'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(2);
		});

		it('should have performance review computed fields', async function () {
			const result = await dbClient.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'hr_public'
        AND routine_name LIKE 'performance_review_%'
        AND routine_name IN (
          'performance_review_can_view',
          'performance_review_can_edit'
        )
        ORDER BY routine_name
      `);

			expect(result.rows).to.have.length(2);
		});
	});

	describe('Row Level Security', function () {
		it('should have RLS enabled on all public tables', async function () {
			const result = await dbClient.query(`
        SELECT tablename, rowsecurity
        FROM pg_tables pt
        JOIN pg_class pc ON pc.relname = pt.tablename
        WHERE pt.schemaname = 'hr_public'
        AND pt.tablename IN ('departments', 'employees', 'time_off_requests', 'performance_reviews')
        ORDER BY tablename
      `);

			expect(result.rows).to.have.length(4);
			result.rows.forEach((row) => {
				expect(row.rowsecurity).to.be.true;
			});
		});

		it('should have policies defined for each table', async function () {
			const result = await dbClient.query(`
        SELECT schemaname, tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'hr_public'
        ORDER BY tablename, policyname
      `);

			expect(result.rows.length).to.be.greaterThan(10);

			// Check that each table has at least one policy
			const tablesPolicies = result.rows.reduce((acc, row) => {
				acc[row.tablename] = (acc[row.tablename] || 0) + 1;
				return acc;
			}, {});

			expect(tablesPolicies.departments).to.be.greaterThan(0);
			expect(tablesPolicies.employees).to.be.greaterThan(0);
			expect(tablesPolicies.time_off_requests).to.be.greaterThan(0);
			expect(tablesPolicies.performance_reviews).to.be.greaterThan(0);
		});
	});

	describe('Database Roles', function () {
		it('should have all required PostgreSQL roles', async function () {
			const result = await dbClient.query(`
        SELECT rolname
        FROM pg_roles
        WHERE rolname LIKE 'hr_%'
        OR rolname = 'postgraphile_app'
        ORDER BY rolname
      `);

			const roles = result.rows.map((row) => row.rolname);
			expect(roles).to.include.members([
				'hr_guest',
				'hr_employee',
				'hr_manager',
				'hr_admin',
				'hr_super_admin',
				'postgraphile_app'
			]);
		});

		it('should have proper role hierarchy', async function () {
			// Test that roles inherit from each other
			const result = await dbClient.query(`
        SELECT 
          r.rolname as role,
          m.rolname as member_of
        FROM pg_roles r
        JOIN pg_auth_members am ON r.oid = am.member
        JOIN pg_roles m ON am.roleid = m.oid
        WHERE r.rolname LIKE 'hr_%'
        ORDER BY r.rolname, m.rolname
      `);

			// Verify inheritance chain exists
			const inheritance = result.rows.reduce((acc, row) => {
				if (!acc[row.role]) acc[row.role] = [];
				acc[row.role].push(row.member_of);
				return acc;
			}, {});

			expect(inheritance.hr_employee).to.include('hr_guest');
			expect(inheritance.hr_manager).to.include('hr_employee');
			expect(inheritance.hr_admin).to.include('hr_manager');
			expect(inheritance.hr_super_admin).to.include('hr_admin');
		});
	});

	describe('Function Permissions', function () {
		it('should grant authentication functions to hr_guest', async function () {
			const result = await dbClient.query(`
        SELECT has_function_privilege('hr_guest', 'hr_public.authenticate(text, text)', 'EXECUTE') as can_execute
      `);

			expect(result.rows[0].can_execute).to.be.true;
		});

		it('should grant employee functions to hr_employee', async function () {
			const result = await dbClient.query(`
        SELECT has_function_privilege('hr_employee', 'hr_public.logout()', 'EXECUTE') as can_execute
      `);

			expect(result.rows[0].can_execute).to.be.true;
		});

		it('should grant manager functions to hr_manager', async function () {
			const result = await dbClient.query(`
        SELECT has_function_privilege('hr_manager', 'hr_public.process_time_off_request(integer, text, text)', 'EXECUTE') as can_execute
      `);

			expect(result.rows[0].can_execute).to.be.true;
		});

		it('should grant admin functions to hr_admin', async function () {
			const result = await dbClient.query(`
        SELECT has_function_privilege('hr_admin', 'hr_public.create_employee(text, text, text, integer, integer, date, integer, text)', 'EXECUTE') as can_execute
      `);

			expect(result.rows[0].can_execute).to.be.true;
		});
	});

	describe('Data Integrity', function () {
		it('should have proper foreign key constraints', async function () {
			const result = await dbClient.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'hr_public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

			expect(result.rows.length).to.be.greaterThan(5);

			// Verify key relationships exist
			const fkeys = result.rows.map((row) => ({
				table: row.table_name,
				column: row.column_name,
				ref_table: row.foreign_table_name,
				ref_column: row.foreign_column_name
			}));

			// Employee -> Department
			expect(
				fkeys.some(
					(fk) =>
						fk.table === 'employees' &&
						fk.column === 'department_id' &&
						fk.ref_table === 'departments'
				)
			).to.be.true;

			// Employee -> Employee (manager)
			expect(
				fkeys.some(
					(fk) =>
						fk.table === 'employees' && fk.column === 'manager_id' && fk.ref_table === 'employees'
				)
			).to.be.true;
		});

		it('should have proper check constraints', async function () {
			const result = await dbClient.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'hr_public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

			expect(result.rows.length).to.be.greaterThan(10);

			// Verify important constraints exist
			const constraints = result.rows.map((row) => ({
				table: row.table_name,
				name: row.constraint_name
			}));

			expect(
				constraints.some((c) => c.table === 'time_off_requests' && c.name.includes('dates_valid'))
			).to.be.true;

			expect(
				constraints.some(
					(c) => c.table === 'performance_reviews' && c.name.includes('rating_valid')
				)
			).to.be.true;
		});
	});

	describe('Performance Indexes', function () {
		it('should have strategic indexes on key columns', async function () {
			const result = await dbClient.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'hr_public'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname
      `);

			expect(result.rows.length).to.be.greaterThan(15);

			const indexes = result.rows.map((row) => ({
				table: row.tablename,
				index: row.indexname,
				definition: row.indexdef
			}));

			// Verify key indexes exist
			expect(
				indexes.some((idx) => idx.table === 'employees' && idx.definition.includes('department_id'))
			).to.be.true;

			expect(
				indexes.some(
					(idx) => idx.table === 'time_off_requests' && idx.definition.includes('employee_id')
				)
			).to.be.true;
		});

		it('should have unique constraints where needed', async function () {
			const result = await dbClient.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'hr_public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

			expect(result.rows.length).to.be.greaterThan(2);

			// Verify email uniqueness
			expect(
				result.rows.some((row) => row.table_name === 'employees' && row.column_name === 'email')
			).to.be.true;
		});
	});
});
