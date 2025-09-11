CREATE MIGRATION m1nz326ofhqzy3flyff6n4clbgrqv2my5i3wddlyknqzfyz56qe7eq
    ONTO m1ebtvhvtryfzotxdcrkdm7cdra6w2bugwsvpnrqnonntdntc72z5a
{
  CREATE EXTENSION pgcrypto VERSION '1.3';
  CREATE EXTENSION auth VERSION '1.0';
  CREATE ABSTRACT TYPE portal_communication::FormEnabled {
      CREATE MULTI LINK forms: portal_communication::Form;
      CREATE PROPERTY default_form_id: std::uuid;
  };
  ALTER TYPE compliance_performance::PerformanceReview {
      DROP EXTENDING default::Auditable;
      EXTENDING portal_communication::FormEnabled LAST;
  };
  CREATE TYPE default::AuthSession EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY token_hash: std::str;
      CREATE CONSTRAINT std::exclusive ON (.token_hash);
      CREATE INDEX ON (.token_hash);
      CREATE REQUIRED PROPERTY expires_at: std::datetime;
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON ((.expires_at, .is_active));
      CREATE REQUIRED LINK user: rbac::User;
      CREATE INDEX ON ((.user, .is_active));
      CREATE PROPERTY ip_address: std::str;
      CREATE PROPERTY refresh_token_hash: std::str;
      CREATE PROPERTY user_agent: std::str;
  };
  CREATE TYPE default::EmailVerificationToken EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY token_hash: std::str;
      CREATE CONSTRAINT std::exclusive ON (.token_hash);
      CREATE INDEX ON (.token_hash);
      CREATE REQUIRED LINK user: rbac::User;
      CREATE REQUIRED PROPERTY expires_at: std::datetime;
      CREATE PROPERTY is_used: std::bool {
          SET default := false;
      };
  };
  CREATE TYPE default::OAuthConnection EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY provider: std::str;
      CREATE REQUIRED PROPERTY provider_user_id: std::str;
      CREATE CONSTRAINT std::exclusive ON ((.provider, .provider_user_id));
      CREATE INDEX ON ((.provider, .provider_user_id));
      CREATE REQUIRED LINK user: rbac::User;
      CREATE INDEX ON (.user);
      CREATE PROPERTY access_token_hash: std::str;
      CREATE PROPERTY expires_at: std::datetime;
      CREATE PROPERTY provider_email: std::str;
      CREATE PROPERTY provider_name: std::str;
      CREATE PROPERTY refresh_token_hash: std::str;
  };
  CREATE TYPE default::PasswordResetToken EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY token_hash: std::str;
      CREATE CONSTRAINT std::exclusive ON (.token_hash);
      CREATE INDEX ON (.token_hash);
      CREATE REQUIRED LINK user: rbac::User;
      CREATE REQUIRED PROPERTY expires_at: std::datetime;
      CREATE PROPERTY is_used: std::bool {
          SET default := false;
      };
  };
  ALTER TYPE hr_workflows::ChangeRequest {
      DROP EXTENDING default::Auditable;
      EXTENDING portal_communication::FormEnabled LAST;
  };
  ALTER TYPE hr_workflows::HRRequest {
      DROP EXTENDING default::Auditable;
      EXTENDING portal_communication::FormEnabled LAST;
  };
  ALTER TYPE onboarding_offboarding::ExitInterview {
      DROP EXTENDING default::Auditable;
      EXTENDING portal_communication::FormEnabled LAST;
  };
  ALTER TYPE portal_communication::FormSubmission {
      CREATE LINK exit_interview: onboarding_offboarding::ExitInterview;
  };
  ALTER TYPE onboarding_offboarding::OnboardingProcess {
      DROP EXTENDING default::Auditable;
      EXTENDING portal_communication::FormEnabled LAST;
  };
  ALTER TYPE portal_communication::FormSubmission {
      CREATE LINK onboarding_process: onboarding_offboarding::OnboardingProcess;
  };
  ALTER TYPE onboarding_offboarding::OnboardingTemplate {
      DROP EXTENDING default::Auditable;
      EXTENDING portal_communication::FormEnabled LAST;
  };
  CREATE TYPE portal_communication::FormTemplate EXTENDING default::Auditable {
      CREATE REQUIRED PROPERTY category: std::str;
      CREATE INDEX ON (.category);
      CREATE PROPERTY is_active: std::bool {
          SET default := true;
      };
      CREATE INDEX ON (.is_active);
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY description: std::str;
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE REQUIRED PROPERTY template_schema: std::json;
      CREATE PROPERTY version: std::int32 {
          SET default := 1;
      };
  };
  ALTER TYPE portal_communication::Form {
      CREATE LINK template: portal_communication::FormTemplate;
      CREATE INDEX ON (.template);
      CREATE PROPERTY version: std::int32 {
          SET default := 1;
      };
  };
  ALTER TYPE portal_communication::FormTemplate {
      CREATE PROPERTY usage_count := (std::count(.<template[IS portal_communication::Form]));
  };
  CREATE TYPE portal_communication::FormContext EXTENDING default::Auditable {
      CREATE REQUIRED LINK form: portal_communication::Form;
      CREATE REQUIRED PROPERTY context_type: std::str;
      CREATE PROPERTY entity_id: std::uuid;
      CREATE CONSTRAINT std::exclusive ON ((.form, .context_type, .entity_id));
      CREATE INDEX ON (.context_type);
      CREATE INDEX ON (.entity_id);
      CREATE PROPERTY entity_type: std::str;
      CREATE INDEX ON (.entity_type);
      CREATE PROPERTY metadata: std::json;
  };
  ALTER TYPE portal_communication::FormSubmission {
      CREATE LINK form_context: portal_communication::FormContext;
      CREATE INDEX ON (.form_context);
      CREATE PROPERTY context_entity_id: std::uuid;
      CREATE PROPERTY context_type: std::str;
      CREATE CONSTRAINT std::expression ON ((EXISTS (.context_type) = EXISTS (.context_entity_id)));
      CREATE INDEX ON (.context_type);
      CREATE INDEX ON (.context_entity_id);
      CREATE LINK performance_review: performance::PerformanceReview;
      CREATE PROPERTY has_context := ((EXISTS (.context_type) AND EXISTS (.context_entity_id)));
      CREATE PROPERTY context_display := ((((.context_type ++ ':') ++ <std::str>.context_entity_id) IF .has_context ELSE 'standalone'));
      CREATE PROPERTY context_metadata: std::json;
  };
  CREATE TYPE portal_communication::FormVersion EXTENDING default::Auditable {
      CREATE REQUIRED LINK form: portal_communication::Form;
      CREATE REQUIRED PROPERTY version_number: std::int32;
      CREATE CONSTRAINT std::exclusive ON ((.form, .version_number));
      CREATE INDEX ON (.form);
      CREATE INDEX ON (.version_number);
      CREATE LINK created_by: rbac::User;
      CREATE PROPERTY change_description: std::str;
      CREATE REQUIRED PROPERTY schema_snapshot: std::json;
  };
};
