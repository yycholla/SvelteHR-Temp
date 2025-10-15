//! RBAC authorization checks for GraphQL resolvers
//!
//! Provides authorization utilities for role-based access control (RBAC)
//! in GraphQL resolvers, including resource ownership checks and permission validation.

use async_graphql::{Error, ErrorExtensions};
use sea_orm::{DatabaseConnection, EntityTrait, ColumnTrait, QueryFilter};
use uuid::Uuid;

use crate::auth::UserContext;
use crate::models::{user, department, task, leave_request, performance_review};

/// Authorization error with custom error code
pub fn authorization_error(message: impl Into<String>) -> Error {
    Error::new(message.into()).extend_with(|_, e| e.set("code", "FORBIDDEN"))
}

/// Check if user can access resource (admin or resource owner)
pub fn require_owner_or_admin(user_context: &UserContext, resource_owner_id: Uuid) -> Result<(), Error> {
    if user_context.is_admin() || user_context.user_id == resource_owner_id {
        Ok(())
    } else {
        Err(authorization_error(
            "You do not have permission to access this resource"
        ))
    }
}

/// Check if user has required role
pub fn require_role(user_context: &UserContext, role: &str) -> Result<(), Error> {
    if user_context.has_role(role) {
        Ok(())
    } else {
        Err(authorization_error(format!(
            "Requires '{}' role to perform this action",
            role
        )))
    }
}

/// Check if user has required permission
pub fn require_permission(user_context: &UserContext, permission: &str) -> Result<(), Error> {
    if user_context.has_permission(permission) {
        Ok(())
    } else {
        Err(authorization_error(format!(
            "Requires '{}' permission to perform this action",
            permission
        )))
    }
}

/// Check if user is admin
pub fn require_admin(user_context: &UserContext) -> Result<(), Error> {
    if user_context.is_admin() {
        Ok(())
    } else {
        Err(authorization_error("Requires admin role"))
    }
}

/// Check if user is HR manager or higher
pub fn require_hr_manager(user_context: &UserContext) -> Result<(), Error> {
    if user_context.is_hr_manager() {
        Ok(())
    } else {
        Err(authorization_error("Requires HR Manager role"))
    }
}

/// Check if user is manager or higher
pub fn require_manager(user_context: &UserContext) -> Result<(), Error> {
    if user_context.is_manager() {
        Ok(())
    } else {
        Err(authorization_error("Requires Manager role"))
    }
}

/// Check if user can manage another user (admin, HR manager, or direct manager)
pub async fn can_manage_user(
    db: &DatabaseConnection,
    user_context: &UserContext,
    target_user_id: Uuid,
) -> Result<bool, Error> {
    if user_context.is_admin() || user_context.is_hr_manager() {
        return Ok(true);
    }

    let target_user = user::Entity::find_by_id(target_user_id)
        .one(db)
        .await
        .map_err(|e| Error::new(format!("Database error: {}", e)))?;

    match target_user {
        Some(user) if user.manager_id == Some(user_context.user_id) => Ok(true),
        _ => Ok(false),
    }
}

/// Check if user can access department (admin, HR manager, department member, or manager)
pub async fn can_access_department(
    db: &DatabaseConnection,
    user_context: &UserContext,
    department_id: Uuid,
) -> Result<bool, Error> {
    if user_context.is_admin() || user_context.is_hr_manager() {
        return Ok(true);
    }

    let user = user::Entity::find_by_id(user_context.user_id)
        .one(db)
        .await
        .map_err(|e| Error::new(format!("Database error: {}", e)))?;

    match user {
        Some(u) if u.department_id == Some(department_id) => Ok(true),
        _ => {
            let dept = department::Entity::find_by_id(department_id)
                .one(db)
                .await
                .map_err(|e| Error::new(format!("Database error: {}", e)))?;

            match dept {
                Some(d) if d.manager_id == Some(user_context.user_id) => Ok(true),
                _ => Ok(false),
            }
        }
    }
}

/// Check if user can modify task (admin, HR manager, task owner, or assignee)
pub async fn can_modify_task(
    db: &DatabaseConnection,
    user_context: &UserContext,
    task_id: Uuid,
) -> Result<bool, Error> {
    if user_context.is_admin() || user_context.is_hr_manager() {
        return Ok(true);
    }

    let task = task::Entity::find_by_id(task_id)
        .one(db)
        .await
        .map_err(|e| Error::new(format!("Database error: {}", e)))?;

    match task {
        Some(t) if t.created_by == Some(user_context.user_id) => Ok(true),
        Some(t) if t.assignee_id == Some(user_context.user_id) => Ok(true),
        _ => Ok(false),
    }
}

/// Check if user can approve leave request (admin, HR manager, or requester's manager)
pub async fn can_approve_leave_request(
    db: &DatabaseConnection,
    user_context: &UserContext,
    leave_request_id: Uuid,
) -> Result<bool, Error> {
    if user_context.is_admin() || user_context.is_hr_manager() {
        return Ok(true);
    }

    let leave_request = leave_request::Entity::find_by_id(leave_request_id)
        .one(db)
        .await
        .map_err(|e| Error::new(format!("Database error: {}", e)))?;

    if let Some(lr) = leave_request {
        let requester = user::Entity::find_by_id(lr.employee_id)
            .one(db)
            .await
            .map_err(|e| Error::new(format!("Database error: {}", e)))?;

        match requester {
            Some(u) if u.manager_id == Some(user_context.user_id) => Ok(true),
            _ => Ok(false),
        }
    } else {
        Ok(false)
    }
}

/// Check if user can access performance review (admin, HR manager, reviewee, or reviewer)
pub async fn can_access_performance_review(
    db: &DatabaseConnection,
    user_context: &UserContext,
    review_id: Uuid,
) -> Result<bool, Error> {
    if user_context.is_admin() || user_context.is_hr_manager() {
        return Ok(true);
    }

    let review = performance_review::Entity::find_by_id(review_id)
        .one(db)
        .await
        .map_err(|e| Error::new(format!("Database error: {}", e)))?;

    match review {
        Some(r) if r.employee_id == user_context.user_id => Ok(true),
        Some(r) if r.reviewer_id == Some(user_context.user_id) => Ok(true),
        _ => Ok(false),
    }
}

/// Check if user can modify performance review (admin, HR manager, or reviewer)
pub async fn can_modify_performance_review(
    db: &DatabaseConnection,
    user_context: &UserContext,
    review_id: Uuid,
) -> Result<bool, Error> {
    if user_context.is_admin() || user_context.is_hr_manager() {
        return Ok(true);
    }

    let review = performance_review::Entity::find_by_id(review_id)
        .one(db)
        .await
        .map_err(|e| Error::new(format!("Database error: {}", e)))?;

    match review {
        Some(r) if r.reviewer_id == Some(user_context.user_id) => Ok(true),
        _ => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_require_admin() {
        let admin_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Admin".to_string()],
            vec![],
        );
        assert!(require_admin(&admin_ctx).is_ok());

        let user_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Employee".to_string()],
            vec![],
        );
        assert!(require_admin(&user_ctx).is_err());
    }

    #[test]
    fn test_require_hr_manager() {
        let hr_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["HR_Manager".to_string()],
            vec![],
        );
        assert!(require_hr_manager(&hr_ctx).is_ok());

        let admin_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Admin".to_string()],
            vec![],
        );
        assert!(require_hr_manager(&admin_ctx).is_ok());

        let user_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Employee".to_string()],
            vec![],
        );
        assert!(require_hr_manager(&user_ctx).is_err());
    }

    #[test]
    fn test_require_owner_or_admin() {
        let user_id = Uuid::new_v4();
        let other_id = Uuid::new_v4();

        let admin_ctx = UserContext::new(
            user_id,
            vec!["Admin".to_string()],
            vec![],
        );
        assert!(require_owner_or_admin(&admin_ctx, other_id).is_ok());

        let owner_ctx = UserContext::new(
            user_id,
            vec!["Employee".to_string()],
            vec![],
        );
        assert!(require_owner_or_admin(&owner_ctx, user_id).is_ok());
        assert!(require_owner_or_admin(&owner_ctx, other_id).is_err());
    }

    #[test]
    fn test_require_permission() {
        let ctx_with_perm = UserContext::new(
            Uuid::new_v4(),
            vec!["Employee".to_string()],
            vec!["users:read".to_string()],
        );
        assert!(require_permission(&ctx_with_perm, "users:read").is_ok());
        assert!(require_permission(&ctx_with_perm, "users:write").is_err());

        let admin_ctx = UserContext::new(
            Uuid::new_v4(),
            vec!["Admin".to_string()],
            vec![],
        );
        assert!(require_permission(&admin_ctx, "any:permission").is_ok());
    }
}
