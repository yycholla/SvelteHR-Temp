CREATE MIGRATION m1ebtvhvtryfzotxdcrkdm7cdra6w2bugwsvpnrqnonntdntc72z5a
    ONTO m1i2rlmpnuz2pylgvlgo5w5qxhnces7cdnkw4x366mmlsxltzmmpia
{
  ALTER TYPE rbac::User {
      ALTER PROPERTY job_title {
          RESET EXPRESSION;
          RESET CARDINALITY;
          RESET OPTIONALITY;
          SET TYPE std::str;
      };
  };
};
