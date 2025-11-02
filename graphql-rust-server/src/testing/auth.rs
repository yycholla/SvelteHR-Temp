//! Test Authentication Helpers
//!
//! Provides test users and authenticated sessions for different roles.
//! Adapted for session-based authentication using axum-login.

use bcrypt::{hash, DEFAULT_COST};
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
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
            TestUserRole::Employee => "hr_employee",
            TestUserRole::HrManager => "hr_manager",
            TestUserRole::Admin => "admin",
            TestUserRole::SystemAdmin => "system_admin",
        }
    }

    /// Get a test email for this role
    pub fn test_email(&self) -> String {
        format!("test_{}@example.com", self.as_str())
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
            role: Set(role.as_str().to_string()),
            is_active: Set(true),
            ..Default::default()
        };

        user_model.insert(db)
            .await
            .map_err(|e| TestContextError::DatabaseError(e.into()))?;

        Ok(Self {
            id,
            email,
            role: role.as_str().to_string(),
            is_active: true,
            password: password.to_string(),
        })
    }

    /// Convert to AuthUser for axum-login
    pub fn to_auth_user(&self) -> AuthUser {
        AuthUser {
            id: self.id,
            email: self.email.clone(),
            role: self.role.clone(),
            is_active: self.is_active,
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

        assert_eq!(user.role, "hr_employee");
        assert_eq!(user.email, "test_hr_employee@example.com");
        assert!(user.is_active);
        assert_eq!(user.password, "test_password_123");
    }

    #[tokio::test]
    async fn test_create_all_test_users() {
        let db = TestDatabase::new().await.expect("Failed to create test database");

        let users = TestUsers::create_all(db.connection())
            .await
            .expect("Failed to create test users");

        assert_eq!(users.employee.role, "hr_employee");
        assert_eq!(users.hr_manager.role, "hr_manager");
        assert_eq!(users.admin.role, "admin");
        assert_eq!(users.system_admin.role, "system_admin");
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
