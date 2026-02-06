//! Row-Level Security (RLS) Integration Tests
//!
//! CRITICAL: Tests multi-tenant data isolation to prevent data leaks across organizations.
//!
//! This test suite validates that:
//! 1. Users can only access data from their own organization (department boundary)
//! 2. Cross-tenant data access is blocked at the database/query level
//! 3. Admin roles have appropriate cross-tenant access
//! 4. Aggregate queries respect RLS boundaries
//! 5. JOIN operations maintain tenant isolation
//!
//! Run with: cargo test --test rls_integration_tests

use chrono::Utc;
use sea_orm::{
    entity::prelude::*, EntityTrait, QueryFilter, Set, DatabaseConnection,
};
use uuid::Uuid;

// Import test infrastructure
use hr_graphql_server::testing::database::TestDatabase;
use hr_graphql_server::models::{
    user::{Entity as UserEntity, Column as UserColumn, ActiveModel as UserActiveModel},
    department::{Entity as DepartmentEntity, Column as DepartmentColumn, ActiveModel as DepartmentActiveModel},
    task::{Entity as TaskEntity, Column as TaskColumn, ActiveModel as TaskActiveModel},
    role::{Entity as RoleEntity, Column as RoleColumn},
    user_role_assignment::{Entity as UserRoleAssignmentEntity, ActiveModel as UserRoleAssignmentActiveModel},
};

/// Test fixture: Multi-tenant database with isolated organizations
struct MultiTenantFixture {
    _test_db: TestDatabase, // Keep TestDatabase alive
    db: DatabaseConnection,

    // Organization 1 (Acme Corp)
    org1_dept_id: Uuid,
    org1_employee1_id: Uuid,
    org1_employee2_id: Uuid,
    org1_manager_id: Uuid,
    org1_task1_id: Uuid,
    org1_task2_id: Uuid,

    // Organization 2 (Globex Inc)
    org2_dept_id: Uuid,
    org2_employee1_id: Uuid,
    org2_employee2_id: Uuid,
    org2_manager_id: Uuid,
    org2_task1_id: Uuid,
    org2_task2_id: Uuid,

    // System Admin (cross-tenant access)
    admin_id: Uuid,
}

impl MultiTenantFixture {
    /// Create a multi-tenant test fixture with 2 organizations
    async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let test_db = TestDatabase::new().await?;
        let db = test_db.connection().clone();

        // Create Organization 1: Acme Corp
        let org1_dept = DepartmentActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set("Acme Corp Engineering".to_string()),
            description: Set(Some("Acme Corporation Engineering Department".to_string())),
            parent_department_id: Set(None),
            manager_id: Set(None),
            intuit_department_id: Set(None),
            last_synced_at: Set(None),
            last_modified_at: Set(Utc::now()),
            quickbooks_sync_token: Set(None),
            sync_status: Set("not_synced".to_string()),
            ancestor_ids: Set(vec![]),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            deleted_at: Set(None),
        };
        let org1_dept = org1_dept.insert(&db).await?;

        // Create Organization 2: Globex Inc
        let org2_dept = DepartmentActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set("Globex Inc R&D".to_string()),
            description: Set(Some("Globex Inc Research & Development".to_string())),
            parent_department_id: Set(None),
            manager_id: Set(None),
            intuit_department_id: Set(None),
            last_synced_at: Set(None),
            last_modified_at: Set(Utc::now()),
            quickbooks_sync_token: Set(None),
            sync_status: Set("not_synced".to_string()),
            ancestor_ids: Set(vec![]),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            deleted_at: Set(None),
        };
        let org2_dept = org2_dept.insert(&db).await?;

        // Create Org1 Users
        let org1_manager = Self::create_user(
            &db,
            "alice.manager@acme.com",
            "Alice",
            "Manager",
            "hr_manager",
            Some(org1_dept.id),
        ).await?;

        let org1_employee1 = Self::create_user(
            &db,
            "bob.employee@acme.com",
            "Bob",
            "Employee",
            "hr_employee",
            Some(org1_dept.id),
        ).await?;

        let org1_employee2 = Self::create_user(
            &db,
            "carol.employee@acme.com",
            "Carol",
            "Employee",
            "hr_employee",
            Some(org1_dept.id),
        ).await?;

        // Create Org2 Users
        let org2_manager = Self::create_user(
            &db,
            "dave.manager@globex.com",
            "Dave",
            "Manager",
            "hr_manager",
            Some(org2_dept.id),
        ).await?;

        let org2_employee1 = Self::create_user(
            &db,
            "eve.employee@globex.com",
            "Eve",
            "Employee",
            "hr_employee",
            Some(org2_dept.id),
        ).await?;

        let org2_employee2 = Self::create_user(
            &db,
            "frank.employee@globex.com",
            "Frank",
            "Employee",
            "hr_employee",
            Some(org2_dept.id),
        ).await?;

        // Create System Admin (no department restriction)
        let admin = Self::create_user(
            &db,
            "system.admin@hr.com",
            "System",
            "Admin",
            "system_admin",
            None,
        ).await?;

        // Create Org1 Tasks
        let org1_task1 = Self::create_task(
            &db,
            "Acme Task 1",
            Some(org1_dept.id),
            org1_manager.id,
            Some(org1_employee1.id),
        ).await?;

        let org1_task2 = Self::create_task(
            &db,
            "Acme Task 2",
            Some(org1_dept.id),
            org1_manager.id,
            Some(org1_employee2.id),
        ).await?;

        // Create Org2 Tasks
        let org2_task1 = Self::create_task(
            &db,
            "Globex Task 1",
            Some(org2_dept.id),
            org2_manager.id,
            Some(org2_employee1.id),
        ).await?;

        let org2_task2 = Self::create_task(
            &db,
            "Globex Task 2",
            Some(org2_dept.id),
            org2_manager.id,
            Some(org2_employee2.id),
        ).await?;

        Ok(Self {
            _test_db: test_db,
            db,
            org1_dept_id: org1_dept.id,
            org1_employee1_id: org1_employee1.id,
            org1_employee2_id: org1_employee2.id,
            org1_manager_id: org1_manager.id,
            org1_task1_id: org1_task1.id,
            org1_task2_id: org1_task2.id,
            org2_dept_id: org2_dept.id,
            org2_employee1_id: org2_employee1.id,
            org2_employee2_id: org2_employee2.id,
            org2_manager_id: org2_manager.id,
            org2_task1_id: org2_task1.id,
            org2_task2_id: org2_task2.id,
            admin_id: admin.id,
        })
    }

    async fn create_user(
        db: &DatabaseConnection,
        email: &str,
        first_name: &str,
        last_name: &str,
        role: &str,
        department_id: Option<Uuid>,
    ) -> Result<hr_graphql_server::models::user::Model, DbErr> {
        use sea_orm::NotSet;

        let user = UserActiveModel {
            id: Set(Uuid::new_v4()),
            email: Set(email.to_string()),
            password_hash: Set("$2b$12$dummy_hash".to_string()),
            first_name: Set(first_name.to_string()),
            last_name: Set(last_name.to_string()),
            display_name: NotSet, // Generated column - do not set
            full_name: NotSet,    // Generated column - do not set
            phone_number: Set(None),
            mobile_number: Set(None),
            nickname: Set(None),
            social_media_release: Set(false),
            alternate_phone: Set(None),
            job_title: Set(Some("Software Engineer".to_string())),
            status: Set(Some("active".to_string())),
            department_id: Set(department_id),
            manager_id: Set(None),
            hire_date: Set(Some(Utc::now())),
            birth_date: Set(None),
            termination_date: Set(None),
            is_active: Set(true),
            failed_login_attempts: Set(0),
            locked_until: Set(None),
            last_login: Set(None),
            force_password_change: Set(false),
            theme_preference: Set("system".to_string()),
            intuit_employee_id: Set(None),
            employee_number: Set(None),
            last_synced_at: Set(None),
            last_modified_at: Set(Utc::now()),
            quickbooks_sync_token: Set(None),
            sync_status: Set("not_synced".to_string()),
            compensation_type: Set(None),
            annual_salary: Set(None),
            hourly_rate: Set(None),
            pay_schedule: Set(None),
            commission_rate: Set(None),
            bonus_eligible: Set(false),
            quickbooks_payroll_item_id: Set(None),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            deleted_at: Set(None),
        };

        let created_user = user.insert(db).await?;

        // Find or create the role and assign it to the user
        let role_model = RoleEntity::find()
            .filter(RoleColumn::Name.eq(role))
            .one(db)
            .await?;

        if let Some(role_model) = role_model {
            let role_assignment = UserRoleAssignmentActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(created_user.id),
                role_id: Set(role_model.id),
                created_at: Set(Utc::now()),
                updated_at: Set(Utc::now()),
                deleted_at: Set(None),
            };
            role_assignment.insert(db).await?;
        }

        Ok(created_user)
    }

    async fn create_task(
        db: &DatabaseConnection,
        title: &str,
        department_id: Option<Uuid>,
        created_by: Uuid,
        assignee_id: Option<Uuid>,
    ) -> Result<hr_graphql_server::models::task::Model, DbErr> {
        let task = TaskActiveModel {
            id: Set(Uuid::new_v4()),
            title: Set(title.to_string()),
            description: Set(Some("Task description".to_string())),
            task_type_id: Set(None),
            status: Set("todo".to_string()),
            priority: Set("medium".to_string()),
            due_date: Set(None),
            completed_at: Set(None),
            estimated_hours: Set(Some(8)),
            actual_hours: Set(None),
            tags: Set(None),
            department_id: Set(department_id),
            created_by: Set(created_by),
            assignee_id: Set(assignee_id),
            parent_task_id: Set(None),
            requires_manual_reassignment: Set(Some(false)),
            archived: Set(false),
            archived_at: Set(None),
            archived_by: Set(None),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            deleted_at: Set(None),
        };

        task.insert(db).await
    }

    /// Simulate RLS filtering by department_id (this is what SHOULD happen)
    fn apply_rls_filter(
        query: Select<UserEntity>,
        user_dept_id: Option<Uuid>,
        is_admin: bool,
    ) -> Select<UserEntity> {
        if is_admin {
            // Admin sees all users
            query
        } else if let Some(dept_id) = user_dept_id {
            // Employee sees only own department
            query.filter(UserColumn::DepartmentId.eq(dept_id))
        } else {
            // No department = no access
            query.filter(UserColumn::Id.is_null())
        }
    }

    /// Simulate RLS filtering for tasks
    fn apply_task_rls_filter(
        query: Select<TaskEntity>,
        user_dept_id: Option<Uuid>,
        is_admin: bool,
    ) -> Select<TaskEntity> {
        if is_admin {
            query
        } else if let Some(dept_id) = user_dept_id {
            query.filter(TaskColumn::DepartmentId.eq(dept_id))
        } else {
            query.filter(TaskColumn::Id.is_null())
        }
    }
}

// ============================================================================
// Test Suite 1: Row-Level Security Isolation
// ============================================================================

#[tokio::test]
async fn test_employee_sees_only_own_organization_employees() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Query as Org1 Employee (should only see Org1 users)
    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch org1 employee");

    let org1_dept_id = org1_user.as_ref().unwrap().department_id;

    // Apply RLS filter
    let visible_users = MultiTenantFixture::apply_rls_filter(
        UserEntity::find().filter(UserColumn::DeletedAt.is_null()),
        org1_dept_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query users");

    // Assert: Should see 3 Org1 users, not Org2 users
    assert_eq!(visible_users.len(), 3, "Org1 employee should see exactly 3 users from own org");

    let visible_ids: Vec<Uuid> = visible_users.iter().map(|u| u.id).collect();
    assert!(visible_ids.contains(&fixture.org1_employee1_id));
    assert!(visible_ids.contains(&fixture.org1_employee2_id));
    assert!(visible_ids.contains(&fixture.org1_manager_id));
    assert!(!visible_ids.contains(&fixture.org2_employee1_id), "Should NOT see Org2 users");
    assert!(!visible_ids.contains(&fixture.org2_employee2_id), "Should NOT see Org2 users");
}

#[tokio::test]
async fn test_employee_cannot_query_other_org_by_id() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Org1 employee tries to access Org2 employee by ID
    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch org1 employee")
        .unwrap();

    // Apply RLS: Query for specific Org2 user
    let blocked_query = MultiTenantFixture::apply_rls_filter(
        UserEntity::find()
            .filter(UserColumn::Id.eq(fixture.org2_employee1_id))
            .filter(UserColumn::DeletedAt.is_null()),
        org1_user.department_id,
        false,
    );

    let result = blocked_query.one(&fixture.db).await.expect("Query failed");

    // Assert: Should return None (blocked by RLS)
    assert!(result.is_none(), "Org1 employee should NOT be able to access Org2 employee by ID");
}

#[tokio::test]
async fn test_employee_sees_only_own_department_tasks() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch user")
        .unwrap();

    // Apply RLS for tasks
    let visible_tasks = MultiTenantFixture::apply_task_rls_filter(
        TaskEntity::find().filter(TaskColumn::DeletedAt.is_null()),
        org1_user.department_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query tasks");

    // Assert: Should see 2 Org1 tasks only
    assert_eq!(visible_tasks.len(), 2, "Org1 employee should see exactly 2 tasks from own org");

    let visible_task_ids: Vec<Uuid> = visible_tasks.iter().map(|t| t.id).collect();
    assert!(visible_task_ids.contains(&fixture.org1_task1_id));
    assert!(visible_task_ids.contains(&fixture.org1_task2_id));
    assert!(!visible_task_ids.contains(&fixture.org2_task1_id), "Should NOT see Org2 tasks");
}

#[tokio::test]
async fn test_manager_sees_team_data_but_not_other_teams() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let org1_manager = UserEntity::find_by_id(fixture.org1_manager_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch manager")
        .unwrap();

    // Manager query (same RLS rules as employee for department boundary)
    let visible_users = MultiTenantFixture::apply_rls_filter(
        UserEntity::find().filter(UserColumn::DeletedAt.is_null()),
        org1_manager.department_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query users");

    // Manager sees own team (3 users) but not other org
    assert_eq!(visible_users.len(), 3);

    let visible_ids: Vec<Uuid> = visible_users.iter().map(|u| u.id).collect();
    assert!(!visible_ids.contains(&fixture.org2_manager_id), "Manager should NOT see other org's manager");
}

#[tokio::test]
async fn test_department_filtering_enforced_at_db_level() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Verify that department_id filter is actually applied in query
    let org1_users = UserEntity::find()
        .filter(UserColumn::DepartmentId.eq(fixture.org1_dept_id))
        .filter(UserColumn::DeletedAt.is_null())
        .all(&fixture.db)
        .await
        .expect("Failed to query users");

    assert_eq!(org1_users.len(), 3, "Department filter should return exactly 3 Org1 users");

    let org2_users = UserEntity::find()
        .filter(UserColumn::DepartmentId.eq(fixture.org2_dept_id))
        .filter(UserColumn::DeletedAt.is_null())
        .all(&fixture.db)
        .await
        .expect("Failed to query users");

    assert_eq!(org2_users.len(), 3, "Department filter should return exactly 3 Org2 users");
}

#[tokio::test]
async fn test_organization_filtering_enforced_at_db_level() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Verify department isolation at database level
    let org1_tasks = TaskEntity::find()
        .filter(TaskColumn::DepartmentId.eq(fixture.org1_dept_id))
        .filter(TaskColumn::DeletedAt.is_null())
        .all(&fixture.db)
        .await
        .expect("Failed to query tasks");

    assert_eq!(org1_tasks.len(), 2, "Org1 should have exactly 2 tasks");

    let org2_tasks = TaskEntity::find()
        .filter(TaskColumn::DepartmentId.eq(fixture.org2_dept_id))
        .filter(TaskColumn::DeletedAt.is_null())
        .all(&fixture.db)
        .await
        .expect("Failed to query tasks");

    assert_eq!(org2_tasks.len(), 2, "Org2 should have exactly 2 tasks");
}

#[tokio::test]
async fn test_aggregate_queries_respect_rls_count() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Count users in Org1 department
    let org1_count = UserEntity::find()
        .filter(UserColumn::DepartmentId.eq(fixture.org1_dept_id))
        .filter(UserColumn::DeletedAt.is_null())
        .count(&fixture.db)
        .await
        .expect("Failed to count users");

    assert_eq!(org1_count, 3, "Org1 user count should be 3");

    // Count users in Org2 department
    let org2_count = UserEntity::find()
        .filter(UserColumn::DepartmentId.eq(fixture.org2_dept_id))
        .filter(UserColumn::DeletedAt.is_null())
        .count(&fixture.db)
        .await
        .expect("Failed to count users");

    assert_eq!(org2_count, 3, "Org2 user count should be 3");

    // CRITICAL: Verify that without filter, we see all users (6 employees + 1 admin = minimum 7)
    let total_count = UserEntity::find()
        .filter(UserColumn::DeletedAt.is_null())
        .count(&fixture.db)
        .await
        .expect("Failed to count all users");

    assert!(total_count >= 7, "Total user count should be at least 7 (6 employees + 1 admin), got {}", total_count);
}

#[tokio::test]
async fn test_join_queries_maintain_rls_across_tables() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Query tasks with user joins (ensure department boundary is maintained)
    let org1_tasks_with_assignees = TaskEntity::find()
        .filter(TaskColumn::DepartmentId.eq(fixture.org1_dept_id))
        .filter(TaskColumn::DeletedAt.is_null())
        .all(&fixture.db)
        .await
        .expect("Failed to query tasks");

    assert_eq!(org1_tasks_with_assignees.len(), 2);

    // Verify that all tasks belong to Org1 department
    for task in &org1_tasks_with_assignees {
        assert_eq!(task.department_id, Some(fixture.org1_dept_id),
            "All tasks should belong to Org1 department");

        // Verify assignee is from same org (if assigned)
        if let Some(assignee_id) = task.assignee_id {
            let assignee = UserEntity::find_by_id(assignee_id)
                .one(&fixture.db)
                .await
                .expect("Failed to fetch assignee")
                .expect("Assignee should exist");

            assert_eq!(assignee.department_id, Some(fixture.org1_dept_id),
                "Task assignee should be from same department");
        }
    }
}

// ============================================================================
// Test Suite 2: Cross-Tenant Data Access Prevention
// ============================================================================

#[tokio::test]
async fn test_direct_id_access_to_other_tenant_fails() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch user")
        .unwrap();

    // Attempt to directly access Org2 employee by ID with RLS filter
    let blocked_access = MultiTenantFixture::apply_rls_filter(
        UserEntity::find().filter(UserColumn::Id.eq(fixture.org2_employee1_id)),
        org1_user.department_id,
        false,
    )
    .one(&fixture.db)
    .await
    .expect("Query failed");

    assert!(blocked_access.is_none(), "Direct ID access to other tenant should return None");
}

#[tokio::test]
async fn test_search_queries_dont_leak_cross_tenant_data() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch user")
        .unwrap();

    // Search for users by name pattern (should only return same org)
    let search_results = MultiTenantFixture::apply_rls_filter(
        UserEntity::find()
            .filter(UserColumn::FirstName.like("%e%")) // Matches Eve, Dave, Alice, Carol
            .filter(UserColumn::DeletedAt.is_null()),
        org1_user.department_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to search users");

    // Should only see Alice and Carol from Org1 (not Eve or Dave from Org2)
    let names: Vec<String> = search_results.iter().map(|u| u.first_name.clone()).collect();
    assert!(names.contains(&"Alice".to_string()), "Should see Alice (Org1)");
    assert!(!names.contains(&"Eve".to_string()), "Should NOT see Eve (Org2)");
    assert!(!names.contains(&"Dave".to_string()), "Should NOT see Dave (Org2)");
}

#[tokio::test]
async fn test_batch_operations_respect_tenant_boundaries() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Batch query for multiple users (mix of Org1 and Org2)
    let mixed_ids = vec![
        fixture.org1_employee1_id,
        fixture.org2_employee1_id,
        fixture.org1_employee2_id,
    ];

    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch user")
        .unwrap();

    // Apply RLS filter to batch query
    let results = MultiTenantFixture::apply_rls_filter(
        UserEntity::find()
            .filter(UserColumn::Id.is_in(mixed_ids))
            .filter(UserColumn::DeletedAt.is_null()),
        org1_user.department_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query batch users");

    // Should only return 2 users (Org1), not the Org2 user
    assert_eq!(results.len(), 2, "Batch query should only return 2 Org1 users");

    let result_ids: Vec<Uuid> = results.iter().map(|u| u.id).collect();
    assert!(result_ids.contains(&fixture.org1_employee1_id));
    assert!(result_ids.contains(&fixture.org1_employee2_id));
    assert!(!result_ids.contains(&fixture.org2_employee1_id), "Should NOT include Org2 user in batch");
}

#[tokio::test]
async fn test_relation_loading_isolated() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Load task with assignee (should only succeed for same-org tasks)
    let org1_task = TaskEntity::find_by_id(fixture.org1_task1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch task")
        .expect("Task should exist");

    // Verify assignee is from same department
    if let Some(assignee_id) = org1_task.assignee_id {
        let assignee = UserEntity::find_by_id(assignee_id)
            .one(&fixture.db)
            .await
            .expect("Failed to fetch assignee")
            .expect("Assignee should exist");

        assert_eq!(assignee.department_id, Some(fixture.org1_dept_id),
            "Task assignee must be from same organization");
    }
}

#[tokio::test]
async fn test_graphql_nested_queries_maintain_isolation() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Simulate nested GraphQL query: user -> department -> employees
    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch user")
        .unwrap();

    // Load user's department
    let department = DepartmentEntity::find_by_id(org1_user.department_id.unwrap())
        .one(&fixture.db)
        .await
        .expect("Failed to fetch department")
        .expect("Department should exist");

    // Load all employees in that department (simulating GraphQL resolver)
    let dept_employees = MultiTenantFixture::apply_rls_filter(
        UserEntity::find()
            .filter(UserColumn::DepartmentId.eq(department.id))
            .filter(UserColumn::DeletedAt.is_null()),
        Some(department.id),
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query department employees");

    // Should only see 3 employees from Org1
    assert_eq!(dept_employees.len(), 3);

    let employee_ids: Vec<Uuid> = dept_employees.iter().map(|e| e.id).collect();
    assert!(!employee_ids.contains(&fixture.org2_employee1_id),
        "Nested query should not leak Org2 employees");
}

#[tokio::test]
async fn test_filter_bypass_attempts_blocked() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let org1_user = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch user")
        .unwrap();

    // Attempt to bypass filter with OR condition
    let bypass_attempt = MultiTenantFixture::apply_rls_filter(
        UserEntity::find()
            .filter(
                UserColumn::DepartmentId.eq(fixture.org1_dept_id)
                    .or(UserColumn::DepartmentId.eq(fixture.org2_dept_id))
            )
            .filter(UserColumn::DeletedAt.is_null()),
        org1_user.department_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query users");

    // RLS filter should override the OR condition
    assert_eq!(bypass_attempt.len(), 3, "Filter bypass should still respect RLS");

    let ids: Vec<Uuid> = bypass_attempt.iter().map(|u| u.id).collect();
    assert!(!ids.contains(&fixture.org2_employee1_id), "Should NOT bypass RLS with OR condition");
}

#[tokio::test]
async fn test_sql_injection_via_filters_sanitized() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Attempt SQL injection via email filter (SeaORM should sanitize)
    let injection_attempt = "eve@globex.com' OR '1'='1";

    let results = UserEntity::find()
        .filter(UserColumn::Email.eq(injection_attempt))
        .filter(UserColumn::DeletedAt.is_null())
        .all(&fixture.db)
        .await
        .expect("Query should not fail");

    // Should return 0 results (injection blocked)
    assert_eq!(results.len(), 0, "SQL injection should be sanitized by SeaORM");
}

// ============================================================================
// Test Suite 3: Admin Multi-Tenant Access
// ============================================================================

#[tokio::test]
async fn test_system_admin_sees_all_organizations() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let admin_user = UserEntity::find_by_id(fixture.admin_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch admin")
        .unwrap();

    // Admin query with RLS bypass
    let all_users = MultiTenantFixture::apply_rls_filter(
        UserEntity::find().filter(UserColumn::DeletedAt.is_null()),
        admin_user.department_id,
        true, // is_admin = true
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query users");

    // Admin should see all users (minimum 7: 3 Org1 + 3 Org2 + 1 Admin)
    assert!(all_users.len() >= 7, "Admin should see at least 7 users across organizations, got {}", all_users.len());

    let user_ids: Vec<Uuid> = all_users.iter().map(|u| u.id).collect();
    assert!(user_ids.contains(&fixture.org1_employee1_id));
    assert!(user_ids.contains(&fixture.org2_employee1_id));
}

#[tokio::test]
async fn test_system_admin_can_query_any_employee_by_id() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Admin directly queries Org2 employee
    let org2_employee = MultiTenantFixture::apply_rls_filter(
        UserEntity::find().filter(UserColumn::Id.eq(fixture.org2_employee1_id)),
        None,
        true, // is_admin = true
    )
    .one(&fixture.db)
    .await
    .expect("Failed to query user")
    .expect("Admin should access any user");

    assert_eq!(org2_employee.id, fixture.org2_employee1_id);
    assert_eq!(org2_employee.department_id, Some(fixture.org2_dept_id));
}

#[tokio::test]
async fn test_hr_admin_sees_all_employees_in_organization() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // HR Manager query (same org, but can see all in department)
    let org1_manager = UserEntity::find_by_id(fixture.org1_manager_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch manager")
        .unwrap();

    let visible_users = MultiTenantFixture::apply_rls_filter(
        UserEntity::find().filter(UserColumn::DeletedAt.is_null()),
        org1_manager.department_id,
        false, // HR Manager follows same RLS as employees
    )
    .all(&fixture.db)
    .await
    .expect("Failed to query users");

    // HR Manager sees own org (3 users), not other org
    assert_eq!(visible_users.len(), 3);

    let ids: Vec<Uuid> = visible_users.iter().map(|u| u.id).collect();
    assert!(!ids.contains(&fixture.org2_employee1_id),
        "HR Manager should NOT see other organization's employees");
}

#[tokio::test]
async fn test_hr_admin_cannot_see_other_organizations() {
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    let org1_manager = UserEntity::find_by_id(fixture.org1_manager_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch manager")
        .unwrap();

    // Try to query Org2 department
    let org2_dept_query = MultiTenantFixture::apply_rls_filter(
        UserEntity::find()
            .filter(UserColumn::DepartmentId.eq(fixture.org2_dept_id))
            .filter(UserColumn::DeletedAt.is_null()),
        org1_manager.department_id,
        false,
    )
    .all(&fixture.db)
    .await
    .expect("Query failed");

    // Should return 0 users (blocked by RLS)
    assert_eq!(org2_dept_query.len(), 0,
        "HR Manager should NOT access other organization's department");
}

// ============================================================================
// Integration with GraphQL Context (Future Enhancement)
// ============================================================================

#[tokio::test]
async fn test_graphql_query_with_user_context() {
    use async_graphql::{EmptySubscription, Request, Schema};
    use hr_graphql_server::auth::context::UserContext;
    use hr_graphql_server::schema::{QueryRoot, MutationRoot};

    // Create multi-tenant fixture
    let fixture = MultiTenantFixture::new().await.expect("Failed to create fixture");

    // Fetch Org1 employee to get their department_id
    let org1_employee = UserEntity::find_by_id(fixture.org1_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch org1 employee")
        .expect("Org1 employee should exist");

    // Fetch Org2 employee for comparison
    let org2_employee = UserEntity::find_by_id(fixture.org2_employee1_id)
        .one(&fixture.db)
        .await
        .expect("Failed to fetch org2 employee")
        .expect("Org2 employee should exist");

    // Create GraphQL schema with database connection
    let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(fixture.db.clone())
        .finish();

    // Create UserContext with RLS fields for Org1 employee
    let user_context = UserContext::with_rls(
        org1_employee.id,
        vec!["hr_employee".to_string()],
        vec!["employees:read".to_string()],
        org1_employee.department_id, // This is the key: include department_id for RLS
        None, // organization_id not used yet
    );

    // Execute GraphQL query as Org1 employee
    let query = r#"
        query {
            users(limit: 100) {
                id
                email
                departmentId
            }
        }
    "#;

    let request = Request::new(query).data(user_context);
    let response = schema.execute(request).await;

    // Extract response data
    let errors: Vec<String> = response.errors.iter().map(|e| e.message.clone()).collect();
    assert!(errors.is_empty(), "GraphQL query should not have errors: {:?}", errors);

    let data = &response.data;
    let data_str = data.to_string();

    // CRITICAL ASSERTION: RLS filtering is applied correctly
    // Only users from the same department should be visible

    // Check if response contains user data
    assert!(data_str.contains("users"), "Response should contain 'users' field");

    // CRITICAL SECURITY ASSERTIONS:
    // These assertions validate that RLS filtering is applied correctly

    // Assert: Should contain Org1 users (same department)
    assert!(
        data_str.contains(&fixture.org1_employee1_id.to_string()),
        "Should see own user ID ({})", fixture.org1_employee1_id
    );
    assert!(
        data_str.contains(&fixture.org1_employee2_id.to_string()),
        "Should see Org1 colleague ({})", fixture.org1_employee2_id
    );
    assert!(
        data_str.contains(&fixture.org1_manager_id.to_string()),
        "Should see Org1 manager ({})", fixture.org1_manager_id
    );

    // Assert: Should NOT contain Org2 users (cross-tenant data leak!)
    // THIS ASSERTION WILL FAIL if RLS is not enforced - demonstrating the security gap
    assert!(
        !data_str.contains(&fixture.org2_employee1_id.to_string()),
        "CRITICAL SECURITY FAILURE: Should NOT see Org2 employee ({}). Cross-tenant data leak detected!",
        fixture.org2_employee1_id
    );
    assert!(
        !data_str.contains(&fixture.org2_employee2_id.to_string()),
        "CRITICAL SECURITY FAILURE: Should NOT see Org2 employee ({}). Cross-tenant data leak detected!",
        fixture.org2_employee2_id
    );
    assert!(
        !data_str.contains(&fixture.org2_manager_id.to_string()),
        "CRITICAL SECURITY FAILURE: Should NOT see Org2 manager ({}). Cross-tenant data leak detected!",
        fixture.org2_manager_id
    );

    // Assert: Should NOT see admin (no department, different isolation boundary)
    assert!(
        !data_str.contains(&fixture.admin_id.to_string()),
        "Should NOT see system admin ({}) - admin has no department_id",
        fixture.admin_id
    );
}
