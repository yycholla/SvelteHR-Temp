//! Seed Data Configuration
//!
//! Controls seed data volume, behavior, and entity selection.

use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VolumeTarget {
    Small,   // 10-50 records per entity
    Medium,  // 50-200 records per entity
    Large,   // 200-1000 records per entity
}

impl Default for VolumeTarget {
    fn default() -> Self {
        VolumeTarget::Small
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EntityType {
    Roles,
    Permissions,
    RolePermissions,
    Departments,
    Users,
    UserRoleAssignments,
    LeaveTypes,
    LeaveBalances,
    LeaveRequests,
    EmployeeSkills,
    EmployeeCertifications,
    EmergencyContacts,
    UserAddresses,
    Events,
    EventAttendees,
    Documents,
    ReviewCycles,
    PerformanceReviews,
    Tasks,
    TaskAssignees,
    TimeEntries,
}

impl EntityType {
    pub fn all() -> HashSet<EntityType> {
        use EntityType::*;
        vec![
            Roles,
            Permissions,
            RolePermissions,
            Departments,
            Users,
            UserRoleAssignments,
            LeaveTypes,
            LeaveBalances,
            LeaveRequests,
            EmployeeSkills,
            EmployeeCertifications,
            EmergencyContacts,
            UserAddresses,
            Events,
            EventAttendees,
            Documents,
            ReviewCycles,
            PerformanceReviews,
            Tasks,
            TaskAssignees,
            TimeEntries,
        ]
        .into_iter()
        .collect()
    }
}

#[derive(Debug, Clone)]
pub struct SeedConfig {
    pub volume_target: VolumeTarget,
    pub clear_existing: bool,
    pub enable_audit_logging: bool,
    pub seed_entities: HashSet<EntityType>,
    pub target_counts: HashMap<EntityType, usize>,
}

impl Default for SeedConfig {
    fn default() -> Self {
        use EntityType::*;
        let mut target_counts = HashMap::new();

        // Default small volume targets (10-50 per entity)
        target_counts.insert(Roles, 4); // Fixed
        target_counts.insert(Permissions, 30); // Core set
        target_counts.insert(RolePermissions, 60);
        target_counts.insert(Departments, 10);
        target_counts.insert(Users, 50);
        target_counts.insert(UserRoleAssignments, 50);
        target_counts.insert(LeaveTypes, 5);
        target_counts.insert(LeaveBalances, 250); // users × leave types
        target_counts.insert(LeaveRequests, 35);
        target_counts.insert(EmployeeSkills, 150);
        target_counts.insert(EmployeeCertifications, 25);
        target_counts.insert(EmergencyContacts, 75);
        target_counts.insert(UserAddresses, 50);
        target_counts.insert(Events, 25);
        target_counts.insert(EventAttendees, 150);
        target_counts.insert(Documents, 30);
        target_counts.insert(ReviewCycles, 3);
        target_counts.insert(PerformanceReviews, 20);
        target_counts.insert(Tasks, 50);
        target_counts.insert(TaskAssignees, 75);
        target_counts.insert(TimeEntries, 125);

        SeedConfig {
            volume_target: VolumeTarget::Small,
            clear_existing: false,
            enable_audit_logging: true,
            seed_entities: EntityType::all(),
            target_counts,
        }
    }
}

impl SeedConfig {
    pub fn from_env() -> Self {
        let mut config = SeedConfig::default();

        // Parse SEED_VOLUME_TARGET
        if let Ok(vol) = std::env::var("SEED_VOLUME_TARGET") {
            config.volume_target = match vol.to_lowercase().as_str() {
                "medium" => VolumeTarget::Medium,
                "large" => VolumeTarget::Large,
                _ => VolumeTarget::Small,
            };
        }

        // Parse SEED_CLEAR_EXISTING
        if let Ok(clear) = std::env::var("SEED_CLEAR_EXISTING") {
            config.clear_existing = clear.to_lowercase() == "true";
        }

        // Parse SEED_ENABLE_AUDIT
        if let Ok(audit) = std::env::var("SEED_ENABLE_AUDIT") {
            config.enable_audit_logging = audit.to_lowercase() != "false";
        }

        // Parse individual entity counts (e.g., SEED_USER_COUNT=100)
        if let Ok(count) = std::env::var("SEED_USER_COUNT") {
            if let Ok(num) = count.parse() {
                config.target_counts.insert(EntityType::Users, num);
            }
        }

        config
    }

    pub fn get_target_count(&self, entity: EntityType) -> usize {
        *self.target_counts.get(&entity).unwrap_or(&0)
    }
}
