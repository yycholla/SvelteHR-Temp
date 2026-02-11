//! Department domain model with GraphQL integration
//!
//! Represents organizational departments with hierarchical relationships.

use async_graphql::{Context, Enum, InputObject, Object, SimpleObject, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::prelude::Expr;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// Department query result wrapper with pagination metadata
#[derive(Debug, Clone, SimpleObject)]
pub struct DepartmentQueryResult {
    /// The departments matching the query
    pub items: Vec<Department>,
    /// Total count of departments matching filters (before pagination)
    pub total_count: i64,
    /// Current page number (calculated from offset/limit)
    pub page: i64,
    /// Number of items per page
    pub limit: i64,
    /// Total number of pages
    pub total_pages: i64,
    /// Whether there is a next page
    pub has_next_page: bool,
    /// Whether there is a previous page
    pub has_previous_page: bool,
}

/// Type alias for Department model to use in DepartmentQueryResult
pub type Department = Model;

/// Department ordering options for GraphQL queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum DepartmentsOrderBy {
    /// Order by ID ascending
    #[graphql(name = "ID_ASC")]
    IdAsc,
    /// Order by ID descending
    #[graphql(name = "ID_DESC")]
    IdDesc,
    /// Order by name ascending (A-Z)
    #[graphql(name = "NAME_ASC")]
    NameAsc,
    /// Order by name descending (Z-A)
    #[graphql(name = "NAME_DESC")]
    NameDesc,
    /// Order by manager ID ascending
    #[graphql(name = "MANAGER_ID_ASC")]
    ManagerIdAsc,
    /// Order by manager ID descending
    #[graphql(name = "MANAGER_ID_DESC")]
    ManagerIdDesc,
    /// Order by created date ascending (oldest first)
    #[graphql(name = "CREATED_AT_ASC")]
    CreatedAtAsc,
    /// Order by created date descending (newest first)
    #[graphql(name = "CREATED_AT_DESC")]
    CreatedAtDesc,
    /// Order by updated date ascending (oldest first)
    #[graphql(name = "UPDATED_AT_ASC")]
    UpdatedAtAsc,
    /// Order by updated date descending (newest first)
    #[graphql(name = "UPDATED_AT_DESC")]
    UpdatedAtDesc,
}

impl DepartmentsOrderBy {
    /// Convert to SQL ORDER BY clause
    pub fn to_sql(&self) -> &'static str {
        match self {
            DepartmentsOrderBy::IdAsc => "id ASC",
            DepartmentsOrderBy::IdDesc => "id DESC",
            DepartmentsOrderBy::NameAsc => "name ASC",
            DepartmentsOrderBy::NameDesc => "name DESC",
            DepartmentsOrderBy::ManagerIdAsc => "manager_id ASC",
            DepartmentsOrderBy::ManagerIdDesc => "manager_id DESC",
            DepartmentsOrderBy::CreatedAtAsc => "created_at ASC",
            DepartmentsOrderBy::CreatedAtDesc => "created_at DESC",
            DepartmentsOrderBy::UpdatedAtAsc => "updated_at ASC",
            DepartmentsOrderBy::UpdatedAtDesc => "updated_at DESC",
        }
    }
}




/// Department entity - maps to hr_public.departments table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "departments", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub parent_department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub intuit_department_id: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_modified_at: DateTime<Utc>,
    pub quickbooks_sync_token: Option<String>,
    pub sync_status: String,
    pub ancestor_ids: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentDepartmentId",
        to = "Column::Id"
    )]
    Parent,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::ManagerId",
        to = "super::user::Column::Id"
    )]
    Manager,
    #[sea_orm(has_many = "super::user::Entity")]
    Users,
}



impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for Department
#[Object(name = "Department")]
impl Model {
    /// Unique department identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Department name
    async fn name(&self) -> &str {
        &self.name
    }

    /// Department description (optional)
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Parent department ID (self-referential foreign key)
    async fn parent_department_id(&self) -> Option<Uuid> {
        self.parent_department_id
    }

    /// Department manager ID (foreign key to users)
    async fn manager_id(&self) -> Option<Uuid> {
        self.manager_id
    }

    /// QuickBooks department ID for integration
    async fn intuit_department_id(&self) -> Option<&str> {
        self.intuit_department_id.as_deref()
    }

    /// Ordered list of ancestor department IDs from immediate parent to root
    /// Empty array for root departments
    async fn ancestor_ids(&self) -> Vec<Uuid> {
        self.ancestor_ids.clone()
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Department manager (lazy-loaded)
    async fn manager(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(manager_id) = self.manager_id {
            let db = get_db_from_context(ctx)?;
            let manager = super::user::Entity::find_by_id(manager_id).one(&db).await?;
            Ok(manager)
        } else {
            Ok(None)
        }
    }

    /// Employees in this department
    async fn employees(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let employees = super::user::Entity::find()
            .filter(super::user::Column::DepartmentId.eq(self.id))
            .filter(super::user::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        Ok(employees)
    }

    /// Total employee count in this department
    async fn employee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        let count = super::user::Entity::find()
            .filter(super::user::Column::DepartmentId.eq(self.id))
            .filter(super::user::Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        Ok(count as i64)
    }

    /// Number of direct child departments (immediate subordinates)
    async fn child_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;

        let count = Entity::find()
            .filter(Column::ParentDepartmentId.eq(self.id))
            .filter(Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        Ok(count as i64)
    }

    /// Total number of descendant departments (all nested children)
    /// Uses GIN index on ancestor_ids for O(log n) performance
    async fn descendant_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;

        // Use GIN index containment operator
        let count = Entity::find()
            .filter(
                Expr::cust_with_values(
                    "ancestor_ids @> ARRAY[$1]::uuid[]",
                    vec![self.id]
                )
            )
            .filter(Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        Ok(count as i64)
    }

    /// Whether this department is a leaf node (has no children)
    async fn is_leaf(&self, ctx: &Context<'_>) -> GqlResult<bool> {
        let db = get_db_from_context(ctx)?;

        let count = Entity::find()
            .filter(Column::ParentDepartmentId.eq(self.id))
            .filter(Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        Ok(count == 0)
    }

    /// Full hierarchy path from root to this department
    /// Returns ancestors in order: [root, parent, grandparent, ..., self]
    async fn path(&self, ctx: &Context<'_>) -> GqlResult<Vec<Department>> {
        let db = get_db_from_context(ctx)?;

        // If root department (no ancestors), path is just itself
        if self.ancestor_ids.is_empty() {
            return Ok(vec![self.clone()]);
        }

        // Fetch all ancestors by their IDs
        let ancestors: Vec<Model> = Entity::find()
            .filter(Column::Id.is_in(self.ancestor_ids.clone()))
            .filter(Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        // Sort ancestors from root to immediate parent
        // ancestor_ids is stored as [parent, grandparent, ..., root]
        // so we need to reverse to get [root, ..., grandparent, parent]
        let mut sorted_ancestors: Vec<Department> = ancestors
            .into_iter()
            .map(Department::from)
            .collect();

        // Sort by finding position in ancestor_ids (reverse order)
        sorted_ancestors.sort_by_key(|dept| {
            self.ancestor_ids
                .iter()
                .rev()  // Reverse to get root-first order
                .position(|id| *id == dept.id)
                .unwrap_or(usize::MAX)
        });

        // Add self at the end
        sorted_ancestors.push(self.clone());

        Ok(sorted_ancestors)
    }
}

/// Department creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateDepartmentInput {
    pub name: String,
    pub description: Option<String>,
    pub manager_id: Option<Uuid>,
    pub parent_id: Option<Uuid>,
}

/// Department update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateDepartmentInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub manager_id: Option<Uuid>,
    pub parent_department_id: Option<Uuid>,
}

/// Bulk department update input (includes ID)
#[derive(Debug, Clone, InputObject)]
pub struct BulkUpdateDepartmentInput {
    pub id: Uuid,
    pub name: Option<String>,
    pub description: Option<String>,
    pub manager_id: Option<Uuid>,
    pub parent_department_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::Model as Department;

    #[test]
    fn test_department_model_compiles() {
        // Basic compilation test
        let dept = Department {
            id: Uuid::new_v4(),
            name: "Engineering".to_string(),
            description: Some("Software development team".to_string()),
            parent_department_id: None,
            manager_id: None,
            intuit_department_id: None,
            last_synced_at: None,
            last_modified_at: Utc::now(),
            quickbooks_sync_token: None,
            sync_status: "not_synced".to_string(),
            ancestor_ids: vec![],
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(dept.name, "Engineering");
        assert!(dept.ancestor_ids.is_empty());
    }

    #[tokio::test]
    #[ignore]  // Requires database connection (TestContext migration pending)
    async fn test_child_count_resolver() {
        // Test that child_count returns the correct number of direct children
        //
        // Setup:
        // 1. Create parent department A
        // 2. Create 3 child departments (B, C, D) with parent_id = A.id
        // 3. Create 1 grandchild department (E) with parent_id = B.id
        //
        // Expected:
        // - A.child_count should be 3 (only direct children B, C, D)
        // - B.child_count should be 1 (only direct child E)
        // - C.child_count should be 0 (leaf node)
    }

    #[tokio::test]
    #[ignore]  // Requires database connection (TestContext migration pending)
    async fn test_descendant_count_resolver() {
        // Test that descendant_count returns all nested descendants
        //
        // Setup:
        // Create hierarchy: A -> B -> C -> D
        //
        // Expected:
        // - A.descendant_count should be 3 (B, C, D)
        // - B.descendant_count should be 2 (C, D)
        // - C.descendant_count should be 1 (D)
        // - D.descendant_count should be 0 (leaf node)
        //
        // Verify that GIN index is used (check EXPLAIN ANALYZE output)
    }

    #[tokio::test]
    #[ignore]  // Requires database connection (TestContext migration pending)
    async fn test_is_leaf_resolver() {
        // Test that is_leaf correctly identifies leaf nodes
        //
        // Setup:
        // 1. Create parent department A
        // 2. Create child department B with parent_id = A.id
        //
        // Expected:
        // - A.is_leaf should be false (has child B)
        // - B.is_leaf should be true (no children)
    }

    #[tokio::test]
    #[ignore]  // Requires database connection (TestContext migration pending)
    async fn test_path_resolver() {
        // Test that path returns full hierarchy from root to self
        //
        // Setup:
        // Create hierarchy: A (root) -> B -> C -> D
        //
        // Expected:
        // - A.path should be [A] (root has no ancestors)
        // - B.path should be [A, B]
        // - C.path should be [A, B, C]
        // - D.path should be [A, B, C, D]
        //
        // Verify ordering is correct (root first, self last)
    }

    #[tokio::test]
    #[ignore]  // Requires database connection (TestContext migration pending)
    async fn test_path_excludes_soft_deleted_ancestors() {
        // Test that path excludes soft-deleted ancestors
        //
        // Setup:
        // 1. Create hierarchy: A -> B -> C
        // 2. Soft-delete B (set deleted_at = now)
        //
        // Expected:
        // - C.path should be [A, C] (B is excluded due to soft-delete)
        // - A.path should be [A] (unchanged)
    }
}
