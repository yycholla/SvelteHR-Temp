//! Employee Builder
//!
//! Seeds employee-related entities: skills, certifications, emergency contacts, addresses

use chrono::Utc;
use fake::faker::address::en::{CityName, StateAbbr, ZipCode};
use fake::faker::name::en::{FirstName, LastName};
use fake::faker::phone_number::en::PhoneNumber;
use fake::Fake;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::employee::{
    emergency_contact, employee_certification, employee_skill, user_address,
};
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Common technical skills
const SKILLS: &[(&str, &str)] = &[
    ("JavaScript", "intermediate"),
    ("TypeScript", "advanced"),
    ("Python", "intermediate"),
    ("Rust", "beginner"),
    ("SQL", "advanced"),
    ("React", "advanced"),
    ("Node.js", "intermediate"),
    ("Docker", "intermediate"),
    ("Kubernetes", "beginner"),
    ("AWS", "intermediate"),
    ("Project Management", "advanced"),
    ("Agile", "advanced"),
    ("Communication", "advanced"),
    ("Leadership", "intermediate"),
    ("Data Analysis", "intermediate"),
    ("UI/UX Design", "advanced"),
    ("Marketing Strategy", "advanced"),
    ("Sales Techniques", "intermediate"),
    ("Financial Analysis", "advanced"),
    ("Legal Compliance", "intermediate"),
];

/// Common certifications
const CERTIFICATIONS: &[(&str, &str)] = &[
    ("AWS Certified Solutions Architect", "Amazon Web Services"),
    ("Certified Scrum Master", "Scrum Alliance"),
    (
        "PMP (Project Management Professional)",
        "Project Management Institute",
    ),
    ("Google Analytics Certification", "Google"),
    ("Certified Public Accountant (CPA)", "State Board"),
    ("Professional in Human Resources (PHR)", "HRCI"),
    (
        "Certified Information Systems Security Professional (CISSP)",
        "ISC2",
    ),
    ("Microsoft Certified: Azure Administrator", "Microsoft"),
    ("Six Sigma Green Belt", "ASQ"),
    ("Certified Ethical Hacker (CEH)", "EC-Council"),
];

/// Relationship types for emergency contacts
const RELATIONSHIPS: &[&str] = &[
    "Spouse", "Parent", "Sibling", "Child", "Partner", "Friend", "Relative",
];

/// Seed employee skills (2-5 skills per user)
///
/// Randomly assigns 2-5 skills from the skill list to each user.
pub async fn seed_employee_skills(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("employee_skills");

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for skill assignment".to_string());
        return Ok(result);
    }

    for user_model in &users {
        // Assign 2-5 random skills to each user
        let skill_count = 2 + (rand::random::<usize>() % 4); // 2-5 skills
        let mut assigned_skills = std::collections::HashSet::new();

        for _ in 0..skill_count {
            // Pick random skill (avoid duplicates)
            let mut skill_index = rand::random::<usize>() % SKILLS.len();
            while assigned_skills.contains(&skill_index) {
                skill_index = rand::random::<usize>() % SKILLS.len();
            }
            assigned_skills.insert(skill_index);

            let (skill_name, proficiency) = SKILLS[skill_index];

            // Check if skill already exists (idempotency)
            let existing = employee_skill::Entity::find()
                .filter(employee_skill::Column::EmployeeId.eq(user_model.id))
                .filter(employee_skill::Column::SkillName.eq(skill_name))
                .one(db)
                .await?;

            if existing.is_some() {
                result.skipped_count += 1;
                continue;
            }

            // Create new skill
            let skill_id = Uuid::new_v4();
            let now = Utc::now();
            let new_skill = employee_skill::ActiveModel {
                id: Set(skill_id),
                employee_id: Set(user_model.id),
                skill_name: Set(skill_name.to_string()),
                proficiency_level: Set(proficiency.to_string()),
                years_experience: Set(Some(1 + (rand::random::<i32>() % 10))), // 1-10 years
                created_at: Set(now),
                updated_at: Set(now),
                deleted_at: Set(None),
            };

            match new_skill.insert(db).await {
                Ok(_) => {
                    result.created_count += 1;

                    // Log to audit system
                    if let Err(e) = log_seed_creation(db, context, "employee_skill", skill_id).await
                    {
                        tracing::warn!("Failed to log audit entry for skill: {}", e);
                    }
                }
                Err(e) => {
                    result.failed_count += 1;
                    result.errors.push(format!("Failed to create skill: {}", e));
                }
            }
        }
    }

    tracing::info!("Created {} employee skills", result.created_count);
    Ok(result)
}

/// Seed employee certifications (0-2 certifications per user)
///
/// Randomly assigns 0-2 certifications from the certification list to each user.
pub async fn seed_employee_certifications(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("employee_certifications");

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for certification assignment".to_string());
        return Ok(result);
    }

    for user_model in &users {
        // Assign 0-2 random certifications to each user
        let cert_count = rand::random::<usize>() % 3; // 0-2 certs

        if cert_count == 0 {
            continue; // This user has no certifications
        }

        let mut assigned_certs = std::collections::HashSet::new();

        for _ in 0..cert_count {
            // Pick random certification (avoid duplicates)
            let mut cert_index = rand::random::<usize>() % CERTIFICATIONS.len();
            while assigned_certs.contains(&cert_index) {
                cert_index = rand::random::<usize>() % CERTIFICATIONS.len();
            }
            assigned_certs.insert(cert_index);

            let (cert_name, issuing_org) = CERTIFICATIONS[cert_index];

            // Check if certification already exists (idempotency)
            let existing = employee_certification::Entity::find()
                .filter(employee_certification::Column::EmployeeId.eq(user_model.id))
                .filter(employee_certification::Column::CertificationName.eq(cert_name))
                .one(db)
                .await?;

            if existing.is_some() {
                result.skipped_count += 1;
                continue;
            }

            // Create new certification
            let cert_id = Uuid::new_v4();
            let now = Utc::now();
            let issue_date = now - chrono::Duration::days(rand::random::<i64>() % 1095); // Within last 3 years
            let expiration_date = issue_date + chrono::Duration::days(365 * 3); // 3-year validity

            let new_cert = employee_certification::ActiveModel {
                id: Set(cert_id),
                employee_id: Set(user_model.id),
                certification_name: Set(cert_name.to_string()),
                issuing_organization: Set(issuing_org.to_string()),
                issue_date: Set(issue_date),
                expiration_date: Set(Some(expiration_date)),
                certification_number: Set(Some(format!("CERT-{}", Uuid::new_v4()))),
                created_at: Set(now),
                updated_at: Set(now),
                deleted_at: Set(None),
            };

            match new_cert.insert(db).await {
                Ok(_) => {
                    result.created_count += 1;

                    // Log to audit system
                    if let Err(e) =
                        log_seed_creation(db, context, "employee_certification", cert_id).await
                    {
                        tracing::warn!("Failed to log audit entry for certification: {}", e);
                    }
                }
                Err(e) => {
                    result.failed_count += 1;
                    result
                        .errors
                        .push(format!("Failed to create certification: {}", e));
                }
            }
        }
    }

    tracing::info!("Created {} employee certifications", result.created_count);
    Ok(result)
}

/// Seed emergency contacts (1-2 contacts per user)
///
/// Creates realistic emergency contacts with fake names and phone numbers.
pub async fn seed_emergency_contacts(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("emergency_contacts");

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for emergency contact creation".to_string());
        return Ok(result);
    }

    for user_model in &users {
        // Create 1-2 emergency contacts per user
        let contact_count = 1 + (rand::random::<usize>() % 2); // 1-2 contacts

        for i in 0..contact_count {
            let first_name: String = FirstName().fake();
            let last_name: String = LastName().fake();
            let contact_name = format!("{} {}", first_name, last_name);
            let phone: String = PhoneNumber().fake();
            let relationship = RELATIONSHIPS[rand::random::<usize>() % RELATIONSHIPS.len()];

            // Check if emergency contact already exists (idempotency)
            // Use combination of user_id and contact_name
            let existing = emergency_contact::Entity::find()
                .filter(emergency_contact::Column::EmployeeId.eq(user_model.id))
                .filter(emergency_contact::Column::Name.eq(&contact_name))
                .one(db)
                .await?;

            if existing.is_some() {
                result.skipped_count += 1;
                continue;
            }

            // Create new emergency contact
            let contact_id = Uuid::new_v4();
            let now = Utc::now();
            let new_contact = emergency_contact::ActiveModel {
                id: Set(contact_id),
                employee_id: Set(user_model.id),
                name: Set(contact_name.clone()),
                relationship: Set(Some(relationship.to_string())),
                phone_number: Set(phone.clone()),
                email: Set(Some(format!(
                    "{}@example.com",
                    contact_name.replace(" ", ".").to_lowercase()
                ))),
                is_primary: Set(i == 0), // First contact is primary
                created_at: Set(now),
                updated_at: Set(now),
            };

            match new_contact.insert(db).await {
                Ok(_) => {
                    result.created_count += 1;

                    // Log to audit system
                    if let Err(e) =
                        log_seed_creation(db, context, "emergency_contact", contact_id).await
                    {
                        tracing::warn!("Failed to log audit entry for emergency contact: {}", e);
                    }
                }
                Err(e) => {
                    result.failed_count += 1;
                    result
                        .errors
                        .push(format!("Failed to create emergency contact: {}", e));
                }
            }
        }
    }

    tracing::info!("Created {} emergency contacts", result.created_count);
    Ok(result)
}

/// Seed user addresses (1 address per user)
///
/// Creates realistic addresses with fake street, city, state, and zip code.
pub async fn seed_user_addresses(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("user_addresses");

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result
            .errors
            .push("No users found for address creation".to_string());
        return Ok(result);
    }

    for user_model in &users {
        // Check if user already has an address (idempotency)
        let existing = user_address::Entity::find()
            .filter(user_address::Column::UserId.eq(user_model.id))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            continue;
        }

        // Generate realistic address
        let street_number = 100 + (rand::random::<u32>() % 9900);
        let street_names = vec![
            "Main",
            "Oak",
            "Elm",
            "Maple",
            "Cedar",
            "Pine",
            "Washington",
            "Park",
        ];
        let street_types = vec!["St", "Ave", "Blvd", "Rd", "Dr", "Ln"];
        let street_name = street_names[rand::random::<usize>() % street_names.len()];
        let street_type = street_types[rand::random::<usize>() % street_types.len()];
        let street = format!("{} {} {}", street_number, street_name, street_type);
        let city: String = CityName().fake();
        let state: String = StateAbbr().fake();
        let zip: String = ZipCode().fake();

        // Create new address
        let address_id = Uuid::new_v4();
        let now = Utc::now();
        let new_address = user_address::ActiveModel {
            id: Set(address_id),
            user_id: Set(user_model.id),
            address_type: Set("home".to_string()),
            is_primary: Set(true),
            address_line1: Set(street),
            address_line2: Set(None),
            city: Set(city),
            state_province: Set(state),
            postal_code: Set(zip),
            country: Set("USA".to_string()),
            latitude: Set(None),
            longitude: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_address.insert(db).await {
            Ok(_) => {
                result.created_count += 1;

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "user_address", address_id).await {
                    tracing::warn!("Failed to log audit entry for address: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result
                    .errors
                    .push(format!("Failed to create address: {}", e));
            }
        }
    }

    tracing::info!("Created {} user addresses", result.created_count);
    Ok(result)
}
