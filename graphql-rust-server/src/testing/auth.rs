//! Test Authentication Helpers
//!
//! Provides JWT-compatible test users for integration tests.
//! Creates real DB records (users + role assignments) without generating
//! JWT tokens — the GraphQL test context injects UserContext directly.

use sea_orm::DatabaseBackend;
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement};
use uuid::Uuid;

use super::errors::TestContextError;

/// Test user roles matching seeded DB roles
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TestUserRole {
    Employee,
    Manager,
    HrManager,
    Admin,
    SystemAdmin,
}

/// A single test user with DB-backed identity
#[derive(Debug, Clone)]
pub struct TestUser {
    pub id: Uuid,
    pub email: String,
    /// Role name as stored in hr_public.roles (e.g., "Employee", "HR Manager", "Admin")
    pub role: String,
}

/// Pre-created test users for all roles
#[derive(Debug, Clone)]
pub struct TestUsers {
    pub employee: TestUser,
    pub manager: TestUser,
    pub hr_manager: TestUser,
    pub admin: TestUser,
    pub system_admin: TestUser,
}

impl TestUsers {
    /// Creates one user record per role in the test database.
    ///
    /// Uses a dummy bcrypt hash (bcrypt of "test-password").
    /// Assigns roles via user_role_assignments table.
    /// No JWT tokens are generated — UserContext is injected directly in tests.
    pub async fn create_all(db: &DatabaseConnection) -> Result<Self, TestContextError> {
        // Generate unique IDs for each test user
        let employee_id = Uuid::new_v4();
        let manager_id = Uuid::new_v4();
        let hr_manager_id = Uuid::new_v4();
        let admin_id = Uuid::new_v4();
        let system_admin_id = Uuid::new_v4();

        // Dummy bcrypt hash for "test-password" (cost factor 4 for speed)
        let password_hash = "$2b$04$ZaO7JPlU9JIxm2R6gPNuSeI0gEFE2.vb6Rf72qFP.nRyqe4FmUJnC";

        // Insert all 5 test users
        // NOTE: display_name and full_name are GENERATED columns — do NOT include in INSERT
        let insert_users_sql = format!(
            "INSERT INTO hr_public.users \
             (id, email, password_hash, first_name, last_name, \
              social_media_release, is_active, failed_login_attempts, \
              force_password_change, theme_preference, last_modified_at, \
              sync_status, bonus_eligible, created_at, updated_at, tokens_valid_after) \
             VALUES \
             ('{employee_id}', 'test.employee@example.com', '{pw}', 'Test', 'Employee', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{manager_id}', 'test.manager@example.com', '{pw}', 'Test', 'Manager', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{hr_manager_id}', 'test.hrmanager@example.com', '{pw}', 'Test', 'HrManager', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{admin_id}', 'test.admin@example.com', '{pw}', 'Test', 'Admin', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()), \
             ('{system_admin_id}', 'test.sysadmin@example.com', '{pw}', 'Test', 'SysAdmin', false, true, 0, false, 'system', NOW(), 'synced', false, NOW(), NOW(), NOW()) \
             ON CONFLICT (email) DO NOTHING",
            employee_id = employee_id,
            manager_id = manager_id,
            hr_manager_id = hr_manager_id,
            admin_id = admin_id,
            system_admin_id = system_admin_id,
            pw = password_hash,
        );

        db.execute(Statement::from_string(
            DatabaseBackend::Postgres,
            insert_users_sql,
        ))
        .await
        .map_err(|e| {
            TestContextError::SessionError(format!("Failed to insert test users: {}", e))
        })?;

        // Assign roles via user_role_assignments (look up role IDs by name from seeded roles)
        // Roles are seeded by migration: Employee(25), Manager(50), HR Manager(75), Admin(100)
        // SystemAdmin also uses the "Admin" role
        let assign_roles_sql = format!(
            "INSERT INTO hr_public.user_role_assignments (id, user_id, role_id, created_at, updated_at) \
             SELECT gen_random_uuid(), u.user_id, r.id, NOW(), NOW() \
             FROM (VALUES \
               ('{employee_id}'::uuid, 'Employee'), \
               ('{manager_id}'::uuid, 'Manager'), \
               ('{hr_manager_id}'::uuid, 'HR Manager'), \
               ('{admin_id}'::uuid, 'Admin'), \
               ('{system_admin_id}'::uuid, 'Admin') \
             ) AS u(user_id, role_name) \
             JOIN hr_public.roles r ON r.name = u.role_name \
             ON CONFLICT DO NOTHING",
            employee_id = employee_id,
            manager_id = manager_id,
            hr_manager_id = hr_manager_id,
            admin_id = admin_id,
            system_admin_id = system_admin_id,
        );

        db.execute(Statement::from_string(
            DatabaseBackend::Postgres,
            assign_roles_sql,
        ))
        .await
        .map_err(|e| TestContextError::SessionError(format!("Failed to assign roles: {}", e)))?;

        Ok(TestUsers {
            employee: TestUser {
                id: employee_id,
                email: "test.employee@example.com".to_string(),
                role: "Employee".to_string(),
            },
            manager: TestUser {
                id: manager_id,
                email: "test.manager@example.com".to_string(),
                role: "Manager".to_string(),
            },
            hr_manager: TestUser {
                id: hr_manager_id,
                email: "test.hrmanager@example.com".to_string(),
                role: "HR Manager".to_string(),
            },
            admin: TestUser {
                id: admin_id,
                email: "test.admin@example.com".to_string(),
                role: "Admin".to_string(),
            },
            system_admin: TestUser {
                id: system_admin_id,
                email: "test.sysadmin@example.com".to_string(),
                role: "Admin".to_string(), // SystemAdmin uses Admin role
            },
        })
    }
}
