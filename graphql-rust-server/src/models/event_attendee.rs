use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// RSVP status for event attendees
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[graphql(rename_items = "lowercase")]
pub enum RsvpStatus {
    #[sea_orm(string_value = "pending")]
    Pending,
    #[sea_orm(string_value = "accepted")]
    Accepted,
    #[sea_orm(string_value = "declined")]
    Declined,
    #[sea_orm(string_value = "tentative")]
    Tentative,
}

/// RSVP scope for recurring events
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[graphql(rename_items = "lowercase")]
pub enum RsvpScope {
    #[sea_orm(string_value = "this_event")]
    ThisEvent,
    #[sea_orm(string_value = "all_events")]
    AllEvents,
}

/// Event attendee entity - maps to hr_public.event_attendees table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "event_attendees")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
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

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::event::Entity",
        from = "Column::EventId",
        to = "super::event::Column::Id"
    )]
    Event,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::EmployeeId",
        to = "super::user::Column::Id"
    )]
    Employee,
}

impl Related<super::event::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Event.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Employee.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for EventAttendee
#[Object]
impl Model {
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
    async fn event(&self, ctx: &Context<'_>) -> GqlResult<Option<super::event::Model>> {
        let db = get_db_from_context(ctx).await?;
        let event = super::event::Entity::find_by_id(self.event_id)
            .one(db)
            .await?;
        Ok(event)
    }

    /// Employee/User associated with this attendance
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx).await?;
        let employee = super::user::Entity::find_by_id(self.employee_id)
            .one(db)
            .await?;
        Ok(employee)
    }
}

/// Input for creating event attendee
#[derive(InputObject)]
pub struct CreateEventAttendeeInput {
    pub event_id: Uuid,
    pub employee_id: Uuid,
    pub response_status: RsvpStatus,
    pub is_required: bool,
    pub reminder_time: Option<i32>,
    pub scope: Option<RsvpScope>,
    pub is_organizer: bool,
}

/// Input for updating event attendee
#[derive(InputObject)]
pub struct UpdateEventAttendeeInput {
    pub response_status: Option<RsvpStatus>,
    pub is_required: Option<bool>,
    pub reminder_time: Option<i32>,
    pub scope: Option<RsvpScope>,
}

/// Filter for querying event attendees
#[derive(InputObject)]
pub struct EventAttendeeFilter {
    pub event_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub response_status: Option<RsvpStatus>,
    pub is_required: Option<bool>,
    pub is_organizer: Option<bool>,
}
