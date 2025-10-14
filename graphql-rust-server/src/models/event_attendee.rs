use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// RSVP status for event attendees
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "hr_public.rsvp_status", rename_all = "lowercase")]
#[graphql(rename_items = "lowercase")]
pub enum RsvpStatus {
    Pending,
    Accepted,
    Declined,
    Tentative,
}

/// RSVP scope for recurring events
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "hr_public.rsvp_scope", rename_all = "lowercase")]
#[graphql(rename_items = "lowercase")]
pub enum RsvpScope {
    ThisEvent,
    AllEvents,
}

/// Event attendee record
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EventAttendee {
    pub id: Uuid,
    pub event_id: Uuid,
    pub employee_id: Uuid,
    pub response_status: RsvpStatus,
    pub is_required: bool,
    pub created_at: DateTime<Utc>,
    pub reminder_time: Option<i32>,
    pub scope: Option<RsvpScope>,
    pub is_organizer: bool,
}

/// GraphQL Object implementation for EventAttendee
#[Object]
impl EventAttendee {
    /// Unique attendee identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Event ID (foreign key)
    async fn event_id(&self) -> Uuid {
        self.event_id
    }

    /// Employee/User ID (foreign key)
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    /// RSVP response status
    async fn response_status(&self) -> RsvpStatus {
        self.response_status
    }

    /// Whether attendance is required
    async fn is_required(&self) -> bool {
        self.is_required
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Reminder time in minutes before event
    async fn reminder_time(&self) -> Option<i32> {
        self.reminder_time
    }

    /// RSVP scope (ThisEvent or AllEvents for recurring)
    async fn scope(&self) -> Option<RsvpScope> {
        self.scope
    }

    /// Whether this attendee is the event organizer
    async fn is_organizer(&self) -> bool {
        self.is_organizer
    }

    /// Event this attendee is associated with
    async fn event(&self, ctx: &Context<'_>) -> GqlResult<Option<super::event::Event>> {
        let pool = ctx.data::<PgPool>()?;

        let event = sqlx::query_as::<_, super::event::Event>(
            r#"
            SELECT id, title, description, location, start_time, end_time,
                   is_all_day, recurrence_rule, recurrence_end_date, capacity,
                   image_url, image_aspect_ratio, created_by,
                   created_at, updated_at, deleted_at
            FROM hr_public.events
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.event_id)
        .fetch_optional(pool)
        .await?;

        Ok(event)
    }

    /// Employee/User who is attending
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// PostGraphile alias: userByEmployeeId
    async fn user_by_employee_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }
}

/// Input for filtering event attendees
#[derive(Debug, Clone, InputObject)]
pub struct EventAttendeeFilter {
    pub id: Option<Uuid>,
    pub event_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub response_status: Option<RsvpStatus>,
    pub is_required: Option<bool>,
    pub reminder_time: Option<i32>,
    pub reminder_time_is_null: Option<bool>,
    pub reminder_time_gt: Option<i32>,
    pub reminder_time_lt: Option<i32>,
    pub reminder_time_gte: Option<i32>,
    pub reminder_time_lte: Option<i32>,
    pub scope: Option<RsvpScope>,
    pub is_organizer: Option<bool>,
}

impl EventAttendeeFilter {
    /// Apply filter conditions to a QueryBuilder with proper parameter binding
    ///
    /// This method adds WHERE conditions to the query builder, ensuring type-safe
    /// parameter binding and preventing SQL injection.
    pub fn apply_to_query<'a>(
        &'a self,
        builder: &mut sqlx::QueryBuilder<'a, sqlx::Postgres>,
    ) {
        let mut separator = builder.separated(" AND ");

        // Exact match filters
        if let Some(id) = self.id {
            separator.push("id = ");
            separator.push_bind_unseparated(id);
        }

        if let Some(event_id) = self.event_id {
            separator.push("event_id = ");
            separator.push_bind_unseparated(event_id);
        }

        if let Some(employee_id) = self.employee_id {
            separator.push("employee_id = ");
            separator.push_bind_unseparated(employee_id);
        }

        if let Some(status) = self.response_status {
            separator.push("response_status = ");
            separator.push_bind_unseparated(status);
        }

        if let Some(is_required) = self.is_required {
            separator.push("is_required = ");
            separator.push_bind_unseparated(is_required);
        }

        // Reminder time: null checks take precedence over value/range queries
        if let Some(true) = self.reminder_time_is_null {
            separator.push_unseparated("reminder_time IS NULL");
        } else if let Some(false) = self.reminder_time_is_null {
            separator.push_unseparated("reminder_time IS NOT NULL");
        } else if let Some(reminder_time) = self.reminder_time {
            // Exact match for reminder_time
            separator.push("reminder_time = ");
            separator.push_bind_unseparated(reminder_time);
        }

        // Range queries for reminder_time (can be combined)
        if let Some(gt) = self.reminder_time_gt {
            separator.push("reminder_time > ");
            separator.push_bind_unseparated(gt);
        }

        if let Some(lt) = self.reminder_time_lt {
            separator.push("reminder_time < ");
            separator.push_bind_unseparated(lt);
        }

        if let Some(gte) = self.reminder_time_gte {
            separator.push("reminder_time >= ");
            separator.push_bind_unseparated(gte);
        }

        if let Some(lte) = self.reminder_time_lte {
            separator.push("reminder_time <= ");
            separator.push_bind_unseparated(lte);
        }

        // Scope filter
        if let Some(scope) = self.scope {
            separator.push("scope = ");
            separator.push_bind_unseparated(scope);
        }

        // Organizer filter
        if let Some(is_organizer) = self.is_organizer {
            separator.push("is_organizer = ");
            separator.push_bind_unseparated(is_organizer);
        }
    }

    /// Check if any filters are set
    pub fn has_filters(&self) -> bool {
        self.id.is_some()
            || self.event_id.is_some()
            || self.employee_id.is_some()
            || self.response_status.is_some()
            || self.is_required.is_some()
            || self.reminder_time.is_some()
            || self.reminder_time_is_null.is_some()
            || self.reminder_time_gt.is_some()
            || self.reminder_time_lt.is_some()
            || self.reminder_time_gte.is_some()
            || self.reminder_time_lte.is_some()
            || self.scope.is_some()
            || self.is_organizer.is_some()
    }
}

/// Input for creating event attendee
#[derive(Debug, Clone, InputObject)]
pub struct CreateEventAttendeeInput {
    pub event_id: Uuid,
    pub employee_id: Uuid,
    pub response_status: Option<RsvpStatus>,
    pub is_required: Option<bool>,
    pub reminder_time: Option<i32>,
    pub scope: Option<RsvpScope>,
    pub is_organizer: Option<bool>,
}

/// Input for updating event attendee
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEventAttendeeInput {
    pub response_status: Option<RsvpStatus>,
    pub reminder_time: Option<i32>,
    pub scope: Option<RsvpScope>,
}
