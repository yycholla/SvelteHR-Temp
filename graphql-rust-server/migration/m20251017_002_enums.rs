//! Migration: Create PostgreSQL ENUM types
//!
//! Sets up all custom enum types used throughout the HR system.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // User/Employee status enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.user_status AS ENUM ('active', 'inactive', 'terminated')",
            )
            .await?;

        // Task status enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled')")
            .await?;

        // Task priority enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent')",
            )
            .await?;

        // Event type enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.event_type AS ENUM ('meeting', 'training', 'social', 'company_event', 'holiday', 'interview', 'review', 'team_building', 'other')")
            .await?;

        // Event status enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.event_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')")
            .await?;

        // RSVP status enum (for event attendees)
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative', 'waitlist')")
            .await?;

        // Leave request status enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled')")
            .await?;

        // Review status enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.review_status AS ENUM ('draft', 'in_progress', 'submitted', 'completed', 'cancelled')")
            .await?;

        // Document access level enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.document_access_level AS ENUM ('public', 'department', 'restricted', 'confidential')")
            .await?;

        // Notification type enum
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.notification_type AS ENUM ('info', 'warning', 'error', 'success', 'task', 'event', 'review', 'leave', 'document')")
            .await?;

        // Recurrence frequency enum (for events)
        manager
            .get_connection()
            .execute_unprepared("CREATE TYPE hr_public.recurrence_frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly')")
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop all enum types
        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.recurrence_frequency CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.notification_type CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.document_access_level CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.review_status CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.leave_request_status CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.rsvp_status CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.event_status CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.event_type CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.task_priority CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.task_status CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.user_status CASCADE")
            .await?;

        Ok(())
    }
}
