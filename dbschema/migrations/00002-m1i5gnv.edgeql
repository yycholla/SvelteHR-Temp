CREATE MIGRATION m1i5gnv77rzbx7eotsh73qcl7jdvmz2znibymrh4yynmhzs3jmbzpa
    ONTO m1u4kzlaaqpcs2duvawbjibc2ly5mho3idjtv4ro7pzacbdxr6peea
{
  ALTER TYPE default::JobInformation {
      CREATE LINK manager: rbac::User;
  };
  ALTER TYPE default::JobInformation {
      DROP PROPERTY reports_to;
  };
  ALTER TYPE default::Permission {
      DROP PROPERTY action;
      DROP PROPERTY description;
      DROP PROPERTY name;
      DROP PROPERTY resource;
  };
  ALTER TYPE default::Role {
      DROP PROPERTY permission_count;
      DROP LINK permissions;
      DROP PROPERTY description;
      DROP PROPERTY name;
  };
  DROP TYPE default::Permission;
  ALTER TYPE performance::ReviewTemplate {
      ALTER LINK roles {
          SET TYPE rbac::Role USING (<rbac::Role>{});
      };
  };
  DROP TYPE default::Role;
};
