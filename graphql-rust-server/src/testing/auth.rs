//! Test Authentication Helpers
//!
//! Provides test users and authenticated sessions for different roles.
//! Adapted for session-based authentication using axum-login.

use bcrypt::{hash, DEFAULT_COST};
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set, EntityTrait, ColumnTrait, QueryFilter};
use uuid::Uuid;

use crate::auth::backend::AuthUser;
use crate::models::user;
use super::errors::TestContextError;

/// Pre-configured test user roles
#[derive(Debug, Clone, Copy)]
pub enum TestUserRole {
    /// Regular employee with basic permissions
    Employee,
    /// HR manager with HR-specific permissions
    HrManager,
    /// Admin with elevated permissions
    Admin,
    /// System admin with full permissions
    SystemAdmin,
}

impl TestUserRole {
    /// Get the role string for database storage
    pub fn as_str(&self) -> &'static str {
        match self {
            TestUserRole::Employee => "Employee",
            TestUserRole::HrManager => "HR Manager",
            TestUserRole::Admin => "Admin",
            TestUserRole::SystemAdmin => "Admin", // Use Admin role for system admin tests
        }
    }

    /// Get a test email for this role
    pub fn test_email(&self) -> String {
        // Use unique email per TestUserRole, not per database role name
        // This ensures Admin and SystemAdmin get different emails even if they share a role
        match self {
            TestUserRole::Employee => "test_employee@example.com".to_string(),
            TestUserRole::HrManager => "test_hr_manager@example.com".to_string(),
            TestUserRole::Admin => "test_admin@example.com".to_string(),
            TestUserRole::SystemAdmin => "test_system_admin@example.com".to_string(),
        }
    }

    /// Get test first name for this role
    pub fn first_name(&self) -> &'static str {
        match self {
            TestUserRole::Employee => "Test",
            TestUserRole::HrManager => "HR",
            TestUserRole::Admin => "Admin",
            TestUserRole::SystemAdmin => "System",
        }
    }

    /// Get test last name for this role
    pub fn last_name(&self) -> &'static str {
        match self {
            TestUserRole::Employee => "Employee",
            TestUserRole::HrManager => "Manager",
            TestUserRole::Admin => "User",
            TestUserRole::SystemAdmin => "Admin",
        }
    }
}

/// Test user with credentials and session information
#[derive(Debug, Clone)]
pub struct TestUser {
    /// Unique identifier
    pub id: Uuid,

    /// Email address
    pub email: String,

    /// User role
    pub role: String,

    /// Whether the user is active
    pub is_active: bool,

    /// Test password (for login tests)
    pub password: String,

    /// Display name (first_name + last_name)
    pub display_name: String,

    /// Department ID (optional)
    pub department_id: Option<Uuid>,

    /// When the user was created
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl TestUser {
    /// Create a new test user in the database
    ///
    /// # Arguments
    /// * `db` - Database connection
    /// * `role` - User role to create
    ///
    /// # Returns
    /// Result containing the created test user
    pub async fn create(
        db: &DatabaseConnection,
        role: TestUserRole,
    ) -> Result<Self, TestContextError> {
        Self::create_with_password(db, role, "test_password_123").await
    }

    /// Create a new test user with custom password
    pub async fn create_with_password(
        db: &DatabaseConnection,
        role: TestUserRole,
        password: &str,
    ) -> Result<Self, TestContextError> {
        let id = Uuid::new_v4();
        let email = role.test_email();
        let password_hash = hash(password, DEFAULT_COST)
            .map_err(|e| TestContextError::SessionError(format!("Password hashing failed: {}", e)))?;

        // Create user in database
        let user_model = user::ActiveModel {
            id: Set(id),
            email: Set(email.clone()),
            password_hash: Set(password_hash),
            first_name: Set(role.first_name().to_string()),
            last_name: Set(role.last_name().to_string()),
            is_active: Set(true),
            ..Default::default()
        };

        user_model.insert(db)
            .await
            .map_err(|e| TestContextError::DatabaseError(e.into()))?;

        // Assign RBAC role to user via user_role_assignments table
        use crate::models::role::{Entity as RoleEntity, Column as RoleColumn};
        use crate::models::user_role_assignment;

        let role_record = RoleEntity::find()
            .filter(RoleColumn::Name.eq(role.as_str()))
            .filter(RoleColumn::DeletedAt.is_null())
            .one(db)
            .await
            .map_err(|e| TestContextError::DatabaseError(e.into()))?
            .ok_or_else(|| TestContextError::SessionError(format!("Role '{}' not found", role.as_str())))?;

        let role_assignment = user_role_assignment::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(id),
            role_id: Set(role_record.id),
            ..Default::default()
        };

        role_assignment.insert(db)
            .await
            .map_err(|e| TestContextError::DatabaseError(e.into()))?;

        // Get the created user to retrieve created_at timestamp
        let created_user = user::Entity::find_by_id(id)
            .one(db)
            .await
            .map_err(|e| TestContextError::DatabaseError(e.into()))?
            .ok_or_else(|| TestContextError::SessionError("User not found after creation".to_string()))?;

        Ok(Self {
            id,
            email,
            role: role.as_str().to_string(),
            is_active: true,
            password: password.to_string(),
            display_name: format!("{} {}", role.first_name(), role.last_name()),
            department_id: None,
            created_at: created_user.created_at,
        })
    }

    /// Create an admin test user (convenience method)
    ///
    /// # Arguments
    /// * `test_db` - Test database instance
    ///
    /// # Returns
    /// Admin test user
    pub async fn admin(test_db: &super::TestDatabase) -> Self {
        Self::create(test_db.connection(), TestUserRole::Admin)
            .await
            .expect("Failed to create admin test user")
    }

    /// Create a test user without any role assignments
    ///
    /// # Arguments
    /// * `test_db` - Test database instance
    ///
    /// # Returns
    /// Test user with no roles
    pub async fn without_roles(test_db: &super::TestDatabase) -> Self {
        let id = Uuid::new_v4();
        let email = format!("no_roles_{}@example.com", id.as_simple());
        let password = "test_password_123";
        let password_hash = hash(password, DEFAULT_COST)
            .expect("Password hashing should succeed");

        // Create user without any role assignments
        let user_model = user::ActiveModel {
            id: Set(id),
            email: Set(email.clone()),
            password_hash: Set(password_hash),
            first_name: Set("No".to_string()),
            last_name: Set("Roles".to_string()),
            is_active: Set(true),
            ..Default::default()
        };

        user_model.insert(test_db.connection())
            .await
            .expect("Failed to insert user");

        // Get the created user to retrieve created_at timestamp
        let created_user = user::Entity::find_by_id(id)
            .one(test_db.connection())
            .await
            .expect("Failed to find user")
            .expect("User not found after creation");

        Self {
            id,
            email,
            role: String::new(),
            is_active: true,
            password: password.to_string(),
            display_name: "No Roles".to_string(),
            department_id: None,
            created_at: created_user.created_at,
        }
    }

    /// Convert to AuthUser for axum-login
    pub fn to_auth_user(&self) -> AuthUser {
        AuthUser {
            id: self.id,
            email: self.email.clone(),
            role: self.role.clone(),
            is_active: self.is_active,
            force_password_change: false,
            department_id: None, // TestUser doesn't store department_id
            organization_id: None,
        }
    }
}

/// Collection of test users for different roles
#[derive(Debug, Clone)]
pub struct TestUsers {
    /// Regular employee
    pub employee: TestUser,

    /// HR manager
    pub hr_manager: TestUser,

    /// Administrator
    pub admin: TestUser,

    /// System administrator
    pub system_admin: TestUser,
}

impl TestUsers {
    /// Create a full set of test users for all roles
    ///
    /// # Arguments
    /// * `db` - Database connection
    ///
    /// # Returns
    /// Result containing test users for all roles
    pub async fn create_all(db: &DatabaseConnection) -> Result<Self, TestContextError> {
        Ok(Self {
            employee: TestUser::create(db, TestUserRole::Employee).await?,
            hr_manager: TestUser::create(db, TestUserRole::HrManager).await?,
            admin: TestUser::create(db, TestUserRole::Admin).await?,
            system_admin: TestUser::create(db, TestUserRole::SystemAdmin).await?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TestDatabase;

    #[tokio::test]
    async fn test_create_test_user() {
        let db = TestDatabase::new().await.expect("Failed to create test database");

        let user = TestUser::create(db.connection(), TestUserRole::Employee)
            .await
            .expect("Failed to create test user");

        assert_eq!(user.role, "Employee");
        assert_eq!(user.email, "test_employee@example.com");
        assert!(user.is_active);
        assert_eq!(user.password, "test_password_123");
        assert_eq!(user.display_name, "Test Employee");
        assert!(user.department_id.is_none());
    }

    #[tokio::test]
    async fn test_create_all_test_users() {
        let db = TestDatabase::new().await.expect("Failed to create test database");

        let users = TestUsers::create_all(db.connection())
            .await
            .expect("Failed to create test users");

        assert_eq!(users.employee.role, "Employee");
        assert_eq!(users.hr_manager.role, "HR Manager");
        assert_eq!(users.admin.role, "Admin");
        assert_eq!(users.system_admin.role, "Admin"); // SystemAdmin uses Admin role
    }

    #[tokio::test]
    async fn test_user_to_auth_user() {
        let db = TestDatabase::new().await.expect("Failed to create test database");

        let test_user = TestUser::create(db.connection(), TestUserRole::Admin)
            .await
            .expect("Failed to create test user");

        let auth_user = test_user.to_auth_user();

        assert_eq!(auth_user.id, test_user.id);
        assert_eq!(auth_user.email, test_user.email);
        assert_eq!(auth_user.role, test_user.role);
        assert_eq!(auth_user.is_active, test_user.is_active);
    }
}
