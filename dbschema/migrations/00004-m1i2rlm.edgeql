CREATE MIGRATION m1i2rlmpnuz2pylgvlgo5w5qxhnces7cdnkw4x366mmlsxltzmmpia
    ONTO m155dc5jgsp2v2iadbvahdjvdrdxtvg5ntas742imazbaxzf2vhvfa
{
  ALTER TYPE recruitment::Interview {
      CREATE MULTI LINK interviewers: rbac::User;
  };
  ALTER TYPE recruitment::Interview {
      DROP PROPERTY interviewer_ids;
  };
};
