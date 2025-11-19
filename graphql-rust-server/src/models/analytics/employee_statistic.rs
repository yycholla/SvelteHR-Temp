//! Employee Statistics Model
//!
//! Maps to hr_public.employee_statistics table
//! Tracks daily snapshots of employee counts for historical trend analysis

use async_graphql::Object;
use chrono::{DateTime, NaiveDate, Utc};
use sea_orm::{entity::prelude::*, QueryFilter, QueryOrder};
use serde::{Deserialize, Serialize};
use uuid::Uuid;


/// Daily snapshot of employee statistics
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_statistics", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub snapshot_date: NaiveDate,
    pub total_count: i32,
    pub active_count: i32,
    pub inactive_count: i32,
    pub department_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "analytics_employee_statistic_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "snapshotDate")]
    async fn snapshot_date(&self) -> String {
        self.snapshot_date.format("%Y-%m-%d").to_string()
    }

    #[graphql(name = "totalCount")]
    async fn total_count(&self) -> i32 {
        self.total_count
    }

    #[graphql(name = "activeCount")]
    async fn active_count(&self) -> i32 {
        self.active_count
    }

    #[graphql(name = "inactiveCount")]
    async fn inactive_count(&self) -> i32 {
        self.inactive_count
    }

    #[graphql(name = "departmentCount")]
    async fn department_count(&self) -> i32 {
        self.department_count
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}

/// Helper struct for querying employee statistics within a date range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeStatisticsRange {
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub statistics: Vec<Model>,
}

impl Entity {
    /// Get statistics for a date range (inclusive)
    pub async fn get_statistics_range(
        db: &DatabaseConnection,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<Model>, DbErr> {
        Self::find()
            .filter(Column::SnapshotDate.gte(start_date))
            .filter(Column::SnapshotDate.lte(end_date))
            .order_by_asc(Column::SnapshotDate)
            .all(db)
            .await
    }

    /// Get the most recent snapshot
    pub async fn get_latest(db: &DatabaseConnection) -> Result<Option<Model>, DbErr> {
        Self::find()
            .order_by_desc(Column::SnapshotDate)
            .one(db)
            .await
    }

    /// Check if a snapshot exists for a given date
    pub async fn exists_for_date(db: &DatabaseConnection, date: NaiveDate) -> Result<bool, DbErr> {
        let count = Self::find()
            .filter(Column::SnapshotDate.eq(date))
            .count(db)
            .await?;
        Ok(count > 0)
    }
}
