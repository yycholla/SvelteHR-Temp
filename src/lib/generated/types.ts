export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  bank_account_type: { input: any; output: any; }
  bigint: { input: any; output: any; }
  date: { input: string; output: string; }
  inet: { input: any; output: any; }
  json: { input: any; output: any; }
  jsonb: { input: any; output: any; }
  numeric: { input: number; output: number; }
  onboarding_status: { input: any; output: any; }
  pay_type: { input: any; output: any; }
  timestamptz: { input: string; output: string; }
  uuid: { input: string; output: string; }
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _gt?: InputMaybe<Scalars['Boolean']['input']>;
  _gte?: InputMaybe<Scalars['Boolean']['input']>;
  _in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Boolean']['input']>;
  _lte?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
  _nin?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "audit_log" */
export type Audit_Log = {
  __typename: 'audit_log';
  id: Scalars['uuid']['output'];
  ip_address: Maybe<Scalars['inet']['output']>;
  new_data: Maybe<Scalars['jsonb']['output']>;
  old_data: Maybe<Scalars['jsonb']['output']>;
  operation: Scalars['String']['output'];
  table_name: Scalars['String']['output'];
  timestamp: Maybe<Scalars['timestamptz']['output']>;
  user_agent: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};


/** columns and relationships of "audit_log" */
export type Audit_LogNew_DataArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "audit_log" */
export type Audit_LogOld_DataArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "audit_log" */
export type Audit_Log_Aggregate = {
  __typename: 'audit_log_aggregate';
  aggregate: Maybe<Audit_Log_Aggregate_Fields>;
  nodes: Array<Audit_Log>;
};

/** aggregate fields of "audit_log" */
export type Audit_Log_Aggregate_Fields = {
  __typename: 'audit_log_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Audit_Log_Max_Fields>;
  min: Maybe<Audit_Log_Min_Fields>;
};


/** aggregate fields of "audit_log" */
export type Audit_Log_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Audit_Log_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Audit_Log_Append_Input = {
  new_data?: InputMaybe<Scalars['jsonb']['input']>;
  old_data?: InputMaybe<Scalars['jsonb']['input']>;
};

/** Boolean expression to filter rows from the table "audit_log". All fields are combined with a logical 'AND'. */
export type Audit_Log_Bool_Exp = {
  _and?: InputMaybe<Array<Audit_Log_Bool_Exp>>;
  _not?: InputMaybe<Audit_Log_Bool_Exp>;
  _or?: InputMaybe<Array<Audit_Log_Bool_Exp>>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  ip_address?: InputMaybe<Inet_Comparison_Exp>;
  new_data?: InputMaybe<Jsonb_Comparison_Exp>;
  old_data?: InputMaybe<Jsonb_Comparison_Exp>;
  operation?: InputMaybe<String_Comparison_Exp>;
  table_name?: InputMaybe<String_Comparison_Exp>;
  timestamp?: InputMaybe<Timestamptz_Comparison_Exp>;
  user_agent?: InputMaybe<String_Comparison_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "audit_log" */
export type Audit_Log_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'audit_log_pkey';

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Audit_Log_Delete_At_Path_Input = {
  new_data?: InputMaybe<Array<Scalars['String']['input']>>;
  old_data?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Audit_Log_Delete_Elem_Input = {
  new_data?: InputMaybe<Scalars['Int']['input']>;
  old_data?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Audit_Log_Delete_Key_Input = {
  new_data?: InputMaybe<Scalars['String']['input']>;
  old_data?: InputMaybe<Scalars['String']['input']>;
};

/** input type for inserting data into table "audit_log" */
export type Audit_Log_Insert_Input = {
  id?: InputMaybe<Scalars['uuid']['input']>;
  ip_address?: InputMaybe<Scalars['inet']['input']>;
  new_data?: InputMaybe<Scalars['jsonb']['input']>;
  old_data?: InputMaybe<Scalars['jsonb']['input']>;
  operation?: InputMaybe<Scalars['String']['input']>;
  table_name?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['timestamptz']['input']>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Audit_Log_Max_Fields = {
  __typename: 'audit_log_max_fields';
  id: Maybe<Scalars['uuid']['output']>;
  operation: Maybe<Scalars['String']['output']>;
  table_name: Maybe<Scalars['String']['output']>;
  timestamp: Maybe<Scalars['timestamptz']['output']>;
  user_agent: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Audit_Log_Min_Fields = {
  __typename: 'audit_log_min_fields';
  id: Maybe<Scalars['uuid']['output']>;
  operation: Maybe<Scalars['String']['output']>;
  table_name: Maybe<Scalars['String']['output']>;
  timestamp: Maybe<Scalars['timestamptz']['output']>;
  user_agent: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "audit_log" */
export type Audit_Log_Mutation_Response = {
  __typename: 'audit_log_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Audit_Log>;
};

/** on_conflict condition type for table "audit_log" */
export type Audit_Log_On_Conflict = {
  constraint: Audit_Log_Constraint;
  update_columns?: Array<Audit_Log_Update_Column>;
  where?: InputMaybe<Audit_Log_Bool_Exp>;
};

/** Ordering options when selecting data from "audit_log". */
export type Audit_Log_Order_By = {
  id?: InputMaybe<Order_By>;
  ip_address?: InputMaybe<Order_By>;
  new_data?: InputMaybe<Order_By>;
  old_data?: InputMaybe<Order_By>;
  operation?: InputMaybe<Order_By>;
  table_name?: InputMaybe<Order_By>;
  timestamp?: InputMaybe<Order_By>;
  user_agent?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: audit_log */
export type Audit_Log_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Audit_Log_Prepend_Input = {
  new_data?: InputMaybe<Scalars['jsonb']['input']>;
  old_data?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "audit_log" */
export type Audit_Log_Select_Column =
  /** column name */
  | 'id'
  /** column name */
  | 'ip_address'
  /** column name */
  | 'new_data'
  /** column name */
  | 'old_data'
  /** column name */
  | 'operation'
  /** column name */
  | 'table_name'
  /** column name */
  | 'timestamp'
  /** column name */
  | 'user_agent'
  /** column name */
  | 'user_id';

/** input type for updating data in table "audit_log" */
export type Audit_Log_Set_Input = {
  id?: InputMaybe<Scalars['uuid']['input']>;
  ip_address?: InputMaybe<Scalars['inet']['input']>;
  new_data?: InputMaybe<Scalars['jsonb']['input']>;
  old_data?: InputMaybe<Scalars['jsonb']['input']>;
  operation?: InputMaybe<Scalars['String']['input']>;
  table_name?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['timestamptz']['input']>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "audit_log" */
export type Audit_Log_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Audit_Log_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Audit_Log_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['uuid']['input']>;
  ip_address?: InputMaybe<Scalars['inet']['input']>;
  new_data?: InputMaybe<Scalars['jsonb']['input']>;
  old_data?: InputMaybe<Scalars['jsonb']['input']>;
  operation?: InputMaybe<Scalars['String']['input']>;
  table_name?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['timestamptz']['input']>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "audit_log" */
export type Audit_Log_Update_Column =
  /** column name */
  | 'id'
  /** column name */
  | 'ip_address'
  /** column name */
  | 'new_data'
  /** column name */
  | 'old_data'
  /** column name */
  | 'operation'
  /** column name */
  | 'table_name'
  /** column name */
  | 'timestamp'
  /** column name */
  | 'user_agent'
  /** column name */
  | 'user_id';

export type Audit_Log_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Audit_Log_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Audit_Log_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Audit_Log_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Audit_Log_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Audit_Log_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Audit_Log_Set_Input>;
  /** filter the rows which have to be updated */
  where: Audit_Log_Bool_Exp;
};

/** columns and relationships of "auth_sessions" */
export type Auth_Sessions = {
  __typename: 'auth_sessions';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Scalars['timestamptz']['output'];
  id: Scalars['uuid']['output'];
  ip_address: Maybe<Scalars['inet']['output']>;
  is_active: Maybe<Scalars['Boolean']['output']>;
  refresh_token_hash: Maybe<Scalars['String']['output']>;
  token_hash: Scalars['String']['output'];
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  user_agent: Maybe<Scalars['String']['output']>;
  user_id: Scalars['uuid']['output'];
};

/** aggregated selection of "auth_sessions" */
export type Auth_Sessions_Aggregate = {
  __typename: 'auth_sessions_aggregate';
  aggregate: Maybe<Auth_Sessions_Aggregate_Fields>;
  nodes: Array<Auth_Sessions>;
};

/** aggregate fields of "auth_sessions" */
export type Auth_Sessions_Aggregate_Fields = {
  __typename: 'auth_sessions_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Auth_Sessions_Max_Fields>;
  min: Maybe<Auth_Sessions_Min_Fields>;
};


/** aggregate fields of "auth_sessions" */
export type Auth_Sessions_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Auth_Sessions_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "auth_sessions". All fields are combined with a logical 'AND'. */
export type Auth_Sessions_Bool_Exp = {
  _and?: InputMaybe<Array<Auth_Sessions_Bool_Exp>>;
  _not?: InputMaybe<Auth_Sessions_Bool_Exp>;
  _or?: InputMaybe<Array<Auth_Sessions_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  expires_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  ip_address?: InputMaybe<Inet_Comparison_Exp>;
  is_active?: InputMaybe<Boolean_Comparison_Exp>;
  refresh_token_hash?: InputMaybe<String_Comparison_Exp>;
  token_hash?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  user_agent?: InputMaybe<String_Comparison_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "auth_sessions" */
export type Auth_Sessions_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'auth_sessions_pkey'
  /** unique or primary key constraint on columns "token_hash" */
  | 'auth_sessions_token_hash_key';

/** input type for inserting data into table "auth_sessions" */
export type Auth_Sessions_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  ip_address?: InputMaybe<Scalars['inet']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  refresh_token_hash?: InputMaybe<Scalars['String']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Auth_Sessions_Max_Fields = {
  __typename: 'auth_sessions_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  refresh_token_hash: Maybe<Scalars['String']['output']>;
  token_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  user_agent: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Auth_Sessions_Min_Fields = {
  __typename: 'auth_sessions_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  refresh_token_hash: Maybe<Scalars['String']['output']>;
  token_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  user_agent: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "auth_sessions" */
export type Auth_Sessions_Mutation_Response = {
  __typename: 'auth_sessions_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Auth_Sessions>;
};

/** on_conflict condition type for table "auth_sessions" */
export type Auth_Sessions_On_Conflict = {
  constraint: Auth_Sessions_Constraint;
  update_columns?: Array<Auth_Sessions_Update_Column>;
  where?: InputMaybe<Auth_Sessions_Bool_Exp>;
};

/** Ordering options when selecting data from "auth_sessions". */
export type Auth_Sessions_Order_By = {
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  ip_address?: InputMaybe<Order_By>;
  is_active?: InputMaybe<Order_By>;
  refresh_token_hash?: InputMaybe<Order_By>;
  token_hash?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user_agent?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: auth_sessions */
export type Auth_Sessions_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "auth_sessions" */
export type Auth_Sessions_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'ip_address'
  /** column name */
  | 'is_active'
  /** column name */
  | 'refresh_token_hash'
  /** column name */
  | 'token_hash'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'user_agent'
  /** column name */
  | 'user_id';

/** input type for updating data in table "auth_sessions" */
export type Auth_Sessions_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  ip_address?: InputMaybe<Scalars['inet']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  refresh_token_hash?: InputMaybe<Scalars['String']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "auth_sessions" */
export type Auth_Sessions_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Auth_Sessions_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Auth_Sessions_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  ip_address?: InputMaybe<Scalars['inet']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  refresh_token_hash?: InputMaybe<Scalars['String']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  user_agent?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "auth_sessions" */
export type Auth_Sessions_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'ip_address'
  /** column name */
  | 'is_active'
  /** column name */
  | 'refresh_token_hash'
  /** column name */
  | 'token_hash'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'user_agent'
  /** column name */
  | 'user_id';

export type Auth_Sessions_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Auth_Sessions_Set_Input>;
  /** filter the rows which have to be updated */
  where: Auth_Sessions_Bool_Exp;
};

/** Boolean expression to compare columns of type "bank_account_type". All fields are combined with logical 'AND'. */
export type Bank_Account_Type_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bank_account_type']['input']>;
  _gt?: InputMaybe<Scalars['bank_account_type']['input']>;
  _gte?: InputMaybe<Scalars['bank_account_type']['input']>;
  _in?: InputMaybe<Array<Scalars['bank_account_type']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['bank_account_type']['input']>;
  _lte?: InputMaybe<Scalars['bank_account_type']['input']>;
  _neq?: InputMaybe<Scalars['bank_account_type']['input']>;
  _nin?: InputMaybe<Array<Scalars['bank_account_type']['input']>>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bigint']['input']>;
  _gt?: InputMaybe<Scalars['bigint']['input']>;
  _gte?: InputMaybe<Scalars['bigint']['input']>;
  _in?: InputMaybe<Array<Scalars['bigint']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['bigint']['input']>;
  _lte?: InputMaybe<Scalars['bigint']['input']>;
  _neq?: InputMaybe<Scalars['bigint']['input']>;
  _nin?: InputMaybe<Array<Scalars['bigint']['input']>>;
};

/** columns and relationships of "compensation" */
export type Compensation = {
  __typename: 'compensation';
  bank_account_number: Maybe<Scalars['String']['output']>;
  bank_account_type: Maybe<Scalars['bank_account_type']['output']>;
  bank_name: Maybe<Scalars['String']['output']>;
  bank_routing_number: Maybe<Scalars['String']['output']>;
  bonus_eligible: Maybe<Scalars['Boolean']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  currency: Maybe<Scalars['String']['output']>;
  direct_deposit_enabled: Maybe<Scalars['Boolean']['output']>;
  employee_id: Scalars['uuid']['output'];
  id: Scalars['uuid']['output'];
  overtime_eligible: Maybe<Scalars['Boolean']['output']>;
  pay_rate: Maybe<Scalars['numeric']['output']>;
  pay_type: Maybe<Scalars['pay_type']['output']>;
  salary_review_date: Maybe<Scalars['date']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregated selection of "compensation" */
export type Compensation_Aggregate = {
  __typename: 'compensation_aggregate';
  aggregate: Maybe<Compensation_Aggregate_Fields>;
  nodes: Array<Compensation>;
};

/** aggregate fields of "compensation" */
export type Compensation_Aggregate_Fields = {
  __typename: 'compensation_aggregate_fields';
  avg: Maybe<Compensation_Avg_Fields>;
  count: Scalars['Int']['output'];
  max: Maybe<Compensation_Max_Fields>;
  min: Maybe<Compensation_Min_Fields>;
  stddev: Maybe<Compensation_Stddev_Fields>;
  stddev_pop: Maybe<Compensation_Stddev_Pop_Fields>;
  stddev_samp: Maybe<Compensation_Stddev_Samp_Fields>;
  sum: Maybe<Compensation_Sum_Fields>;
  var_pop: Maybe<Compensation_Var_Pop_Fields>;
  var_samp: Maybe<Compensation_Var_Samp_Fields>;
  variance: Maybe<Compensation_Variance_Fields>;
};


/** aggregate fields of "compensation" */
export type Compensation_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Compensation_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Compensation_Avg_Fields = {
  __typename: 'compensation_avg_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "compensation". All fields are combined with a logical 'AND'. */
export type Compensation_Bool_Exp = {
  _and?: InputMaybe<Array<Compensation_Bool_Exp>>;
  _not?: InputMaybe<Compensation_Bool_Exp>;
  _or?: InputMaybe<Array<Compensation_Bool_Exp>>;
  bank_account_number?: InputMaybe<String_Comparison_Exp>;
  bank_account_type?: InputMaybe<Bank_Account_Type_Comparison_Exp>;
  bank_name?: InputMaybe<String_Comparison_Exp>;
  bank_routing_number?: InputMaybe<String_Comparison_Exp>;
  bonus_eligible?: InputMaybe<Boolean_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  currency?: InputMaybe<String_Comparison_Exp>;
  direct_deposit_enabled?: InputMaybe<Boolean_Comparison_Exp>;
  employee_id?: InputMaybe<Uuid_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  overtime_eligible?: InputMaybe<Boolean_Comparison_Exp>;
  pay_rate?: InputMaybe<Numeric_Comparison_Exp>;
  pay_type?: InputMaybe<Pay_Type_Comparison_Exp>;
  salary_review_date?: InputMaybe<Date_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "compensation" */
export type Compensation_Constraint =
  /** unique or primary key constraint on columns "employee_id" */
  | 'compensation_employee_id_key'
  /** unique or primary key constraint on columns "id" */
  | 'compensation_pkey';

/** input type for incrementing numeric columns in table "compensation" */
export type Compensation_Inc_Input = {
  pay_rate?: InputMaybe<Scalars['numeric']['input']>;
};

/** input type for inserting data into table "compensation" */
export type Compensation_Insert_Input = {
  bank_account_number?: InputMaybe<Scalars['String']['input']>;
  bank_account_type?: InputMaybe<Scalars['bank_account_type']['input']>;
  bank_name?: InputMaybe<Scalars['String']['input']>;
  bank_routing_number?: InputMaybe<Scalars['String']['input']>;
  bonus_eligible?: InputMaybe<Scalars['Boolean']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  direct_deposit_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  overtime_eligible?: InputMaybe<Scalars['Boolean']['input']>;
  pay_rate?: InputMaybe<Scalars['numeric']['input']>;
  pay_type?: InputMaybe<Scalars['pay_type']['input']>;
  salary_review_date?: InputMaybe<Scalars['date']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate max on columns */
export type Compensation_Max_Fields = {
  __typename: 'compensation_max_fields';
  bank_account_number: Maybe<Scalars['String']['output']>;
  bank_account_type: Maybe<Scalars['bank_account_type']['output']>;
  bank_name: Maybe<Scalars['String']['output']>;
  bank_routing_number: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  currency: Maybe<Scalars['String']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  pay_rate: Maybe<Scalars['numeric']['output']>;
  pay_type: Maybe<Scalars['pay_type']['output']>;
  salary_review_date: Maybe<Scalars['date']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type Compensation_Min_Fields = {
  __typename: 'compensation_min_fields';
  bank_account_number: Maybe<Scalars['String']['output']>;
  bank_account_type: Maybe<Scalars['bank_account_type']['output']>;
  bank_name: Maybe<Scalars['String']['output']>;
  bank_routing_number: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  currency: Maybe<Scalars['String']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  pay_rate: Maybe<Scalars['numeric']['output']>;
  pay_type: Maybe<Scalars['pay_type']['output']>;
  salary_review_date: Maybe<Scalars['date']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** response of any mutation on the table "compensation" */
export type Compensation_Mutation_Response = {
  __typename: 'compensation_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Compensation>;
};

/** input type for inserting object relation for remote table "compensation" */
export type Compensation_Obj_Rel_Insert_Input = {
  data: Compensation_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Compensation_On_Conflict>;
};

/** on_conflict condition type for table "compensation" */
export type Compensation_On_Conflict = {
  constraint: Compensation_Constraint;
  update_columns?: Array<Compensation_Update_Column>;
  where?: InputMaybe<Compensation_Bool_Exp>;
};

/** Ordering options when selecting data from "compensation". */
export type Compensation_Order_By = {
  bank_account_number?: InputMaybe<Order_By>;
  bank_account_type?: InputMaybe<Order_By>;
  bank_name?: InputMaybe<Order_By>;
  bank_routing_number?: InputMaybe<Order_By>;
  bonus_eligible?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  currency?: InputMaybe<Order_By>;
  direct_deposit_enabled?: InputMaybe<Order_By>;
  employee_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  overtime_eligible?: InputMaybe<Order_By>;
  pay_rate?: InputMaybe<Order_By>;
  pay_type?: InputMaybe<Order_By>;
  salary_review_date?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: compensation */
export type Compensation_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "compensation" */
export type Compensation_Select_Column =
  /** column name */
  | 'bank_account_number'
  /** column name */
  | 'bank_account_type'
  /** column name */
  | 'bank_name'
  /** column name */
  | 'bank_routing_number'
  /** column name */
  | 'bonus_eligible'
  /** column name */
  | 'created_at'
  /** column name */
  | 'currency'
  /** column name */
  | 'direct_deposit_enabled'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'id'
  /** column name */
  | 'overtime_eligible'
  /** column name */
  | 'pay_rate'
  /** column name */
  | 'pay_type'
  /** column name */
  | 'salary_review_date'
  /** column name */
  | 'updated_at';

/** input type for updating data in table "compensation" */
export type Compensation_Set_Input = {
  bank_account_number?: InputMaybe<Scalars['String']['input']>;
  bank_account_type?: InputMaybe<Scalars['bank_account_type']['input']>;
  bank_name?: InputMaybe<Scalars['String']['input']>;
  bank_routing_number?: InputMaybe<Scalars['String']['input']>;
  bonus_eligible?: InputMaybe<Scalars['Boolean']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  direct_deposit_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  overtime_eligible?: InputMaybe<Scalars['Boolean']['input']>;
  pay_rate?: InputMaybe<Scalars['numeric']['input']>;
  pay_type?: InputMaybe<Scalars['pay_type']['input']>;
  salary_review_date?: InputMaybe<Scalars['date']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate stddev on columns */
export type Compensation_Stddev_Fields = {
  __typename: 'compensation_stddev_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Compensation_Stddev_Pop_Fields = {
  __typename: 'compensation_stddev_pop_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Compensation_Stddev_Samp_Fields = {
  __typename: 'compensation_stddev_samp_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "compensation" */
export type Compensation_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Compensation_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Compensation_Stream_Cursor_Value_Input = {
  bank_account_number?: InputMaybe<Scalars['String']['input']>;
  bank_account_type?: InputMaybe<Scalars['bank_account_type']['input']>;
  bank_name?: InputMaybe<Scalars['String']['input']>;
  bank_routing_number?: InputMaybe<Scalars['String']['input']>;
  bonus_eligible?: InputMaybe<Scalars['Boolean']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  direct_deposit_enabled?: InputMaybe<Scalars['Boolean']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  overtime_eligible?: InputMaybe<Scalars['Boolean']['input']>;
  pay_rate?: InputMaybe<Scalars['numeric']['input']>;
  pay_type?: InputMaybe<Scalars['pay_type']['input']>;
  salary_review_date?: InputMaybe<Scalars['date']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate sum on columns */
export type Compensation_Sum_Fields = {
  __typename: 'compensation_sum_fields';
  pay_rate: Maybe<Scalars['numeric']['output']>;
};

/** update columns of table "compensation" */
export type Compensation_Update_Column =
  /** column name */
  | 'bank_account_number'
  /** column name */
  | 'bank_account_type'
  /** column name */
  | 'bank_name'
  /** column name */
  | 'bank_routing_number'
  /** column name */
  | 'bonus_eligible'
  /** column name */
  | 'created_at'
  /** column name */
  | 'currency'
  /** column name */
  | 'direct_deposit_enabled'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'id'
  /** column name */
  | 'overtime_eligible'
  /** column name */
  | 'pay_rate'
  /** column name */
  | 'pay_type'
  /** column name */
  | 'salary_review_date'
  /** column name */
  | 'updated_at';

export type Compensation_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Compensation_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Compensation_Set_Input>;
  /** filter the rows which have to be updated */
  where: Compensation_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Compensation_Var_Pop_Fields = {
  __typename: 'compensation_var_pop_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Compensation_Var_Samp_Fields = {
  __typename: 'compensation_var_samp_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Compensation_Variance_Fields = {
  __typename: 'compensation_variance_fields';
  pay_rate: Maybe<Scalars['Float']['output']>;
};

/** columns and relationships of "contact_information" */
export type Contact_Information = {
  __typename: 'contact_information';
  address_city: Maybe<Scalars['String']['output']>;
  address_state: Maybe<Scalars['String']['output']>;
  address_street: Maybe<Scalars['String']['output']>;
  address_zip: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  email: Maybe<Scalars['String']['output']>;
  emergency_contact_name: Maybe<Scalars['String']['output']>;
  emergency_contact_phone: Maybe<Scalars['String']['output']>;
  emergency_contact_relationship: Maybe<Scalars['String']['output']>;
  employee_id: Scalars['uuid']['output'];
  id: Scalars['uuid']['output'];
  phone_number: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  work_phone_number: Maybe<Scalars['String']['output']>;
};

/** aggregated selection of "contact_information" */
export type Contact_Information_Aggregate = {
  __typename: 'contact_information_aggregate';
  aggregate: Maybe<Contact_Information_Aggregate_Fields>;
  nodes: Array<Contact_Information>;
};

/** aggregate fields of "contact_information" */
export type Contact_Information_Aggregate_Fields = {
  __typename: 'contact_information_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Contact_Information_Max_Fields>;
  min: Maybe<Contact_Information_Min_Fields>;
};


/** aggregate fields of "contact_information" */
export type Contact_Information_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Contact_Information_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "contact_information". All fields are combined with a logical 'AND'. */
export type Contact_Information_Bool_Exp = {
  _and?: InputMaybe<Array<Contact_Information_Bool_Exp>>;
  _not?: InputMaybe<Contact_Information_Bool_Exp>;
  _or?: InputMaybe<Array<Contact_Information_Bool_Exp>>;
  address_city?: InputMaybe<String_Comparison_Exp>;
  address_state?: InputMaybe<String_Comparison_Exp>;
  address_street?: InputMaybe<String_Comparison_Exp>;
  address_zip?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  email?: InputMaybe<String_Comparison_Exp>;
  emergency_contact_name?: InputMaybe<String_Comparison_Exp>;
  emergency_contact_phone?: InputMaybe<String_Comparison_Exp>;
  emergency_contact_relationship?: InputMaybe<String_Comparison_Exp>;
  employee_id?: InputMaybe<Uuid_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  phone_number?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  work_phone_number?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "contact_information" */
export type Contact_Information_Constraint =
  /** unique or primary key constraint on columns "email" */
  | 'contact_information_email_key'
  /** unique or primary key constraint on columns "employee_id" */
  | 'contact_information_employee_id_key'
  /** unique or primary key constraint on columns "id" */
  | 'contact_information_pkey';

/** input type for inserting data into table "contact_information" */
export type Contact_Information_Insert_Input = {
  address_city?: InputMaybe<Scalars['String']['input']>;
  address_state?: InputMaybe<Scalars['String']['input']>;
  address_street?: InputMaybe<Scalars['String']['input']>;
  address_zip?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_name?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_phone?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_relationship?: InputMaybe<Scalars['String']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  work_phone_number?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Contact_Information_Max_Fields = {
  __typename: 'contact_information_max_fields';
  address_city: Maybe<Scalars['String']['output']>;
  address_state: Maybe<Scalars['String']['output']>;
  address_street: Maybe<Scalars['String']['output']>;
  address_zip: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  email: Maybe<Scalars['String']['output']>;
  emergency_contact_name: Maybe<Scalars['String']['output']>;
  emergency_contact_phone: Maybe<Scalars['String']['output']>;
  emergency_contact_relationship: Maybe<Scalars['String']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  phone_number: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  work_phone_number: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Contact_Information_Min_Fields = {
  __typename: 'contact_information_min_fields';
  address_city: Maybe<Scalars['String']['output']>;
  address_state: Maybe<Scalars['String']['output']>;
  address_street: Maybe<Scalars['String']['output']>;
  address_zip: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  email: Maybe<Scalars['String']['output']>;
  emergency_contact_name: Maybe<Scalars['String']['output']>;
  emergency_contact_phone: Maybe<Scalars['String']['output']>;
  emergency_contact_relationship: Maybe<Scalars['String']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  phone_number: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  work_phone_number: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "contact_information" */
export type Contact_Information_Mutation_Response = {
  __typename: 'contact_information_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Contact_Information>;
};

/** input type for inserting object relation for remote table "contact_information" */
export type Contact_Information_Obj_Rel_Insert_Input = {
  data: Contact_Information_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Contact_Information_On_Conflict>;
};

/** on_conflict condition type for table "contact_information" */
export type Contact_Information_On_Conflict = {
  constraint: Contact_Information_Constraint;
  update_columns?: Array<Contact_Information_Update_Column>;
  where?: InputMaybe<Contact_Information_Bool_Exp>;
};

/** Ordering options when selecting data from "contact_information". */
export type Contact_Information_Order_By = {
  address_city?: InputMaybe<Order_By>;
  address_state?: InputMaybe<Order_By>;
  address_street?: InputMaybe<Order_By>;
  address_zip?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  email?: InputMaybe<Order_By>;
  emergency_contact_name?: InputMaybe<Order_By>;
  emergency_contact_phone?: InputMaybe<Order_By>;
  emergency_contact_relationship?: InputMaybe<Order_By>;
  employee_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  phone_number?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  work_phone_number?: InputMaybe<Order_By>;
};

/** primary key columns input for table: contact_information */
export type Contact_Information_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "contact_information" */
export type Contact_Information_Select_Column =
  /** column name */
  | 'address_city'
  /** column name */
  | 'address_state'
  /** column name */
  | 'address_street'
  /** column name */
  | 'address_zip'
  /** column name */
  | 'created_at'
  /** column name */
  | 'email'
  /** column name */
  | 'emergency_contact_name'
  /** column name */
  | 'emergency_contact_phone'
  /** column name */
  | 'emergency_contact_relationship'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'id'
  /** column name */
  | 'phone_number'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'work_phone_number';

/** input type for updating data in table "contact_information" */
export type Contact_Information_Set_Input = {
  address_city?: InputMaybe<Scalars['String']['input']>;
  address_state?: InputMaybe<Scalars['String']['input']>;
  address_street?: InputMaybe<Scalars['String']['input']>;
  address_zip?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_name?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_phone?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_relationship?: InputMaybe<Scalars['String']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  work_phone_number?: InputMaybe<Scalars['String']['input']>;
};

/** Streaming cursor of the table "contact_information" */
export type Contact_Information_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Contact_Information_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Contact_Information_Stream_Cursor_Value_Input = {
  address_city?: InputMaybe<Scalars['String']['input']>;
  address_state?: InputMaybe<Scalars['String']['input']>;
  address_street?: InputMaybe<Scalars['String']['input']>;
  address_zip?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_name?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_phone?: InputMaybe<Scalars['String']['input']>;
  emergency_contact_relationship?: InputMaybe<Scalars['String']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  phone_number?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  work_phone_number?: InputMaybe<Scalars['String']['input']>;
};

/** update columns of table "contact_information" */
export type Contact_Information_Update_Column =
  /** column name */
  | 'address_city'
  /** column name */
  | 'address_state'
  /** column name */
  | 'address_street'
  /** column name */
  | 'address_zip'
  /** column name */
  | 'created_at'
  /** column name */
  | 'email'
  /** column name */
  | 'emergency_contact_name'
  /** column name */
  | 'emergency_contact_phone'
  /** column name */
  | 'emergency_contact_relationship'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'id'
  /** column name */
  | 'phone_number'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'work_phone_number';

export type Contact_Information_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Contact_Information_Set_Input>;
  /** filter the rows which have to be updated */
  where: Contact_Information_Bool_Exp;
};

/** ordering argument of a cursor */
export type Cursor_Ordering =
  /** ascending ordering of the cursor */
  | 'ASC'
  /** descending ordering of the cursor */
  | 'DESC';

/** Boolean expression to compare columns of type "date". All fields are combined with logical 'AND'. */
export type Date_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['date']['input']>;
  _gt?: InputMaybe<Scalars['date']['input']>;
  _gte?: InputMaybe<Scalars['date']['input']>;
  _in?: InputMaybe<Array<Scalars['date']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['date']['input']>;
  _lte?: InputMaybe<Scalars['date']['input']>;
  _neq?: InputMaybe<Scalars['date']['input']>;
  _nin?: InputMaybe<Array<Scalars['date']['input']>>;
};

/** columns and relationships of "departments" */
export type Departments = {
  __typename: 'departments';
  budget: Maybe<Scalars['numeric']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  /** An array relationship */
  employees: Array<Job_Information>;
  /** An aggregate relationship */
  employees_aggregate: Job_Information_Aggregate;
  id: Scalars['uuid']['output'];
  is_active: Maybe<Scalars['Boolean']['output']>;
  /** An object relationship */
  manager: Maybe<Users>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  name: Scalars['String']['output'];
  /** An object relationship */
  parent_department: Maybe<Departments>;
  parent_department_id: Maybe<Scalars['uuid']['output']>;
  /** An array relationship */
  subdepartments: Array<Departments>;
  /** An aggregate relationship */
  subdepartments_aggregate: Departments_Aggregate;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};


/** columns and relationships of "departments" */
export type DepartmentsEmployeesArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


/** columns and relationships of "departments" */
export type DepartmentsEmployees_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


/** columns and relationships of "departments" */
export type DepartmentsSubdepartmentsArgs = {
  distinct_on?: InputMaybe<Array<Departments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_Order_By>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};


/** columns and relationships of "departments" */
export type DepartmentsSubdepartments_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Departments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_Order_By>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};

/** aggregated selection of "departments" */
export type Departments_Aggregate = {
  __typename: 'departments_aggregate';
  aggregate: Maybe<Departments_Aggregate_Fields>;
  nodes: Array<Departments>;
};

export type Departments_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<Departments_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<Departments_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<Departments_Aggregate_Bool_Exp_Count>;
};

export type Departments_Aggregate_Bool_Exp_Bool_And = {
  arguments: Departments_Select_Column_Departments_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Departments_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Departments_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Departments_Select_Column_Departments_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Departments_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Departments_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Departments_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Departments_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "departments" */
export type Departments_Aggregate_Fields = {
  __typename: 'departments_aggregate_fields';
  avg: Maybe<Departments_Avg_Fields>;
  count: Scalars['Int']['output'];
  max: Maybe<Departments_Max_Fields>;
  min: Maybe<Departments_Min_Fields>;
  stddev: Maybe<Departments_Stddev_Fields>;
  stddev_pop: Maybe<Departments_Stddev_Pop_Fields>;
  stddev_samp: Maybe<Departments_Stddev_Samp_Fields>;
  sum: Maybe<Departments_Sum_Fields>;
  var_pop: Maybe<Departments_Var_Pop_Fields>;
  var_samp: Maybe<Departments_Var_Samp_Fields>;
  variance: Maybe<Departments_Variance_Fields>;
};


/** aggregate fields of "departments" */
export type Departments_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Departments_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "departments" */
export type Departments_Aggregate_Order_By = {
  avg?: InputMaybe<Departments_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Departments_Max_Order_By>;
  min?: InputMaybe<Departments_Min_Order_By>;
  stddev?: InputMaybe<Departments_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Departments_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Departments_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Departments_Sum_Order_By>;
  var_pop?: InputMaybe<Departments_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Departments_Var_Samp_Order_By>;
  variance?: InputMaybe<Departments_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "departments" */
export type Departments_Arr_Rel_Insert_Input = {
  data: Array<Departments_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Departments_On_Conflict>;
};

/** aggregate avg on columns */
export type Departments_Avg_Fields = {
  __typename: 'departments_avg_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by avg() on columns of table "departments" */
export type Departments_Avg_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "departments". All fields are combined with a logical 'AND'. */
export type Departments_Bool_Exp = {
  _and?: InputMaybe<Array<Departments_Bool_Exp>>;
  _not?: InputMaybe<Departments_Bool_Exp>;
  _or?: InputMaybe<Array<Departments_Bool_Exp>>;
  budget?: InputMaybe<Numeric_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  employees?: InputMaybe<Job_Information_Bool_Exp>;
  employees_aggregate?: InputMaybe<Job_Information_Aggregate_Bool_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_active?: InputMaybe<Boolean_Comparison_Exp>;
  manager?: InputMaybe<Users_Bool_Exp>;
  manager_id?: InputMaybe<Uuid_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  parent_department?: InputMaybe<Departments_Bool_Exp>;
  parent_department_id?: InputMaybe<Uuid_Comparison_Exp>;
  subdepartments?: InputMaybe<Departments_Bool_Exp>;
  subdepartments_aggregate?: InputMaybe<Departments_Aggregate_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "departments" */
export type Departments_Constraint =
  /** unique or primary key constraint on columns "name" */
  | 'departments_name_key'
  /** unique or primary key constraint on columns "id" */
  | 'departments_pkey';

/** input type for incrementing numeric columns in table "departments" */
export type Departments_Inc_Input = {
  budget?: InputMaybe<Scalars['numeric']['input']>;
};

/** input type for inserting data into table "departments" */
export type Departments_Insert_Input = {
  budget?: InputMaybe<Scalars['numeric']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  employees?: InputMaybe<Job_Information_Arr_Rel_Insert_Input>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  manager?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parent_department?: InputMaybe<Departments_Obj_Rel_Insert_Input>;
  parent_department_id?: InputMaybe<Scalars['uuid']['input']>;
  subdepartments?: InputMaybe<Departments_Arr_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate max on columns */
export type Departments_Max_Fields = {
  __typename: 'departments_max_fields';
  budget: Maybe<Scalars['numeric']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  name: Maybe<Scalars['String']['output']>;
  parent_department_id: Maybe<Scalars['uuid']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** order by max() on columns of table "departments" */
export type Departments_Max_Order_By = {
  budget?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  manager_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  parent_department_id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Departments_Min_Fields = {
  __typename: 'departments_min_fields';
  budget: Maybe<Scalars['numeric']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  name: Maybe<Scalars['String']['output']>;
  parent_department_id: Maybe<Scalars['uuid']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** order by min() on columns of table "departments" */
export type Departments_Min_Order_By = {
  budget?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  manager_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  parent_department_id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "departments" */
export type Departments_Mutation_Response = {
  __typename: 'departments_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Departments>;
};

/** input type for inserting object relation for remote table "departments" */
export type Departments_Obj_Rel_Insert_Input = {
  data: Departments_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Departments_On_Conflict>;
};

/** on_conflict condition type for table "departments" */
export type Departments_On_Conflict = {
  constraint: Departments_Constraint;
  update_columns?: Array<Departments_Update_Column>;
  where?: InputMaybe<Departments_Bool_Exp>;
};

/** Ordering options when selecting data from "departments". */
export type Departments_Order_By = {
  budget?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  employees_aggregate?: InputMaybe<Job_Information_Aggregate_Order_By>;
  id?: InputMaybe<Order_By>;
  is_active?: InputMaybe<Order_By>;
  manager?: InputMaybe<Users_Order_By>;
  manager_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  parent_department?: InputMaybe<Departments_Order_By>;
  parent_department_id?: InputMaybe<Order_By>;
  subdepartments_aggregate?: InputMaybe<Departments_Aggregate_Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: departments */
export type Departments_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "departments" */
export type Departments_Select_Column =
  /** column name */
  | 'budget'
  /** column name */
  | 'created_at'
  /** column name */
  | 'description'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'manager_id'
  /** column name */
  | 'name'
  /** column name */
  | 'parent_department_id'
  /** column name */
  | 'updated_at';

/** select "departments_aggregate_bool_exp_bool_and_arguments_columns" columns of table "departments" */
export type Departments_Select_Column_Departments_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'is_active';

/** select "departments_aggregate_bool_exp_bool_or_arguments_columns" columns of table "departments" */
export type Departments_Select_Column_Departments_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'is_active';

/** input type for updating data in table "departments" */
export type Departments_Set_Input = {
  budget?: InputMaybe<Scalars['numeric']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parent_department_id?: InputMaybe<Scalars['uuid']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate stddev on columns */
export type Departments_Stddev_Fields = {
  __typename: 'departments_stddev_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by stddev() on columns of table "departments" */
export type Departments_Stddev_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Departments_Stddev_Pop_Fields = {
  __typename: 'departments_stddev_pop_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_pop() on columns of table "departments" */
export type Departments_Stddev_Pop_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Departments_Stddev_Samp_Fields = {
  __typename: 'departments_stddev_samp_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_samp() on columns of table "departments" */
export type Departments_Stddev_Samp_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "departments" */
export type Departments_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Departments_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Departments_Stream_Cursor_Value_Input = {
  budget?: InputMaybe<Scalars['numeric']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parent_department_id?: InputMaybe<Scalars['uuid']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate sum on columns */
export type Departments_Sum_Fields = {
  __typename: 'departments_sum_fields';
  budget: Maybe<Scalars['numeric']['output']>;
};

/** order by sum() on columns of table "departments" */
export type Departments_Sum_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** update columns of table "departments" */
export type Departments_Update_Column =
  /** column name */
  | 'budget'
  /** column name */
  | 'created_at'
  /** column name */
  | 'description'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'manager_id'
  /** column name */
  | 'name'
  /** column name */
  | 'parent_department_id'
  /** column name */
  | 'updated_at';

export type Departments_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Departments_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Departments_Set_Input>;
  /** filter the rows which have to be updated */
  where: Departments_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Departments_Var_Pop_Fields = {
  __typename: 'departments_var_pop_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by var_pop() on columns of table "departments" */
export type Departments_Var_Pop_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Departments_Var_Samp_Fields = {
  __typename: 'departments_var_samp_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by var_samp() on columns of table "departments" */
export type Departments_Var_Samp_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Departments_Variance_Fields = {
  __typename: 'departments_variance_fields';
  budget: Maybe<Scalars['Float']['output']>;
};

/** order by variance() on columns of table "departments" */
export type Departments_Variance_Order_By = {
  budget?: InputMaybe<Order_By>;
};

/** columns and relationships of "departments_with_stats" */
export type Departments_With_Stats = {
  __typename: 'departments_with_stats';
  active_employee_count: Maybe<Scalars['bigint']['output']>;
  budget: Maybe<Scalars['numeric']['output']>;
  budget_per_employee: Maybe<Scalars['numeric']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  employee_count: Maybe<Scalars['bigint']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  is_active: Maybe<Scalars['Boolean']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  name: Maybe<Scalars['String']['output']>;
  parent_department_id: Maybe<Scalars['uuid']['output']>;
  subdepartment_count: Maybe<Scalars['bigint']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregated selection of "departments_with_stats" */
export type Departments_With_Stats_Aggregate = {
  __typename: 'departments_with_stats_aggregate';
  aggregate: Maybe<Departments_With_Stats_Aggregate_Fields>;
  nodes: Array<Departments_With_Stats>;
};

/** aggregate fields of "departments_with_stats" */
export type Departments_With_Stats_Aggregate_Fields = {
  __typename: 'departments_with_stats_aggregate_fields';
  avg: Maybe<Departments_With_Stats_Avg_Fields>;
  count: Scalars['Int']['output'];
  max: Maybe<Departments_With_Stats_Max_Fields>;
  min: Maybe<Departments_With_Stats_Min_Fields>;
  stddev: Maybe<Departments_With_Stats_Stddev_Fields>;
  stddev_pop: Maybe<Departments_With_Stats_Stddev_Pop_Fields>;
  stddev_samp: Maybe<Departments_With_Stats_Stddev_Samp_Fields>;
  sum: Maybe<Departments_With_Stats_Sum_Fields>;
  var_pop: Maybe<Departments_With_Stats_Var_Pop_Fields>;
  var_samp: Maybe<Departments_With_Stats_Var_Samp_Fields>;
  variance: Maybe<Departments_With_Stats_Variance_Fields>;
};


/** aggregate fields of "departments_with_stats" */
export type Departments_With_Stats_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Departments_With_Stats_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Departments_With_Stats_Avg_Fields = {
  __typename: 'departments_with_stats_avg_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "departments_with_stats". All fields are combined with a logical 'AND'. */
export type Departments_With_Stats_Bool_Exp = {
  _and?: InputMaybe<Array<Departments_With_Stats_Bool_Exp>>;
  _not?: InputMaybe<Departments_With_Stats_Bool_Exp>;
  _or?: InputMaybe<Array<Departments_With_Stats_Bool_Exp>>;
  active_employee_count?: InputMaybe<Bigint_Comparison_Exp>;
  budget?: InputMaybe<Numeric_Comparison_Exp>;
  budget_per_employee?: InputMaybe<Numeric_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  employee_count?: InputMaybe<Bigint_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_active?: InputMaybe<Boolean_Comparison_Exp>;
  manager_id?: InputMaybe<Uuid_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  parent_department_id?: InputMaybe<Uuid_Comparison_Exp>;
  subdepartment_count?: InputMaybe<Bigint_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** aggregate max on columns */
export type Departments_With_Stats_Max_Fields = {
  __typename: 'departments_with_stats_max_fields';
  active_employee_count: Maybe<Scalars['bigint']['output']>;
  budget: Maybe<Scalars['numeric']['output']>;
  budget_per_employee: Maybe<Scalars['numeric']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  employee_count: Maybe<Scalars['bigint']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  name: Maybe<Scalars['String']['output']>;
  parent_department_id: Maybe<Scalars['uuid']['output']>;
  subdepartment_count: Maybe<Scalars['bigint']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type Departments_With_Stats_Min_Fields = {
  __typename: 'departments_with_stats_min_fields';
  active_employee_count: Maybe<Scalars['bigint']['output']>;
  budget: Maybe<Scalars['numeric']['output']>;
  budget_per_employee: Maybe<Scalars['numeric']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  employee_count: Maybe<Scalars['bigint']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  name: Maybe<Scalars['String']['output']>;
  parent_department_id: Maybe<Scalars['uuid']['output']>;
  subdepartment_count: Maybe<Scalars['bigint']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** Ordering options when selecting data from "departments_with_stats". */
export type Departments_With_Stats_Order_By = {
  active_employee_count?: InputMaybe<Order_By>;
  budget?: InputMaybe<Order_By>;
  budget_per_employee?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  employee_count?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_active?: InputMaybe<Order_By>;
  manager_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  parent_department_id?: InputMaybe<Order_By>;
  subdepartment_count?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** select columns of table "departments_with_stats" */
export type Departments_With_Stats_Select_Column =
  /** column name */
  | 'active_employee_count'
  /** column name */
  | 'budget'
  /** column name */
  | 'budget_per_employee'
  /** column name */
  | 'created_at'
  /** column name */
  | 'description'
  /** column name */
  | 'employee_count'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'manager_id'
  /** column name */
  | 'name'
  /** column name */
  | 'parent_department_id'
  /** column name */
  | 'subdepartment_count'
  /** column name */
  | 'updated_at';

/** aggregate stddev on columns */
export type Departments_With_Stats_Stddev_Fields = {
  __typename: 'departments_with_stats_stddev_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Departments_With_Stats_Stddev_Pop_Fields = {
  __typename: 'departments_with_stats_stddev_pop_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Departments_With_Stats_Stddev_Samp_Fields = {
  __typename: 'departments_with_stats_stddev_samp_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "departments_with_stats" */
export type Departments_With_Stats_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Departments_With_Stats_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Departments_With_Stats_Stream_Cursor_Value_Input = {
  active_employee_count?: InputMaybe<Scalars['bigint']['input']>;
  budget?: InputMaybe<Scalars['numeric']['input']>;
  budget_per_employee?: InputMaybe<Scalars['numeric']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  employee_count?: InputMaybe<Scalars['bigint']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parent_department_id?: InputMaybe<Scalars['uuid']['input']>;
  subdepartment_count?: InputMaybe<Scalars['bigint']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate sum on columns */
export type Departments_With_Stats_Sum_Fields = {
  __typename: 'departments_with_stats_sum_fields';
  active_employee_count: Maybe<Scalars['bigint']['output']>;
  budget: Maybe<Scalars['numeric']['output']>;
  budget_per_employee: Maybe<Scalars['numeric']['output']>;
  employee_count: Maybe<Scalars['bigint']['output']>;
  subdepartment_count: Maybe<Scalars['bigint']['output']>;
};

/** aggregate var_pop on columns */
export type Departments_With_Stats_Var_Pop_Fields = {
  __typename: 'departments_with_stats_var_pop_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Departments_With_Stats_Var_Samp_Fields = {
  __typename: 'departments_with_stats_var_samp_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Departments_With_Stats_Variance_Fields = {
  __typename: 'departments_with_stats_variance_fields';
  active_employee_count: Maybe<Scalars['Float']['output']>;
  budget: Maybe<Scalars['Float']['output']>;
  budget_per_employee: Maybe<Scalars['Float']['output']>;
  employee_count: Maybe<Scalars['Float']['output']>;
  subdepartment_count: Maybe<Scalars['Float']['output']>;
};

/** columns and relationships of "email_verification_tokens" */
export type Email_Verification_Tokens = {
  __typename: 'email_verification_tokens';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Scalars['timestamptz']['output'];
  id: Scalars['uuid']['output'];
  is_used: Maybe<Scalars['Boolean']['output']>;
  token_hash: Scalars['String']['output'];
  user_id: Scalars['uuid']['output'];
};

/** aggregated selection of "email_verification_tokens" */
export type Email_Verification_Tokens_Aggregate = {
  __typename: 'email_verification_tokens_aggregate';
  aggregate: Maybe<Email_Verification_Tokens_Aggregate_Fields>;
  nodes: Array<Email_Verification_Tokens>;
};

/** aggregate fields of "email_verification_tokens" */
export type Email_Verification_Tokens_Aggregate_Fields = {
  __typename: 'email_verification_tokens_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Email_Verification_Tokens_Max_Fields>;
  min: Maybe<Email_Verification_Tokens_Min_Fields>;
};


/** aggregate fields of "email_verification_tokens" */
export type Email_Verification_Tokens_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Email_Verification_Tokens_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "email_verification_tokens". All fields are combined with a logical 'AND'. */
export type Email_Verification_Tokens_Bool_Exp = {
  _and?: InputMaybe<Array<Email_Verification_Tokens_Bool_Exp>>;
  _not?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
  _or?: InputMaybe<Array<Email_Verification_Tokens_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  expires_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_used?: InputMaybe<Boolean_Comparison_Exp>;
  token_hash?: InputMaybe<String_Comparison_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "email_verification_tokens" */
export type Email_Verification_Tokens_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'email_verification_tokens_pkey'
  /** unique or primary key constraint on columns "token_hash" */
  | 'email_verification_tokens_token_hash_key';

/** input type for inserting data into table "email_verification_tokens" */
export type Email_Verification_Tokens_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_used?: InputMaybe<Scalars['Boolean']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Email_Verification_Tokens_Max_Fields = {
  __typename: 'email_verification_tokens_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  token_hash: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Email_Verification_Tokens_Min_Fields = {
  __typename: 'email_verification_tokens_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  token_hash: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "email_verification_tokens" */
export type Email_Verification_Tokens_Mutation_Response = {
  __typename: 'email_verification_tokens_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Email_Verification_Tokens>;
};

/** on_conflict condition type for table "email_verification_tokens" */
export type Email_Verification_Tokens_On_Conflict = {
  constraint: Email_Verification_Tokens_Constraint;
  update_columns?: Array<Email_Verification_Tokens_Update_Column>;
  where?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
};

/** Ordering options when selecting data from "email_verification_tokens". */
export type Email_Verification_Tokens_Order_By = {
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_used?: InputMaybe<Order_By>;
  token_hash?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: email_verification_tokens */
export type Email_Verification_Tokens_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "email_verification_tokens" */
export type Email_Verification_Tokens_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'is_used'
  /** column name */
  | 'token_hash'
  /** column name */
  | 'user_id';

/** input type for updating data in table "email_verification_tokens" */
export type Email_Verification_Tokens_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_used?: InputMaybe<Scalars['Boolean']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "email_verification_tokens" */
export type Email_Verification_Tokens_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Email_Verification_Tokens_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Email_Verification_Tokens_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_used?: InputMaybe<Scalars['Boolean']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "email_verification_tokens" */
export type Email_Verification_Tokens_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'is_used'
  /** column name */
  | 'token_hash'
  /** column name */
  | 'user_id';

export type Email_Verification_Tokens_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Email_Verification_Tokens_Set_Input>;
  /** filter the rows which have to be updated */
  where: Email_Verification_Tokens_Bool_Exp;
};

/** Boolean expression to compare columns of type "inet". All fields are combined with logical 'AND'. */
export type Inet_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['inet']['input']>;
  _gt?: InputMaybe<Scalars['inet']['input']>;
  _gte?: InputMaybe<Scalars['inet']['input']>;
  _in?: InputMaybe<Array<Scalars['inet']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['inet']['input']>;
  _lte?: InputMaybe<Scalars['inet']['input']>;
  _neq?: InputMaybe<Scalars['inet']['input']>;
  _nin?: InputMaybe<Array<Scalars['inet']['input']>>;
};

/** columns and relationships of "job_information" */
export type Job_Information = {
  __typename: 'job_information';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  /** An object relationship */
  department: Maybe<Departments>;
  department_id: Maybe<Scalars['uuid']['output']>;
  /** An object relationship */
  employee: Users;
  employee_id: Scalars['uuid']['output'];
  employment_type: Maybe<Scalars['String']['output']>;
  hire_date: Maybe<Scalars['date']['output']>;
  id: Scalars['uuid']['output'];
  is_remote: Maybe<Scalars['Boolean']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  termination_date: Maybe<Scalars['date']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  work_location: Maybe<Scalars['String']['output']>;
  work_schedule: Maybe<Scalars['String']['output']>;
};

/** aggregated selection of "job_information" */
export type Job_Information_Aggregate = {
  __typename: 'job_information_aggregate';
  aggregate: Maybe<Job_Information_Aggregate_Fields>;
  nodes: Array<Job_Information>;
};

export type Job_Information_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<Job_Information_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<Job_Information_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<Job_Information_Aggregate_Bool_Exp_Count>;
};

export type Job_Information_Aggregate_Bool_Exp_Bool_And = {
  arguments: Job_Information_Select_Column_Job_Information_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Job_Information_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Job_Information_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Job_Information_Select_Column_Job_Information_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Job_Information_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Job_Information_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Job_Information_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Job_Information_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "job_information" */
export type Job_Information_Aggregate_Fields = {
  __typename: 'job_information_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Job_Information_Max_Fields>;
  min: Maybe<Job_Information_Min_Fields>;
};


/** aggregate fields of "job_information" */
export type Job_Information_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Job_Information_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "job_information" */
export type Job_Information_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Job_Information_Max_Order_By>;
  min?: InputMaybe<Job_Information_Min_Order_By>;
};

/** input type for inserting array relation for remote table "job_information" */
export type Job_Information_Arr_Rel_Insert_Input = {
  data: Array<Job_Information_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Job_Information_On_Conflict>;
};

/** Boolean expression to filter rows from the table "job_information". All fields are combined with a logical 'AND'. */
export type Job_Information_Bool_Exp = {
  _and?: InputMaybe<Array<Job_Information_Bool_Exp>>;
  _not?: InputMaybe<Job_Information_Bool_Exp>;
  _or?: InputMaybe<Array<Job_Information_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  department?: InputMaybe<Departments_Bool_Exp>;
  department_id?: InputMaybe<Uuid_Comparison_Exp>;
  employee?: InputMaybe<Users_Bool_Exp>;
  employee_id?: InputMaybe<Uuid_Comparison_Exp>;
  employment_type?: InputMaybe<String_Comparison_Exp>;
  hire_date?: InputMaybe<Date_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_remote?: InputMaybe<Boolean_Comparison_Exp>;
  job_title?: InputMaybe<String_Comparison_Exp>;
  manager_id?: InputMaybe<Uuid_Comparison_Exp>;
  termination_date?: InputMaybe<Date_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  work_location?: InputMaybe<String_Comparison_Exp>;
  work_schedule?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "job_information" */
export type Job_Information_Constraint =
  /** unique or primary key constraint on columns "employee_id" */
  | 'job_information_employee_id_key'
  /** unique or primary key constraint on columns "id" */
  | 'job_information_pkey';

/** input type for inserting data into table "job_information" */
export type Job_Information_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  department?: InputMaybe<Departments_Obj_Rel_Insert_Input>;
  department_id?: InputMaybe<Scalars['uuid']['input']>;
  employee?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  employment_type?: InputMaybe<Scalars['String']['input']>;
  hire_date?: InputMaybe<Scalars['date']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_remote?: InputMaybe<Scalars['Boolean']['input']>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  termination_date?: InputMaybe<Scalars['date']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  work_location?: InputMaybe<Scalars['String']['input']>;
  work_schedule?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Job_Information_Max_Fields = {
  __typename: 'job_information_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  department_id: Maybe<Scalars['uuid']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  employment_type: Maybe<Scalars['String']['output']>;
  hire_date: Maybe<Scalars['date']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  termination_date: Maybe<Scalars['date']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  work_location: Maybe<Scalars['String']['output']>;
  work_schedule: Maybe<Scalars['String']['output']>;
};

/** order by max() on columns of table "job_information" */
export type Job_Information_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  department_id?: InputMaybe<Order_By>;
  employee_id?: InputMaybe<Order_By>;
  employment_type?: InputMaybe<Order_By>;
  hire_date?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_title?: InputMaybe<Order_By>;
  manager_id?: InputMaybe<Order_By>;
  termination_date?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  work_location?: InputMaybe<Order_By>;
  work_schedule?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Job_Information_Min_Fields = {
  __typename: 'job_information_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  department_id: Maybe<Scalars['uuid']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  employment_type: Maybe<Scalars['String']['output']>;
  hire_date: Maybe<Scalars['date']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  manager_id: Maybe<Scalars['uuid']['output']>;
  termination_date: Maybe<Scalars['date']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  work_location: Maybe<Scalars['String']['output']>;
  work_schedule: Maybe<Scalars['String']['output']>;
};

/** order by min() on columns of table "job_information" */
export type Job_Information_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  department_id?: InputMaybe<Order_By>;
  employee_id?: InputMaybe<Order_By>;
  employment_type?: InputMaybe<Order_By>;
  hire_date?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_title?: InputMaybe<Order_By>;
  manager_id?: InputMaybe<Order_By>;
  termination_date?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  work_location?: InputMaybe<Order_By>;
  work_schedule?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "job_information" */
export type Job_Information_Mutation_Response = {
  __typename: 'job_information_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Job_Information>;
};

/** on_conflict condition type for table "job_information" */
export type Job_Information_On_Conflict = {
  constraint: Job_Information_Constraint;
  update_columns?: Array<Job_Information_Update_Column>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};

/** Ordering options when selecting data from "job_information". */
export type Job_Information_Order_By = {
  created_at?: InputMaybe<Order_By>;
  department?: InputMaybe<Departments_Order_By>;
  department_id?: InputMaybe<Order_By>;
  employee?: InputMaybe<Users_Order_By>;
  employee_id?: InputMaybe<Order_By>;
  employment_type?: InputMaybe<Order_By>;
  hire_date?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_remote?: InputMaybe<Order_By>;
  job_title?: InputMaybe<Order_By>;
  manager_id?: InputMaybe<Order_By>;
  termination_date?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  work_location?: InputMaybe<Order_By>;
  work_schedule?: InputMaybe<Order_By>;
};

/** primary key columns input for table: job_information */
export type Job_Information_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "job_information" */
export type Job_Information_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'department_id'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'employment_type'
  /** column name */
  | 'hire_date'
  /** column name */
  | 'id'
  /** column name */
  | 'is_remote'
  /** column name */
  | 'job_title'
  /** column name */
  | 'manager_id'
  /** column name */
  | 'termination_date'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'work_location'
  /** column name */
  | 'work_schedule';

/** select "job_information_aggregate_bool_exp_bool_and_arguments_columns" columns of table "job_information" */
export type Job_Information_Select_Column_Job_Information_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'is_remote';

/** select "job_information_aggregate_bool_exp_bool_or_arguments_columns" columns of table "job_information" */
export type Job_Information_Select_Column_Job_Information_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'is_remote';

/** input type for updating data in table "job_information" */
export type Job_Information_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  department_id?: InputMaybe<Scalars['uuid']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  employment_type?: InputMaybe<Scalars['String']['input']>;
  hire_date?: InputMaybe<Scalars['date']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_remote?: InputMaybe<Scalars['Boolean']['input']>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  termination_date?: InputMaybe<Scalars['date']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  work_location?: InputMaybe<Scalars['String']['input']>;
  work_schedule?: InputMaybe<Scalars['String']['input']>;
};

/** Streaming cursor of the table "job_information" */
export type Job_Information_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Job_Information_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Job_Information_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  department_id?: InputMaybe<Scalars['uuid']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  employment_type?: InputMaybe<Scalars['String']['input']>;
  hire_date?: InputMaybe<Scalars['date']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_remote?: InputMaybe<Scalars['Boolean']['input']>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  manager_id?: InputMaybe<Scalars['uuid']['input']>;
  termination_date?: InputMaybe<Scalars['date']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  work_location?: InputMaybe<Scalars['String']['input']>;
  work_schedule?: InputMaybe<Scalars['String']['input']>;
};

/** update columns of table "job_information" */
export type Job_Information_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'department_id'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'employment_type'
  /** column name */
  | 'hire_date'
  /** column name */
  | 'id'
  /** column name */
  | 'is_remote'
  /** column name */
  | 'job_title'
  /** column name */
  | 'manager_id'
  /** column name */
  | 'termination_date'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'work_location'
  /** column name */
  | 'work_schedule';

export type Job_Information_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Job_Information_Set_Input>;
  /** filter the rows which have to be updated */
  where: Job_Information_Bool_Exp;
};

/** Boolean expression to compare columns of type "json". All fields are combined with logical 'AND'. */
export type Json_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['json']['input']>;
  _gt?: InputMaybe<Scalars['json']['input']>;
  _gte?: InputMaybe<Scalars['json']['input']>;
  _in?: InputMaybe<Array<Scalars['json']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['json']['input']>;
  _lte?: InputMaybe<Scalars['json']['input']>;
  _neq?: InputMaybe<Scalars['json']['input']>;
  _nin?: InputMaybe<Array<Scalars['json']['input']>>;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']['input']>;
  _eq?: InputMaybe<Scalars['jsonb']['input']>;
  _gt?: InputMaybe<Scalars['jsonb']['input']>;
  _gte?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']['input']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']['input']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['jsonb']['input']>;
  _lte?: InputMaybe<Scalars['jsonb']['input']>;
  _neq?: InputMaybe<Scalars['jsonb']['input']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']['input']>>;
};

/** mutation root */
export type Mutation_Root = {
  __typename: 'mutation_root';
  /** delete data from the table: "audit_log" */
  delete_audit_log: Maybe<Audit_Log_Mutation_Response>;
  /** delete single row from the table: "audit_log" */
  delete_audit_log_by_pk: Maybe<Audit_Log>;
  /** delete data from the table: "auth_sessions" */
  delete_auth_sessions: Maybe<Auth_Sessions_Mutation_Response>;
  /** delete single row from the table: "auth_sessions" */
  delete_auth_sessions_by_pk: Maybe<Auth_Sessions>;
  /** delete data from the table: "compensation" */
  delete_compensation: Maybe<Compensation_Mutation_Response>;
  /** delete single row from the table: "compensation" */
  delete_compensation_by_pk: Maybe<Compensation>;
  /** delete data from the table: "contact_information" */
  delete_contact_information: Maybe<Contact_Information_Mutation_Response>;
  /** delete single row from the table: "contact_information" */
  delete_contact_information_by_pk: Maybe<Contact_Information>;
  /** delete data from the table: "departments" */
  delete_departments: Maybe<Departments_Mutation_Response>;
  /** delete single row from the table: "departments" */
  delete_departments_by_pk: Maybe<Departments>;
  /** delete data from the table: "email_verification_tokens" */
  delete_email_verification_tokens: Maybe<Email_Verification_Tokens_Mutation_Response>;
  /** delete single row from the table: "email_verification_tokens" */
  delete_email_verification_tokens_by_pk: Maybe<Email_Verification_Tokens>;
  /** delete data from the table: "job_information" */
  delete_job_information: Maybe<Job_Information_Mutation_Response>;
  /** delete single row from the table: "job_information" */
  delete_job_information_by_pk: Maybe<Job_Information>;
  /** delete data from the table: "oauth_connections" */
  delete_oauth_connections: Maybe<Oauth_Connections_Mutation_Response>;
  /** delete single row from the table: "oauth_connections" */
  delete_oauth_connections_by_pk: Maybe<Oauth_Connections>;
  /** delete data from the table: "password_reset_tokens" */
  delete_password_reset_tokens: Maybe<Password_Reset_Tokens_Mutation_Response>;
  /** delete single row from the table: "password_reset_tokens" */
  delete_password_reset_tokens_by_pk: Maybe<Password_Reset_Tokens>;
  /** delete data from the table: "personal_information" */
  delete_personal_information: Maybe<Personal_Information_Mutation_Response>;
  /** delete single row from the table: "personal_information" */
  delete_personal_information_by_pk: Maybe<Personal_Information>;
  /** delete data from the table: "user_role_assignments" */
  delete_user_role_assignments: Maybe<User_Role_Assignments_Mutation_Response>;
  /** delete single row from the table: "user_role_assignments" */
  delete_user_role_assignments_by_pk: Maybe<User_Role_Assignments>;
  /** delete data from the table: "user_roles" */
  delete_user_roles: Maybe<User_Roles_Mutation_Response>;
  /** delete single row from the table: "user_roles" */
  delete_user_roles_by_pk: Maybe<User_Roles>;
  /** delete data from the table: "users" */
  delete_users: Maybe<Users_Mutation_Response>;
  /** delete single row from the table: "users" */
  delete_users_by_pk: Maybe<Users>;
  /** insert data into the table: "audit_log" */
  insert_audit_log: Maybe<Audit_Log_Mutation_Response>;
  /** insert a single row into the table: "audit_log" */
  insert_audit_log_one: Maybe<Audit_Log>;
  /** insert data into the table: "auth_sessions" */
  insert_auth_sessions: Maybe<Auth_Sessions_Mutation_Response>;
  /** insert a single row into the table: "auth_sessions" */
  insert_auth_sessions_one: Maybe<Auth_Sessions>;
  /** insert data into the table: "compensation" */
  insert_compensation: Maybe<Compensation_Mutation_Response>;
  /** insert a single row into the table: "compensation" */
  insert_compensation_one: Maybe<Compensation>;
  /** insert data into the table: "contact_information" */
  insert_contact_information: Maybe<Contact_Information_Mutation_Response>;
  /** insert a single row into the table: "contact_information" */
  insert_contact_information_one: Maybe<Contact_Information>;
  /** insert data into the table: "departments" */
  insert_departments: Maybe<Departments_Mutation_Response>;
  /** insert a single row into the table: "departments" */
  insert_departments_one: Maybe<Departments>;
  /** insert data into the table: "email_verification_tokens" */
  insert_email_verification_tokens: Maybe<Email_Verification_Tokens_Mutation_Response>;
  /** insert a single row into the table: "email_verification_tokens" */
  insert_email_verification_tokens_one: Maybe<Email_Verification_Tokens>;
  /** insert data into the table: "job_information" */
  insert_job_information: Maybe<Job_Information_Mutation_Response>;
  /** insert a single row into the table: "job_information" */
  insert_job_information_one: Maybe<Job_Information>;
  /** insert data into the table: "oauth_connections" */
  insert_oauth_connections: Maybe<Oauth_Connections_Mutation_Response>;
  /** insert a single row into the table: "oauth_connections" */
  insert_oauth_connections_one: Maybe<Oauth_Connections>;
  /** insert data into the table: "password_reset_tokens" */
  insert_password_reset_tokens: Maybe<Password_Reset_Tokens_Mutation_Response>;
  /** insert a single row into the table: "password_reset_tokens" */
  insert_password_reset_tokens_one: Maybe<Password_Reset_Tokens>;
  /** insert data into the table: "personal_information" */
  insert_personal_information: Maybe<Personal_Information_Mutation_Response>;
  /** insert a single row into the table: "personal_information" */
  insert_personal_information_one: Maybe<Personal_Information>;
  /** insert data into the table: "user_role_assignments" */
  insert_user_role_assignments: Maybe<User_Role_Assignments_Mutation_Response>;
  /** insert a single row into the table: "user_role_assignments" */
  insert_user_role_assignments_one: Maybe<User_Role_Assignments>;
  /** insert data into the table: "user_roles" */
  insert_user_roles: Maybe<User_Roles_Mutation_Response>;
  /** insert a single row into the table: "user_roles" */
  insert_user_roles_one: Maybe<User_Roles>;
  /** insert data into the table: "users" */
  insert_users: Maybe<Users_Mutation_Response>;
  /** insert a single row into the table: "users" */
  insert_users_one: Maybe<Users>;
  /** update data of the table: "audit_log" */
  update_audit_log: Maybe<Audit_Log_Mutation_Response>;
  /** update single row of the table: "audit_log" */
  update_audit_log_by_pk: Maybe<Audit_Log>;
  /** update multiples rows of table: "audit_log" */
  update_audit_log_many: Maybe<Array<Maybe<Audit_Log_Mutation_Response>>>;
  /** update data of the table: "auth_sessions" */
  update_auth_sessions: Maybe<Auth_Sessions_Mutation_Response>;
  /** update single row of the table: "auth_sessions" */
  update_auth_sessions_by_pk: Maybe<Auth_Sessions>;
  /** update multiples rows of table: "auth_sessions" */
  update_auth_sessions_many: Maybe<Array<Maybe<Auth_Sessions_Mutation_Response>>>;
  /** update data of the table: "compensation" */
  update_compensation: Maybe<Compensation_Mutation_Response>;
  /** update single row of the table: "compensation" */
  update_compensation_by_pk: Maybe<Compensation>;
  /** update multiples rows of table: "compensation" */
  update_compensation_many: Maybe<Array<Maybe<Compensation_Mutation_Response>>>;
  /** update data of the table: "contact_information" */
  update_contact_information: Maybe<Contact_Information_Mutation_Response>;
  /** update single row of the table: "contact_information" */
  update_contact_information_by_pk: Maybe<Contact_Information>;
  /** update multiples rows of table: "contact_information" */
  update_contact_information_many: Maybe<Array<Maybe<Contact_Information_Mutation_Response>>>;
  /** update data of the table: "departments" */
  update_departments: Maybe<Departments_Mutation_Response>;
  /** update single row of the table: "departments" */
  update_departments_by_pk: Maybe<Departments>;
  /** update multiples rows of table: "departments" */
  update_departments_many: Maybe<Array<Maybe<Departments_Mutation_Response>>>;
  /** update data of the table: "email_verification_tokens" */
  update_email_verification_tokens: Maybe<Email_Verification_Tokens_Mutation_Response>;
  /** update single row of the table: "email_verification_tokens" */
  update_email_verification_tokens_by_pk: Maybe<Email_Verification_Tokens>;
  /** update multiples rows of table: "email_verification_tokens" */
  update_email_verification_tokens_many: Maybe<Array<Maybe<Email_Verification_Tokens_Mutation_Response>>>;
  /** update data of the table: "job_information" */
  update_job_information: Maybe<Job_Information_Mutation_Response>;
  /** update single row of the table: "job_information" */
  update_job_information_by_pk: Maybe<Job_Information>;
  /** update multiples rows of table: "job_information" */
  update_job_information_many: Maybe<Array<Maybe<Job_Information_Mutation_Response>>>;
  /** update data of the table: "oauth_connections" */
  update_oauth_connections: Maybe<Oauth_Connections_Mutation_Response>;
  /** update single row of the table: "oauth_connections" */
  update_oauth_connections_by_pk: Maybe<Oauth_Connections>;
  /** update multiples rows of table: "oauth_connections" */
  update_oauth_connections_many: Maybe<Array<Maybe<Oauth_Connections_Mutation_Response>>>;
  /** update data of the table: "password_reset_tokens" */
  update_password_reset_tokens: Maybe<Password_Reset_Tokens_Mutation_Response>;
  /** update single row of the table: "password_reset_tokens" */
  update_password_reset_tokens_by_pk: Maybe<Password_Reset_Tokens>;
  /** update multiples rows of table: "password_reset_tokens" */
  update_password_reset_tokens_many: Maybe<Array<Maybe<Password_Reset_Tokens_Mutation_Response>>>;
  /** update data of the table: "personal_information" */
  update_personal_information: Maybe<Personal_Information_Mutation_Response>;
  /** update single row of the table: "personal_information" */
  update_personal_information_by_pk: Maybe<Personal_Information>;
  /** update multiples rows of table: "personal_information" */
  update_personal_information_many: Maybe<Array<Maybe<Personal_Information_Mutation_Response>>>;
  /** update data of the table: "user_role_assignments" */
  update_user_role_assignments: Maybe<User_Role_Assignments_Mutation_Response>;
  /** update single row of the table: "user_role_assignments" */
  update_user_role_assignments_by_pk: Maybe<User_Role_Assignments>;
  /** update multiples rows of table: "user_role_assignments" */
  update_user_role_assignments_many: Maybe<Array<Maybe<User_Role_Assignments_Mutation_Response>>>;
  /** update data of the table: "user_roles" */
  update_user_roles: Maybe<User_Roles_Mutation_Response>;
  /** update single row of the table: "user_roles" */
  update_user_roles_by_pk: Maybe<User_Roles>;
  /** update multiples rows of table: "user_roles" */
  update_user_roles_many: Maybe<Array<Maybe<User_Roles_Mutation_Response>>>;
  /** update data of the table: "users" */
  update_users: Maybe<Users_Mutation_Response>;
  /** update single row of the table: "users" */
  update_users_by_pk: Maybe<Users>;
  /** update multiples rows of table: "users" */
  update_users_many: Maybe<Array<Maybe<Users_Mutation_Response>>>;
};


/** mutation root */
export type Mutation_RootDelete_Audit_LogArgs = {
  where: Audit_Log_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Audit_Log_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Auth_SessionsArgs = {
  where: Auth_Sessions_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Auth_Sessions_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_CompensationArgs = {
  where: Compensation_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Compensation_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Contact_InformationArgs = {
  where: Contact_Information_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Contact_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_DepartmentsArgs = {
  where: Departments_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Departments_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Email_Verification_TokensArgs = {
  where: Email_Verification_Tokens_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Email_Verification_Tokens_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Job_InformationArgs = {
  where: Job_Information_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Job_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Oauth_ConnectionsArgs = {
  where: Oauth_Connections_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Oauth_Connections_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Password_Reset_TokensArgs = {
  where: Password_Reset_Tokens_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Password_Reset_Tokens_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Personal_InformationArgs = {
  where: Personal_Information_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Personal_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_User_Role_AssignmentsArgs = {
  where: User_Role_Assignments_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_User_Role_Assignments_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_User_RolesArgs = {
  where: User_Roles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_User_Roles_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_UsersArgs = {
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Users_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootInsert_Audit_LogArgs = {
  objects: Array<Audit_Log_Insert_Input>;
  on_conflict?: InputMaybe<Audit_Log_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Audit_Log_OneArgs = {
  object: Audit_Log_Insert_Input;
  on_conflict?: InputMaybe<Audit_Log_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Auth_SessionsArgs = {
  objects: Array<Auth_Sessions_Insert_Input>;
  on_conflict?: InputMaybe<Auth_Sessions_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Auth_Sessions_OneArgs = {
  object: Auth_Sessions_Insert_Input;
  on_conflict?: InputMaybe<Auth_Sessions_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_CompensationArgs = {
  objects: Array<Compensation_Insert_Input>;
  on_conflict?: InputMaybe<Compensation_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Compensation_OneArgs = {
  object: Compensation_Insert_Input;
  on_conflict?: InputMaybe<Compensation_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contact_InformationArgs = {
  objects: Array<Contact_Information_Insert_Input>;
  on_conflict?: InputMaybe<Contact_Information_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contact_Information_OneArgs = {
  object: Contact_Information_Insert_Input;
  on_conflict?: InputMaybe<Contact_Information_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_DepartmentsArgs = {
  objects: Array<Departments_Insert_Input>;
  on_conflict?: InputMaybe<Departments_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Departments_OneArgs = {
  object: Departments_Insert_Input;
  on_conflict?: InputMaybe<Departments_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Email_Verification_TokensArgs = {
  objects: Array<Email_Verification_Tokens_Insert_Input>;
  on_conflict?: InputMaybe<Email_Verification_Tokens_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Email_Verification_Tokens_OneArgs = {
  object: Email_Verification_Tokens_Insert_Input;
  on_conflict?: InputMaybe<Email_Verification_Tokens_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Job_InformationArgs = {
  objects: Array<Job_Information_Insert_Input>;
  on_conflict?: InputMaybe<Job_Information_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Job_Information_OneArgs = {
  object: Job_Information_Insert_Input;
  on_conflict?: InputMaybe<Job_Information_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Oauth_ConnectionsArgs = {
  objects: Array<Oauth_Connections_Insert_Input>;
  on_conflict?: InputMaybe<Oauth_Connections_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Oauth_Connections_OneArgs = {
  object: Oauth_Connections_Insert_Input;
  on_conflict?: InputMaybe<Oauth_Connections_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Password_Reset_TokensArgs = {
  objects: Array<Password_Reset_Tokens_Insert_Input>;
  on_conflict?: InputMaybe<Password_Reset_Tokens_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Password_Reset_Tokens_OneArgs = {
  object: Password_Reset_Tokens_Insert_Input;
  on_conflict?: InputMaybe<Password_Reset_Tokens_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Personal_InformationArgs = {
  objects: Array<Personal_Information_Insert_Input>;
  on_conflict?: InputMaybe<Personal_Information_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Personal_Information_OneArgs = {
  object: Personal_Information_Insert_Input;
  on_conflict?: InputMaybe<Personal_Information_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_User_Role_AssignmentsArgs = {
  objects: Array<User_Role_Assignments_Insert_Input>;
  on_conflict?: InputMaybe<User_Role_Assignments_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_User_Role_Assignments_OneArgs = {
  object: User_Role_Assignments_Insert_Input;
  on_conflict?: InputMaybe<User_Role_Assignments_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_User_RolesArgs = {
  objects: Array<User_Roles_Insert_Input>;
  on_conflict?: InputMaybe<User_Roles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_User_Roles_OneArgs = {
  object: User_Roles_Insert_Input;
  on_conflict?: InputMaybe<User_Roles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_UsersArgs = {
  objects: Array<Users_Insert_Input>;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_OneArgs = {
  object: Users_Insert_Input;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootUpdate_Audit_LogArgs = {
  _append?: InputMaybe<Audit_Log_Append_Input>;
  _delete_at_path?: InputMaybe<Audit_Log_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Audit_Log_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Audit_Log_Delete_Key_Input>;
  _prepend?: InputMaybe<Audit_Log_Prepend_Input>;
  _set?: InputMaybe<Audit_Log_Set_Input>;
  where: Audit_Log_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Audit_Log_By_PkArgs = {
  _append?: InputMaybe<Audit_Log_Append_Input>;
  _delete_at_path?: InputMaybe<Audit_Log_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Audit_Log_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Audit_Log_Delete_Key_Input>;
  _prepend?: InputMaybe<Audit_Log_Prepend_Input>;
  _set?: InputMaybe<Audit_Log_Set_Input>;
  pk_columns: Audit_Log_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Audit_Log_ManyArgs = {
  updates: Array<Audit_Log_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Auth_SessionsArgs = {
  _set?: InputMaybe<Auth_Sessions_Set_Input>;
  where: Auth_Sessions_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Auth_Sessions_By_PkArgs = {
  _set?: InputMaybe<Auth_Sessions_Set_Input>;
  pk_columns: Auth_Sessions_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Auth_Sessions_ManyArgs = {
  updates: Array<Auth_Sessions_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_CompensationArgs = {
  _inc?: InputMaybe<Compensation_Inc_Input>;
  _set?: InputMaybe<Compensation_Set_Input>;
  where: Compensation_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Compensation_By_PkArgs = {
  _inc?: InputMaybe<Compensation_Inc_Input>;
  _set?: InputMaybe<Compensation_Set_Input>;
  pk_columns: Compensation_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Compensation_ManyArgs = {
  updates: Array<Compensation_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Contact_InformationArgs = {
  _set?: InputMaybe<Contact_Information_Set_Input>;
  where: Contact_Information_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Contact_Information_By_PkArgs = {
  _set?: InputMaybe<Contact_Information_Set_Input>;
  pk_columns: Contact_Information_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Contact_Information_ManyArgs = {
  updates: Array<Contact_Information_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_DepartmentsArgs = {
  _inc?: InputMaybe<Departments_Inc_Input>;
  _set?: InputMaybe<Departments_Set_Input>;
  where: Departments_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Departments_By_PkArgs = {
  _inc?: InputMaybe<Departments_Inc_Input>;
  _set?: InputMaybe<Departments_Set_Input>;
  pk_columns: Departments_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Departments_ManyArgs = {
  updates: Array<Departments_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Email_Verification_TokensArgs = {
  _set?: InputMaybe<Email_Verification_Tokens_Set_Input>;
  where: Email_Verification_Tokens_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Email_Verification_Tokens_By_PkArgs = {
  _set?: InputMaybe<Email_Verification_Tokens_Set_Input>;
  pk_columns: Email_Verification_Tokens_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Email_Verification_Tokens_ManyArgs = {
  updates: Array<Email_Verification_Tokens_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Job_InformationArgs = {
  _set?: InputMaybe<Job_Information_Set_Input>;
  where: Job_Information_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Job_Information_By_PkArgs = {
  _set?: InputMaybe<Job_Information_Set_Input>;
  pk_columns: Job_Information_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Job_Information_ManyArgs = {
  updates: Array<Job_Information_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Oauth_ConnectionsArgs = {
  _set?: InputMaybe<Oauth_Connections_Set_Input>;
  where: Oauth_Connections_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Oauth_Connections_By_PkArgs = {
  _set?: InputMaybe<Oauth_Connections_Set_Input>;
  pk_columns: Oauth_Connections_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Oauth_Connections_ManyArgs = {
  updates: Array<Oauth_Connections_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Password_Reset_TokensArgs = {
  _set?: InputMaybe<Password_Reset_Tokens_Set_Input>;
  where: Password_Reset_Tokens_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Password_Reset_Tokens_By_PkArgs = {
  _set?: InputMaybe<Password_Reset_Tokens_Set_Input>;
  pk_columns: Password_Reset_Tokens_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Password_Reset_Tokens_ManyArgs = {
  updates: Array<Password_Reset_Tokens_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Personal_InformationArgs = {
  _set?: InputMaybe<Personal_Information_Set_Input>;
  where: Personal_Information_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Personal_Information_By_PkArgs = {
  _set?: InputMaybe<Personal_Information_Set_Input>;
  pk_columns: Personal_Information_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Personal_Information_ManyArgs = {
  updates: Array<Personal_Information_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_User_Role_AssignmentsArgs = {
  _set?: InputMaybe<User_Role_Assignments_Set_Input>;
  where: User_Role_Assignments_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_User_Role_Assignments_By_PkArgs = {
  _set?: InputMaybe<User_Role_Assignments_Set_Input>;
  pk_columns: User_Role_Assignments_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_User_Role_Assignments_ManyArgs = {
  updates: Array<User_Role_Assignments_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_User_RolesArgs = {
  _inc?: InputMaybe<User_Roles_Inc_Input>;
  _set?: InputMaybe<User_Roles_Set_Input>;
  where: User_Roles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_User_Roles_By_PkArgs = {
  _inc?: InputMaybe<User_Roles_Inc_Input>;
  _set?: InputMaybe<User_Roles_Set_Input>;
  pk_columns: User_Roles_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_User_Roles_ManyArgs = {
  updates: Array<User_Roles_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_UsersArgs = {
  _set?: InputMaybe<Users_Set_Input>;
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Users_By_PkArgs = {
  _set?: InputMaybe<Users_Set_Input>;
  pk_columns: Users_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Users_ManyArgs = {
  updates: Array<Users_Updates>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['numeric']['input']>;
  _gt?: InputMaybe<Scalars['numeric']['input']>;
  _gte?: InputMaybe<Scalars['numeric']['input']>;
  _in?: InputMaybe<Array<Scalars['numeric']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['numeric']['input']>;
  _lte?: InputMaybe<Scalars['numeric']['input']>;
  _neq?: InputMaybe<Scalars['numeric']['input']>;
  _nin?: InputMaybe<Array<Scalars['numeric']['input']>>;
};

/** columns and relationships of "oauth_connections" */
export type Oauth_Connections = {
  __typename: 'oauth_connections';
  access_token_hash: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Scalars['uuid']['output'];
  provider: Scalars['String']['output'];
  provider_email: Maybe<Scalars['String']['output']>;
  provider_name: Maybe<Scalars['String']['output']>;
  provider_user_id: Scalars['String']['output'];
  refresh_token_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  user_id: Scalars['uuid']['output'];
};

/** aggregated selection of "oauth_connections" */
export type Oauth_Connections_Aggregate = {
  __typename: 'oauth_connections_aggregate';
  aggregate: Maybe<Oauth_Connections_Aggregate_Fields>;
  nodes: Array<Oauth_Connections>;
};

/** aggregate fields of "oauth_connections" */
export type Oauth_Connections_Aggregate_Fields = {
  __typename: 'oauth_connections_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Oauth_Connections_Max_Fields>;
  min: Maybe<Oauth_Connections_Min_Fields>;
};


/** aggregate fields of "oauth_connections" */
export type Oauth_Connections_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Oauth_Connections_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "oauth_connections". All fields are combined with a logical 'AND'. */
export type Oauth_Connections_Bool_Exp = {
  _and?: InputMaybe<Array<Oauth_Connections_Bool_Exp>>;
  _not?: InputMaybe<Oauth_Connections_Bool_Exp>;
  _or?: InputMaybe<Array<Oauth_Connections_Bool_Exp>>;
  access_token_hash?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  expires_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  provider?: InputMaybe<String_Comparison_Exp>;
  provider_email?: InputMaybe<String_Comparison_Exp>;
  provider_name?: InputMaybe<String_Comparison_Exp>;
  provider_user_id?: InputMaybe<String_Comparison_Exp>;
  refresh_token_hash?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "oauth_connections" */
export type Oauth_Connections_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'oauth_connections_pkey'
  /** unique or primary key constraint on columns "provider", "provider_user_id" */
  | 'oauth_connections_provider_provider_user_id_key';

/** input type for inserting data into table "oauth_connections" */
export type Oauth_Connections_Insert_Input = {
  access_token_hash?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
  provider_email?: InputMaybe<Scalars['String']['input']>;
  provider_name?: InputMaybe<Scalars['String']['input']>;
  provider_user_id?: InputMaybe<Scalars['String']['input']>;
  refresh_token_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Oauth_Connections_Max_Fields = {
  __typename: 'oauth_connections_max_fields';
  access_token_hash: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  provider: Maybe<Scalars['String']['output']>;
  provider_email: Maybe<Scalars['String']['output']>;
  provider_name: Maybe<Scalars['String']['output']>;
  provider_user_id: Maybe<Scalars['String']['output']>;
  refresh_token_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Oauth_Connections_Min_Fields = {
  __typename: 'oauth_connections_min_fields';
  access_token_hash: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  provider: Maybe<Scalars['String']['output']>;
  provider_email: Maybe<Scalars['String']['output']>;
  provider_name: Maybe<Scalars['String']['output']>;
  provider_user_id: Maybe<Scalars['String']['output']>;
  refresh_token_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "oauth_connections" */
export type Oauth_Connections_Mutation_Response = {
  __typename: 'oauth_connections_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Oauth_Connections>;
};

/** on_conflict condition type for table "oauth_connections" */
export type Oauth_Connections_On_Conflict = {
  constraint: Oauth_Connections_Constraint;
  update_columns?: Array<Oauth_Connections_Update_Column>;
  where?: InputMaybe<Oauth_Connections_Bool_Exp>;
};

/** Ordering options when selecting data from "oauth_connections". */
export type Oauth_Connections_Order_By = {
  access_token_hash?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  provider?: InputMaybe<Order_By>;
  provider_email?: InputMaybe<Order_By>;
  provider_name?: InputMaybe<Order_By>;
  provider_user_id?: InputMaybe<Order_By>;
  refresh_token_hash?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: oauth_connections */
export type Oauth_Connections_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "oauth_connections" */
export type Oauth_Connections_Select_Column =
  /** column name */
  | 'access_token_hash'
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'provider'
  /** column name */
  | 'provider_email'
  /** column name */
  | 'provider_name'
  /** column name */
  | 'provider_user_id'
  /** column name */
  | 'refresh_token_hash'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'user_id';

/** input type for updating data in table "oauth_connections" */
export type Oauth_Connections_Set_Input = {
  access_token_hash?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
  provider_email?: InputMaybe<Scalars['String']['input']>;
  provider_name?: InputMaybe<Scalars['String']['input']>;
  provider_user_id?: InputMaybe<Scalars['String']['input']>;
  refresh_token_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "oauth_connections" */
export type Oauth_Connections_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Oauth_Connections_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Oauth_Connections_Stream_Cursor_Value_Input = {
  access_token_hash?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
  provider_email?: InputMaybe<Scalars['String']['input']>;
  provider_name?: InputMaybe<Scalars['String']['input']>;
  provider_user_id?: InputMaybe<Scalars['String']['input']>;
  refresh_token_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "oauth_connections" */
export type Oauth_Connections_Update_Column =
  /** column name */
  | 'access_token_hash'
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'provider'
  /** column name */
  | 'provider_email'
  /** column name */
  | 'provider_name'
  /** column name */
  | 'provider_user_id'
  /** column name */
  | 'refresh_token_hash'
  /** column name */
  | 'updated_at'
  /** column name */
  | 'user_id';

export type Oauth_Connections_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Oauth_Connections_Set_Input>;
  /** filter the rows which have to be updated */
  where: Oauth_Connections_Bool_Exp;
};

/** Boolean expression to compare columns of type "onboarding_status". All fields are combined with logical 'AND'. */
export type Onboarding_Status_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['onboarding_status']['input']>;
  _gt?: InputMaybe<Scalars['onboarding_status']['input']>;
  _gte?: InputMaybe<Scalars['onboarding_status']['input']>;
  _in?: InputMaybe<Array<Scalars['onboarding_status']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['onboarding_status']['input']>;
  _lte?: InputMaybe<Scalars['onboarding_status']['input']>;
  _neq?: InputMaybe<Scalars['onboarding_status']['input']>;
  _nin?: InputMaybe<Array<Scalars['onboarding_status']['input']>>;
};

/** column ordering options */
export type Order_By =
  /** in ascending order, nulls last */
  | 'asc'
  /** in ascending order, nulls first */
  | 'asc_nulls_first'
  /** in ascending order, nulls last */
  | 'asc_nulls_last'
  /** in descending order, nulls first */
  | 'desc'
  /** in descending order, nulls first */
  | 'desc_nulls_first'
  /** in descending order, nulls last */
  | 'desc_nulls_last';

/** columns and relationships of "password_reset_tokens" */
export type Password_Reset_Tokens = {
  __typename: 'password_reset_tokens';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Scalars['timestamptz']['output'];
  id: Scalars['uuid']['output'];
  is_used: Maybe<Scalars['Boolean']['output']>;
  token_hash: Scalars['String']['output'];
  user_id: Scalars['uuid']['output'];
};

/** aggregated selection of "password_reset_tokens" */
export type Password_Reset_Tokens_Aggregate = {
  __typename: 'password_reset_tokens_aggregate';
  aggregate: Maybe<Password_Reset_Tokens_Aggregate_Fields>;
  nodes: Array<Password_Reset_Tokens>;
};

/** aggregate fields of "password_reset_tokens" */
export type Password_Reset_Tokens_Aggregate_Fields = {
  __typename: 'password_reset_tokens_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Password_Reset_Tokens_Max_Fields>;
  min: Maybe<Password_Reset_Tokens_Min_Fields>;
};


/** aggregate fields of "password_reset_tokens" */
export type Password_Reset_Tokens_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Password_Reset_Tokens_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "password_reset_tokens". All fields are combined with a logical 'AND'. */
export type Password_Reset_Tokens_Bool_Exp = {
  _and?: InputMaybe<Array<Password_Reset_Tokens_Bool_Exp>>;
  _not?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
  _or?: InputMaybe<Array<Password_Reset_Tokens_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  expires_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_used?: InputMaybe<Boolean_Comparison_Exp>;
  token_hash?: InputMaybe<String_Comparison_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "password_reset_tokens" */
export type Password_Reset_Tokens_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'password_reset_tokens_pkey'
  /** unique or primary key constraint on columns "token_hash" */
  | 'password_reset_tokens_token_hash_key';

/** input type for inserting data into table "password_reset_tokens" */
export type Password_Reset_Tokens_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_used?: InputMaybe<Scalars['Boolean']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Password_Reset_Tokens_Max_Fields = {
  __typename: 'password_reset_tokens_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  token_hash: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Password_Reset_Tokens_Min_Fields = {
  __typename: 'password_reset_tokens_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  expires_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  token_hash: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "password_reset_tokens" */
export type Password_Reset_Tokens_Mutation_Response = {
  __typename: 'password_reset_tokens_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Password_Reset_Tokens>;
};

/** on_conflict condition type for table "password_reset_tokens" */
export type Password_Reset_Tokens_On_Conflict = {
  constraint: Password_Reset_Tokens_Constraint;
  update_columns?: Array<Password_Reset_Tokens_Update_Column>;
  where?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
};

/** Ordering options when selecting data from "password_reset_tokens". */
export type Password_Reset_Tokens_Order_By = {
  created_at?: InputMaybe<Order_By>;
  expires_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_used?: InputMaybe<Order_By>;
  token_hash?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: password_reset_tokens */
export type Password_Reset_Tokens_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "password_reset_tokens" */
export type Password_Reset_Tokens_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'is_used'
  /** column name */
  | 'token_hash'
  /** column name */
  | 'user_id';

/** input type for updating data in table "password_reset_tokens" */
export type Password_Reset_Tokens_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_used?: InputMaybe<Scalars['Boolean']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "password_reset_tokens" */
export type Password_Reset_Tokens_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Password_Reset_Tokens_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Password_Reset_Tokens_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  expires_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_used?: InputMaybe<Scalars['Boolean']['input']>;
  token_hash?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "password_reset_tokens" */
export type Password_Reset_Tokens_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'expires_at'
  /** column name */
  | 'id'
  /** column name */
  | 'is_used'
  /** column name */
  | 'token_hash'
  /** column name */
  | 'user_id';

export type Password_Reset_Tokens_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Password_Reset_Tokens_Set_Input>;
  /** filter the rows which have to be updated */
  where: Password_Reset_Tokens_Bool_Exp;
};

/** Boolean expression to compare columns of type "pay_type". All fields are combined with logical 'AND'. */
export type Pay_Type_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['pay_type']['input']>;
  _gt?: InputMaybe<Scalars['pay_type']['input']>;
  _gte?: InputMaybe<Scalars['pay_type']['input']>;
  _in?: InputMaybe<Array<Scalars['pay_type']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['pay_type']['input']>;
  _lte?: InputMaybe<Scalars['pay_type']['input']>;
  _neq?: InputMaybe<Scalars['pay_type']['input']>;
  _nin?: InputMaybe<Array<Scalars['pay_type']['input']>>;
};

/** columns and relationships of "personal_information" */
export type Personal_Information = {
  __typename: 'personal_information';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  date_of_birth: Maybe<Scalars['date']['output']>;
  drivers_license_number: Maybe<Scalars['String']['output']>;
  employee_id: Scalars['uuid']['output'];
  gender: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  marital_status: Maybe<Scalars['String']['output']>;
  nationality: Maybe<Scalars['String']['output']>;
  passport_number: Maybe<Scalars['String']['output']>;
  social_security_number: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregated selection of "personal_information" */
export type Personal_Information_Aggregate = {
  __typename: 'personal_information_aggregate';
  aggregate: Maybe<Personal_Information_Aggregate_Fields>;
  nodes: Array<Personal_Information>;
};

/** aggregate fields of "personal_information" */
export type Personal_Information_Aggregate_Fields = {
  __typename: 'personal_information_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Personal_Information_Max_Fields>;
  min: Maybe<Personal_Information_Min_Fields>;
};


/** aggregate fields of "personal_information" */
export type Personal_Information_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Personal_Information_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "personal_information". All fields are combined with a logical 'AND'. */
export type Personal_Information_Bool_Exp = {
  _and?: InputMaybe<Array<Personal_Information_Bool_Exp>>;
  _not?: InputMaybe<Personal_Information_Bool_Exp>;
  _or?: InputMaybe<Array<Personal_Information_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  date_of_birth?: InputMaybe<Date_Comparison_Exp>;
  drivers_license_number?: InputMaybe<String_Comparison_Exp>;
  employee_id?: InputMaybe<Uuid_Comparison_Exp>;
  gender?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  marital_status?: InputMaybe<String_Comparison_Exp>;
  nationality?: InputMaybe<String_Comparison_Exp>;
  passport_number?: InputMaybe<String_Comparison_Exp>;
  social_security_number?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "personal_information" */
export type Personal_Information_Constraint =
  /** unique or primary key constraint on columns "employee_id" */
  | 'personal_information_employee_id_key'
  /** unique or primary key constraint on columns "id" */
  | 'personal_information_pkey';

/** input type for inserting data into table "personal_information" */
export type Personal_Information_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  date_of_birth?: InputMaybe<Scalars['date']['input']>;
  drivers_license_number?: InputMaybe<Scalars['String']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  marital_status?: InputMaybe<Scalars['String']['input']>;
  nationality?: InputMaybe<Scalars['String']['input']>;
  passport_number?: InputMaybe<Scalars['String']['input']>;
  social_security_number?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate max on columns */
export type Personal_Information_Max_Fields = {
  __typename: 'personal_information_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  date_of_birth: Maybe<Scalars['date']['output']>;
  drivers_license_number: Maybe<Scalars['String']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  gender: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  marital_status: Maybe<Scalars['String']['output']>;
  nationality: Maybe<Scalars['String']['output']>;
  passport_number: Maybe<Scalars['String']['output']>;
  social_security_number: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type Personal_Information_Min_Fields = {
  __typename: 'personal_information_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  date_of_birth: Maybe<Scalars['date']['output']>;
  drivers_license_number: Maybe<Scalars['String']['output']>;
  employee_id: Maybe<Scalars['uuid']['output']>;
  gender: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  marital_status: Maybe<Scalars['String']['output']>;
  nationality: Maybe<Scalars['String']['output']>;
  passport_number: Maybe<Scalars['String']['output']>;
  social_security_number: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** response of any mutation on the table "personal_information" */
export type Personal_Information_Mutation_Response = {
  __typename: 'personal_information_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Personal_Information>;
};

/** on_conflict condition type for table "personal_information" */
export type Personal_Information_On_Conflict = {
  constraint: Personal_Information_Constraint;
  update_columns?: Array<Personal_Information_Update_Column>;
  where?: InputMaybe<Personal_Information_Bool_Exp>;
};

/** Ordering options when selecting data from "personal_information". */
export type Personal_Information_Order_By = {
  created_at?: InputMaybe<Order_By>;
  date_of_birth?: InputMaybe<Order_By>;
  drivers_license_number?: InputMaybe<Order_By>;
  employee_id?: InputMaybe<Order_By>;
  gender?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  marital_status?: InputMaybe<Order_By>;
  nationality?: InputMaybe<Order_By>;
  passport_number?: InputMaybe<Order_By>;
  social_security_number?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: personal_information */
export type Personal_Information_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "personal_information" */
export type Personal_Information_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'date_of_birth'
  /** column name */
  | 'drivers_license_number'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'gender'
  /** column name */
  | 'id'
  /** column name */
  | 'marital_status'
  /** column name */
  | 'nationality'
  /** column name */
  | 'passport_number'
  /** column name */
  | 'social_security_number'
  /** column name */
  | 'updated_at';

/** input type for updating data in table "personal_information" */
export type Personal_Information_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  date_of_birth?: InputMaybe<Scalars['date']['input']>;
  drivers_license_number?: InputMaybe<Scalars['String']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  marital_status?: InputMaybe<Scalars['String']['input']>;
  nationality?: InputMaybe<Scalars['String']['input']>;
  passport_number?: InputMaybe<Scalars['String']['input']>;
  social_security_number?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** Streaming cursor of the table "personal_information" */
export type Personal_Information_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Personal_Information_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Personal_Information_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  date_of_birth?: InputMaybe<Scalars['date']['input']>;
  drivers_license_number?: InputMaybe<Scalars['String']['input']>;
  employee_id?: InputMaybe<Scalars['uuid']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  marital_status?: InputMaybe<Scalars['String']['input']>;
  nationality?: InputMaybe<Scalars['String']['input']>;
  passport_number?: InputMaybe<Scalars['String']['input']>;
  social_security_number?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** update columns of table "personal_information" */
export type Personal_Information_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'date_of_birth'
  /** column name */
  | 'drivers_license_number'
  /** column name */
  | 'employee_id'
  /** column name */
  | 'gender'
  /** column name */
  | 'id'
  /** column name */
  | 'marital_status'
  /** column name */
  | 'nationality'
  /** column name */
  | 'passport_number'
  /** column name */
  | 'social_security_number'
  /** column name */
  | 'updated_at';

export type Personal_Information_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Personal_Information_Set_Input>;
  /** filter the rows which have to be updated */
  where: Personal_Information_Bool_Exp;
};

export type Query_Root = {
  __typename: 'query_root';
  /** fetch data from the table: "audit_log" */
  audit_log: Array<Audit_Log>;
  /** fetch aggregated fields from the table: "audit_log" */
  audit_log_aggregate: Audit_Log_Aggregate;
  /** fetch data from the table: "audit_log" using primary key columns */
  audit_log_by_pk: Maybe<Audit_Log>;
  /** fetch data from the table: "auth_sessions" */
  auth_sessions: Array<Auth_Sessions>;
  /** fetch aggregated fields from the table: "auth_sessions" */
  auth_sessions_aggregate: Auth_Sessions_Aggregate;
  /** fetch data from the table: "auth_sessions" using primary key columns */
  auth_sessions_by_pk: Maybe<Auth_Sessions>;
  /** fetch data from the table: "compensation" */
  compensation: Array<Compensation>;
  /** fetch aggregated fields from the table: "compensation" */
  compensation_aggregate: Compensation_Aggregate;
  /** fetch data from the table: "compensation" using primary key columns */
  compensation_by_pk: Maybe<Compensation>;
  /** fetch data from the table: "contact_information" */
  contact_information: Array<Contact_Information>;
  /** fetch aggregated fields from the table: "contact_information" */
  contact_information_aggregate: Contact_Information_Aggregate;
  /** fetch data from the table: "contact_information" using primary key columns */
  contact_information_by_pk: Maybe<Contact_Information>;
  /** fetch data from the table: "departments" */
  departments: Array<Departments>;
  /** fetch aggregated fields from the table: "departments" */
  departments_aggregate: Departments_Aggregate;
  /** fetch data from the table: "departments" using primary key columns */
  departments_by_pk: Maybe<Departments>;
  /** fetch data from the table: "departments_with_stats" */
  departments_with_stats: Array<Departments_With_Stats>;
  /** fetch aggregated fields from the table: "departments_with_stats" */
  departments_with_stats_aggregate: Departments_With_Stats_Aggregate;
  /** fetch data from the table: "email_verification_tokens" */
  email_verification_tokens: Array<Email_Verification_Tokens>;
  /** fetch aggregated fields from the table: "email_verification_tokens" */
  email_verification_tokens_aggregate: Email_Verification_Tokens_Aggregate;
  /** fetch data from the table: "email_verification_tokens" using primary key columns */
  email_verification_tokens_by_pk: Maybe<Email_Verification_Tokens>;
  /** An array relationship */
  job_information: Array<Job_Information>;
  /** An aggregate relationship */
  job_information_aggregate: Job_Information_Aggregate;
  /** fetch data from the table: "job_information" using primary key columns */
  job_information_by_pk: Maybe<Job_Information>;
  /** fetch data from the table: "oauth_connections" */
  oauth_connections: Array<Oauth_Connections>;
  /** fetch aggregated fields from the table: "oauth_connections" */
  oauth_connections_aggregate: Oauth_Connections_Aggregate;
  /** fetch data from the table: "oauth_connections" using primary key columns */
  oauth_connections_by_pk: Maybe<Oauth_Connections>;
  /** fetch data from the table: "password_reset_tokens" */
  password_reset_tokens: Array<Password_Reset_Tokens>;
  /** fetch aggregated fields from the table: "password_reset_tokens" */
  password_reset_tokens_aggregate: Password_Reset_Tokens_Aggregate;
  /** fetch data from the table: "password_reset_tokens" using primary key columns */
  password_reset_tokens_by_pk: Maybe<Password_Reset_Tokens>;
  /** fetch data from the table: "personal_information" */
  personal_information: Array<Personal_Information>;
  /** fetch aggregated fields from the table: "personal_information" */
  personal_information_aggregate: Personal_Information_Aggregate;
  /** fetch data from the table: "personal_information" using primary key columns */
  personal_information_by_pk: Maybe<Personal_Information>;
  /** fetch data from the table: "user_role_assignments" */
  user_role_assignments: Array<User_Role_Assignments>;
  /** fetch aggregated fields from the table: "user_role_assignments" */
  user_role_assignments_aggregate: User_Role_Assignments_Aggregate;
  /** fetch data from the table: "user_role_assignments" using primary key columns */
  user_role_assignments_by_pk: Maybe<User_Role_Assignments>;
  /** fetch data from the table: "user_roles" */
  user_roles: Array<User_Roles>;
  /** fetch aggregated fields from the table: "user_roles" */
  user_roles_aggregate: User_Roles_Aggregate;
  /** fetch data from the table: "user_roles" using primary key columns */
  user_roles_by_pk: Maybe<User_Roles>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk: Maybe<Users>;
  /** fetch data from the table: "users_with_roles" */
  users_with_roles: Array<Users_With_Roles>;
  /** fetch aggregated fields from the table: "users_with_roles" */
  users_with_roles_aggregate: Users_With_Roles_Aggregate;
};


export type Query_RootAudit_LogArgs = {
  distinct_on?: InputMaybe<Array<Audit_Log_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Audit_Log_Order_By>>;
  where?: InputMaybe<Audit_Log_Bool_Exp>;
};


export type Query_RootAudit_Log_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Audit_Log_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Audit_Log_Order_By>>;
  where?: InputMaybe<Audit_Log_Bool_Exp>;
};


export type Query_RootAudit_Log_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootAuth_SessionsArgs = {
  distinct_on?: InputMaybe<Array<Auth_Sessions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Auth_Sessions_Order_By>>;
  where?: InputMaybe<Auth_Sessions_Bool_Exp>;
};


export type Query_RootAuth_Sessions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Auth_Sessions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Auth_Sessions_Order_By>>;
  where?: InputMaybe<Auth_Sessions_Bool_Exp>;
};


export type Query_RootAuth_Sessions_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootCompensationArgs = {
  distinct_on?: InputMaybe<Array<Compensation_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Compensation_Order_By>>;
  where?: InputMaybe<Compensation_Bool_Exp>;
};


export type Query_RootCompensation_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Compensation_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Compensation_Order_By>>;
  where?: InputMaybe<Compensation_Bool_Exp>;
};


export type Query_RootCompensation_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootContact_InformationArgs = {
  distinct_on?: InputMaybe<Array<Contact_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Contact_Information_Order_By>>;
  where?: InputMaybe<Contact_Information_Bool_Exp>;
};


export type Query_RootContact_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contact_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Contact_Information_Order_By>>;
  where?: InputMaybe<Contact_Information_Bool_Exp>;
};


export type Query_RootContact_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootDepartmentsArgs = {
  distinct_on?: InputMaybe<Array<Departments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_Order_By>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};


export type Query_RootDepartments_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Departments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_Order_By>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};


export type Query_RootDepartments_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootDepartments_With_StatsArgs = {
  distinct_on?: InputMaybe<Array<Departments_With_Stats_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_With_Stats_Order_By>>;
  where?: InputMaybe<Departments_With_Stats_Bool_Exp>;
};


export type Query_RootDepartments_With_Stats_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Departments_With_Stats_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_With_Stats_Order_By>>;
  where?: InputMaybe<Departments_With_Stats_Bool_Exp>;
};


export type Query_RootEmail_Verification_TokensArgs = {
  distinct_on?: InputMaybe<Array<Email_Verification_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Email_Verification_Tokens_Order_By>>;
  where?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
};


export type Query_RootEmail_Verification_Tokens_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Email_Verification_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Email_Verification_Tokens_Order_By>>;
  where?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
};


export type Query_RootEmail_Verification_Tokens_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootJob_InformationArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


export type Query_RootJob_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


export type Query_RootJob_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootOauth_ConnectionsArgs = {
  distinct_on?: InputMaybe<Array<Oauth_Connections_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Oauth_Connections_Order_By>>;
  where?: InputMaybe<Oauth_Connections_Bool_Exp>;
};


export type Query_RootOauth_Connections_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Oauth_Connections_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Oauth_Connections_Order_By>>;
  where?: InputMaybe<Oauth_Connections_Bool_Exp>;
};


export type Query_RootOauth_Connections_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootPassword_Reset_TokensArgs = {
  distinct_on?: InputMaybe<Array<Password_Reset_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Password_Reset_Tokens_Order_By>>;
  where?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
};


export type Query_RootPassword_Reset_Tokens_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Password_Reset_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Password_Reset_Tokens_Order_By>>;
  where?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
};


export type Query_RootPassword_Reset_Tokens_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootPersonal_InformationArgs = {
  distinct_on?: InputMaybe<Array<Personal_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Personal_Information_Order_By>>;
  where?: InputMaybe<Personal_Information_Bool_Exp>;
};


export type Query_RootPersonal_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Personal_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Personal_Information_Order_By>>;
  where?: InputMaybe<Personal_Information_Bool_Exp>;
};


export type Query_RootPersonal_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootUser_Role_AssignmentsArgs = {
  distinct_on?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Role_Assignments_Order_By>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};


export type Query_RootUser_Role_Assignments_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Role_Assignments_Order_By>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};


export type Query_RootUser_Role_Assignments_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootUser_RolesArgs = {
  distinct_on?: InputMaybe<Array<User_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Roles_Order_By>>;
  where?: InputMaybe<User_Roles_Bool_Exp>;
};


export type Query_RootUser_Roles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Roles_Order_By>>;
  where?: InputMaybe<User_Roles_Bool_Exp>;
};


export type Query_RootUser_Roles_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Query_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Query_RootUsers_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootUsers_With_RolesArgs = {
  distinct_on?: InputMaybe<Array<Users_With_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_With_Roles_Order_By>>;
  where?: InputMaybe<Users_With_Roles_Bool_Exp>;
};


export type Query_RootUsers_With_Roles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_With_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_With_Roles_Order_By>>;
  where?: InputMaybe<Users_With_Roles_Bool_Exp>;
};

export type Subscription_Root = {
  __typename: 'subscription_root';
  /** fetch data from the table: "audit_log" */
  audit_log: Array<Audit_Log>;
  /** fetch aggregated fields from the table: "audit_log" */
  audit_log_aggregate: Audit_Log_Aggregate;
  /** fetch data from the table: "audit_log" using primary key columns */
  audit_log_by_pk: Maybe<Audit_Log>;
  /** fetch data from the table in a streaming manner: "audit_log" */
  audit_log_stream: Array<Audit_Log>;
  /** fetch data from the table: "auth_sessions" */
  auth_sessions: Array<Auth_Sessions>;
  /** fetch aggregated fields from the table: "auth_sessions" */
  auth_sessions_aggregate: Auth_Sessions_Aggregate;
  /** fetch data from the table: "auth_sessions" using primary key columns */
  auth_sessions_by_pk: Maybe<Auth_Sessions>;
  /** fetch data from the table in a streaming manner: "auth_sessions" */
  auth_sessions_stream: Array<Auth_Sessions>;
  /** fetch data from the table: "compensation" */
  compensation: Array<Compensation>;
  /** fetch aggregated fields from the table: "compensation" */
  compensation_aggregate: Compensation_Aggregate;
  /** fetch data from the table: "compensation" using primary key columns */
  compensation_by_pk: Maybe<Compensation>;
  /** fetch data from the table in a streaming manner: "compensation" */
  compensation_stream: Array<Compensation>;
  /** fetch data from the table: "contact_information" */
  contact_information: Array<Contact_Information>;
  /** fetch aggregated fields from the table: "contact_information" */
  contact_information_aggregate: Contact_Information_Aggregate;
  /** fetch data from the table: "contact_information" using primary key columns */
  contact_information_by_pk: Maybe<Contact_Information>;
  /** fetch data from the table in a streaming manner: "contact_information" */
  contact_information_stream: Array<Contact_Information>;
  /** fetch data from the table: "departments" */
  departments: Array<Departments>;
  /** fetch aggregated fields from the table: "departments" */
  departments_aggregate: Departments_Aggregate;
  /** fetch data from the table: "departments" using primary key columns */
  departments_by_pk: Maybe<Departments>;
  /** fetch data from the table in a streaming manner: "departments" */
  departments_stream: Array<Departments>;
  /** fetch data from the table: "departments_with_stats" */
  departments_with_stats: Array<Departments_With_Stats>;
  /** fetch aggregated fields from the table: "departments_with_stats" */
  departments_with_stats_aggregate: Departments_With_Stats_Aggregate;
  /** fetch data from the table in a streaming manner: "departments_with_stats" */
  departments_with_stats_stream: Array<Departments_With_Stats>;
  /** fetch data from the table: "email_verification_tokens" */
  email_verification_tokens: Array<Email_Verification_Tokens>;
  /** fetch aggregated fields from the table: "email_verification_tokens" */
  email_verification_tokens_aggregate: Email_Verification_Tokens_Aggregate;
  /** fetch data from the table: "email_verification_tokens" using primary key columns */
  email_verification_tokens_by_pk: Maybe<Email_Verification_Tokens>;
  /** fetch data from the table in a streaming manner: "email_verification_tokens" */
  email_verification_tokens_stream: Array<Email_Verification_Tokens>;
  /** An array relationship */
  job_information: Array<Job_Information>;
  /** An aggregate relationship */
  job_information_aggregate: Job_Information_Aggregate;
  /** fetch data from the table: "job_information" using primary key columns */
  job_information_by_pk: Maybe<Job_Information>;
  /** fetch data from the table in a streaming manner: "job_information" */
  job_information_stream: Array<Job_Information>;
  /** fetch data from the table: "oauth_connections" */
  oauth_connections: Array<Oauth_Connections>;
  /** fetch aggregated fields from the table: "oauth_connections" */
  oauth_connections_aggregate: Oauth_Connections_Aggregate;
  /** fetch data from the table: "oauth_connections" using primary key columns */
  oauth_connections_by_pk: Maybe<Oauth_Connections>;
  /** fetch data from the table in a streaming manner: "oauth_connections" */
  oauth_connections_stream: Array<Oauth_Connections>;
  /** fetch data from the table: "password_reset_tokens" */
  password_reset_tokens: Array<Password_Reset_Tokens>;
  /** fetch aggregated fields from the table: "password_reset_tokens" */
  password_reset_tokens_aggregate: Password_Reset_Tokens_Aggregate;
  /** fetch data from the table: "password_reset_tokens" using primary key columns */
  password_reset_tokens_by_pk: Maybe<Password_Reset_Tokens>;
  /** fetch data from the table in a streaming manner: "password_reset_tokens" */
  password_reset_tokens_stream: Array<Password_Reset_Tokens>;
  /** fetch data from the table: "personal_information" */
  personal_information: Array<Personal_Information>;
  /** fetch aggregated fields from the table: "personal_information" */
  personal_information_aggregate: Personal_Information_Aggregate;
  /** fetch data from the table: "personal_information" using primary key columns */
  personal_information_by_pk: Maybe<Personal_Information>;
  /** fetch data from the table in a streaming manner: "personal_information" */
  personal_information_stream: Array<Personal_Information>;
  /** fetch data from the table: "user_role_assignments" */
  user_role_assignments: Array<User_Role_Assignments>;
  /** fetch aggregated fields from the table: "user_role_assignments" */
  user_role_assignments_aggregate: User_Role_Assignments_Aggregate;
  /** fetch data from the table: "user_role_assignments" using primary key columns */
  user_role_assignments_by_pk: Maybe<User_Role_Assignments>;
  /** fetch data from the table in a streaming manner: "user_role_assignments" */
  user_role_assignments_stream: Array<User_Role_Assignments>;
  /** fetch data from the table: "user_roles" */
  user_roles: Array<User_Roles>;
  /** fetch aggregated fields from the table: "user_roles" */
  user_roles_aggregate: User_Roles_Aggregate;
  /** fetch data from the table: "user_roles" using primary key columns */
  user_roles_by_pk: Maybe<User_Roles>;
  /** fetch data from the table in a streaming manner: "user_roles" */
  user_roles_stream: Array<User_Roles>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk: Maybe<Users>;
  /** fetch data from the table in a streaming manner: "users" */
  users_stream: Array<Users>;
  /** fetch data from the table: "users_with_roles" */
  users_with_roles: Array<Users_With_Roles>;
  /** fetch aggregated fields from the table: "users_with_roles" */
  users_with_roles_aggregate: Users_With_Roles_Aggregate;
  /** fetch data from the table in a streaming manner: "users_with_roles" */
  users_with_roles_stream: Array<Users_With_Roles>;
};


export type Subscription_RootAudit_LogArgs = {
  distinct_on?: InputMaybe<Array<Audit_Log_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Audit_Log_Order_By>>;
  where?: InputMaybe<Audit_Log_Bool_Exp>;
};


export type Subscription_RootAudit_Log_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Audit_Log_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Audit_Log_Order_By>>;
  where?: InputMaybe<Audit_Log_Bool_Exp>;
};


export type Subscription_RootAudit_Log_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootAudit_Log_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Audit_Log_Stream_Cursor_Input>>;
  where?: InputMaybe<Audit_Log_Bool_Exp>;
};


export type Subscription_RootAuth_SessionsArgs = {
  distinct_on?: InputMaybe<Array<Auth_Sessions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Auth_Sessions_Order_By>>;
  where?: InputMaybe<Auth_Sessions_Bool_Exp>;
};


export type Subscription_RootAuth_Sessions_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Auth_Sessions_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Auth_Sessions_Order_By>>;
  where?: InputMaybe<Auth_Sessions_Bool_Exp>;
};


export type Subscription_RootAuth_Sessions_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootAuth_Sessions_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Auth_Sessions_Stream_Cursor_Input>>;
  where?: InputMaybe<Auth_Sessions_Bool_Exp>;
};


export type Subscription_RootCompensationArgs = {
  distinct_on?: InputMaybe<Array<Compensation_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Compensation_Order_By>>;
  where?: InputMaybe<Compensation_Bool_Exp>;
};


export type Subscription_RootCompensation_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Compensation_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Compensation_Order_By>>;
  where?: InputMaybe<Compensation_Bool_Exp>;
};


export type Subscription_RootCompensation_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootCompensation_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Compensation_Stream_Cursor_Input>>;
  where?: InputMaybe<Compensation_Bool_Exp>;
};


export type Subscription_RootContact_InformationArgs = {
  distinct_on?: InputMaybe<Array<Contact_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Contact_Information_Order_By>>;
  where?: InputMaybe<Contact_Information_Bool_Exp>;
};


export type Subscription_RootContact_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contact_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Contact_Information_Order_By>>;
  where?: InputMaybe<Contact_Information_Bool_Exp>;
};


export type Subscription_RootContact_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootContact_Information_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Contact_Information_Stream_Cursor_Input>>;
  where?: InputMaybe<Contact_Information_Bool_Exp>;
};


export type Subscription_RootDepartmentsArgs = {
  distinct_on?: InputMaybe<Array<Departments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_Order_By>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};


export type Subscription_RootDepartments_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Departments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_Order_By>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};


export type Subscription_RootDepartments_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootDepartments_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Departments_Stream_Cursor_Input>>;
  where?: InputMaybe<Departments_Bool_Exp>;
};


export type Subscription_RootDepartments_With_StatsArgs = {
  distinct_on?: InputMaybe<Array<Departments_With_Stats_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_With_Stats_Order_By>>;
  where?: InputMaybe<Departments_With_Stats_Bool_Exp>;
};


export type Subscription_RootDepartments_With_Stats_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Departments_With_Stats_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Departments_With_Stats_Order_By>>;
  where?: InputMaybe<Departments_With_Stats_Bool_Exp>;
};


export type Subscription_RootDepartments_With_Stats_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Departments_With_Stats_Stream_Cursor_Input>>;
  where?: InputMaybe<Departments_With_Stats_Bool_Exp>;
};


export type Subscription_RootEmail_Verification_TokensArgs = {
  distinct_on?: InputMaybe<Array<Email_Verification_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Email_Verification_Tokens_Order_By>>;
  where?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
};


export type Subscription_RootEmail_Verification_Tokens_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Email_Verification_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Email_Verification_Tokens_Order_By>>;
  where?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
};


export type Subscription_RootEmail_Verification_Tokens_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootEmail_Verification_Tokens_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Email_Verification_Tokens_Stream_Cursor_Input>>;
  where?: InputMaybe<Email_Verification_Tokens_Bool_Exp>;
};


export type Subscription_RootJob_InformationArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


export type Subscription_RootJob_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


export type Subscription_RootJob_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootJob_Information_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Job_Information_Stream_Cursor_Input>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


export type Subscription_RootOauth_ConnectionsArgs = {
  distinct_on?: InputMaybe<Array<Oauth_Connections_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Oauth_Connections_Order_By>>;
  where?: InputMaybe<Oauth_Connections_Bool_Exp>;
};


export type Subscription_RootOauth_Connections_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Oauth_Connections_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Oauth_Connections_Order_By>>;
  where?: InputMaybe<Oauth_Connections_Bool_Exp>;
};


export type Subscription_RootOauth_Connections_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootOauth_Connections_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Oauth_Connections_Stream_Cursor_Input>>;
  where?: InputMaybe<Oauth_Connections_Bool_Exp>;
};


export type Subscription_RootPassword_Reset_TokensArgs = {
  distinct_on?: InputMaybe<Array<Password_Reset_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Password_Reset_Tokens_Order_By>>;
  where?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
};


export type Subscription_RootPassword_Reset_Tokens_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Password_Reset_Tokens_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Password_Reset_Tokens_Order_By>>;
  where?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
};


export type Subscription_RootPassword_Reset_Tokens_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootPassword_Reset_Tokens_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Password_Reset_Tokens_Stream_Cursor_Input>>;
  where?: InputMaybe<Password_Reset_Tokens_Bool_Exp>;
};


export type Subscription_RootPersonal_InformationArgs = {
  distinct_on?: InputMaybe<Array<Personal_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Personal_Information_Order_By>>;
  where?: InputMaybe<Personal_Information_Bool_Exp>;
};


export type Subscription_RootPersonal_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Personal_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Personal_Information_Order_By>>;
  where?: InputMaybe<Personal_Information_Bool_Exp>;
};


export type Subscription_RootPersonal_Information_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootPersonal_Information_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Personal_Information_Stream_Cursor_Input>>;
  where?: InputMaybe<Personal_Information_Bool_Exp>;
};


export type Subscription_RootUser_Role_AssignmentsArgs = {
  distinct_on?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Role_Assignments_Order_By>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};


export type Subscription_RootUser_Role_Assignments_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Role_Assignments_Order_By>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};


export type Subscription_RootUser_Role_Assignments_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootUser_Role_Assignments_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<User_Role_Assignments_Stream_Cursor_Input>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};


export type Subscription_RootUser_RolesArgs = {
  distinct_on?: InputMaybe<Array<User_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Roles_Order_By>>;
  where?: InputMaybe<User_Roles_Bool_Exp>;
};


export type Subscription_RootUser_Roles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Roles_Order_By>>;
  where?: InputMaybe<User_Roles_Bool_Exp>;
};


export type Subscription_RootUser_Roles_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootUser_Roles_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<User_Roles_Stream_Cursor_Input>>;
  where?: InputMaybe<User_Roles_Bool_Exp>;
};


export type Subscription_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootUsers_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Users_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_With_RolesArgs = {
  distinct_on?: InputMaybe<Array<Users_With_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_With_Roles_Order_By>>;
  where?: InputMaybe<Users_With_Roles_Bool_Exp>;
};


export type Subscription_RootUsers_With_Roles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_With_Roles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_With_Roles_Order_By>>;
  where?: InputMaybe<Users_With_Roles_Bool_Exp>;
};


export type Subscription_RootUsers_With_Roles_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Users_With_Roles_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_With_Roles_Bool_Exp>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamptz']['input']>;
  _gt?: InputMaybe<Scalars['timestamptz']['input']>;
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _in?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
  _neq?: InputMaybe<Scalars['timestamptz']['input']>;
  _nin?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
};

/** columns and relationships of "user_role_assignments" */
export type User_Role_Assignments = {
  __typename: 'user_role_assignments';
  assigned_at: Maybe<Scalars['timestamptz']['output']>;
  id: Scalars['uuid']['output'];
  is_active: Maybe<Scalars['Boolean']['output']>;
  /** An object relationship */
  role: User_Roles;
  role_id: Scalars['uuid']['output'];
  /** An object relationship */
  user: Users;
  user_id: Scalars['uuid']['output'];
};

/** aggregated selection of "user_role_assignments" */
export type User_Role_Assignments_Aggregate = {
  __typename: 'user_role_assignments_aggregate';
  aggregate: Maybe<User_Role_Assignments_Aggregate_Fields>;
  nodes: Array<User_Role_Assignments>;
};

export type User_Role_Assignments_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<User_Role_Assignments_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<User_Role_Assignments_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<User_Role_Assignments_Aggregate_Bool_Exp_Count>;
};

export type User_Role_Assignments_Aggregate_Bool_Exp_Bool_And = {
  arguments: User_Role_Assignments_Select_Column_User_Role_Assignments_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<User_Role_Assignments_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type User_Role_Assignments_Aggregate_Bool_Exp_Bool_Or = {
  arguments: User_Role_Assignments_Select_Column_User_Role_Assignments_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<User_Role_Assignments_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type User_Role_Assignments_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<User_Role_Assignments_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "user_role_assignments" */
export type User_Role_Assignments_Aggregate_Fields = {
  __typename: 'user_role_assignments_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<User_Role_Assignments_Max_Fields>;
  min: Maybe<User_Role_Assignments_Min_Fields>;
};


/** aggregate fields of "user_role_assignments" */
export type User_Role_Assignments_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "user_role_assignments" */
export type User_Role_Assignments_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<User_Role_Assignments_Max_Order_By>;
  min?: InputMaybe<User_Role_Assignments_Min_Order_By>;
};

/** input type for inserting array relation for remote table "user_role_assignments" */
export type User_Role_Assignments_Arr_Rel_Insert_Input = {
  data: Array<User_Role_Assignments_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<User_Role_Assignments_On_Conflict>;
};

/** Boolean expression to filter rows from the table "user_role_assignments". All fields are combined with a logical 'AND'. */
export type User_Role_Assignments_Bool_Exp = {
  _and?: InputMaybe<Array<User_Role_Assignments_Bool_Exp>>;
  _not?: InputMaybe<User_Role_Assignments_Bool_Exp>;
  _or?: InputMaybe<Array<User_Role_Assignments_Bool_Exp>>;
  assigned_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_active?: InputMaybe<Boolean_Comparison_Exp>;
  role?: InputMaybe<User_Roles_Bool_Exp>;
  role_id?: InputMaybe<Uuid_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "user_role_assignments" */
export type User_Role_Assignments_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'user_role_assignments_pkey'
  /** unique or primary key constraint on columns "role_id", "user_id" */
  | 'user_role_assignments_user_id_role_id_key';

/** input type for inserting data into table "user_role_assignments" */
export type User_Role_Assignments_Insert_Input = {
  assigned_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  role?: InputMaybe<User_Roles_Obj_Rel_Insert_Input>;
  role_id?: InputMaybe<Scalars['uuid']['input']>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type User_Role_Assignments_Max_Fields = {
  __typename: 'user_role_assignments_max_fields';
  assigned_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  role_id: Maybe<Scalars['uuid']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** order by max() on columns of table "user_role_assignments" */
export type User_Role_Assignments_Max_Order_By = {
  assigned_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  role_id?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type User_Role_Assignments_Min_Fields = {
  __typename: 'user_role_assignments_min_fields';
  assigned_at: Maybe<Scalars['timestamptz']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  role_id: Maybe<Scalars['uuid']['output']>;
  user_id: Maybe<Scalars['uuid']['output']>;
};

/** order by min() on columns of table "user_role_assignments" */
export type User_Role_Assignments_Min_Order_By = {
  assigned_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  role_id?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "user_role_assignments" */
export type User_Role_Assignments_Mutation_Response = {
  __typename: 'user_role_assignments_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<User_Role_Assignments>;
};

/** on_conflict condition type for table "user_role_assignments" */
export type User_Role_Assignments_On_Conflict = {
  constraint: User_Role_Assignments_Constraint;
  update_columns?: Array<User_Role_Assignments_Update_Column>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};

/** Ordering options when selecting data from "user_role_assignments". */
export type User_Role_Assignments_Order_By = {
  assigned_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_active?: InputMaybe<Order_By>;
  role?: InputMaybe<User_Roles_Order_By>;
  role_id?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: user_role_assignments */
export type User_Role_Assignments_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "user_role_assignments" */
export type User_Role_Assignments_Select_Column =
  /** column name */
  | 'assigned_at'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'role_id'
  /** column name */
  | 'user_id';

/** select "user_role_assignments_aggregate_bool_exp_bool_and_arguments_columns" columns of table "user_role_assignments" */
export type User_Role_Assignments_Select_Column_User_Role_Assignments_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'is_active';

/** select "user_role_assignments_aggregate_bool_exp_bool_or_arguments_columns" columns of table "user_role_assignments" */
export type User_Role_Assignments_Select_Column_User_Role_Assignments_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'is_active';

/** input type for updating data in table "user_role_assignments" */
export type User_Role_Assignments_Set_Input = {
  assigned_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  role_id?: InputMaybe<Scalars['uuid']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "user_role_assignments" */
export type User_Role_Assignments_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: User_Role_Assignments_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type User_Role_Assignments_Stream_Cursor_Value_Input = {
  assigned_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  role_id?: InputMaybe<Scalars['uuid']['input']>;
  user_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "user_role_assignments" */
export type User_Role_Assignments_Update_Column =
  /** column name */
  | 'assigned_at'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'role_id'
  /** column name */
  | 'user_id';

export type User_Role_Assignments_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<User_Role_Assignments_Set_Input>;
  /** filter the rows which have to be updated */
  where: User_Role_Assignments_Bool_Exp;
};

/** columns and relationships of "user_roles" */
export type User_Roles = {
  __typename: 'user_roles';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  level: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

/** aggregated selection of "user_roles" */
export type User_Roles_Aggregate = {
  __typename: 'user_roles_aggregate';
  aggregate: Maybe<User_Roles_Aggregate_Fields>;
  nodes: Array<User_Roles>;
};

/** aggregate fields of "user_roles" */
export type User_Roles_Aggregate_Fields = {
  __typename: 'user_roles_aggregate_fields';
  avg: Maybe<User_Roles_Avg_Fields>;
  count: Scalars['Int']['output'];
  max: Maybe<User_Roles_Max_Fields>;
  min: Maybe<User_Roles_Min_Fields>;
  stddev: Maybe<User_Roles_Stddev_Fields>;
  stddev_pop: Maybe<User_Roles_Stddev_Pop_Fields>;
  stddev_samp: Maybe<User_Roles_Stddev_Samp_Fields>;
  sum: Maybe<User_Roles_Sum_Fields>;
  var_pop: Maybe<User_Roles_Var_Pop_Fields>;
  var_samp: Maybe<User_Roles_Var_Samp_Fields>;
  variance: Maybe<User_Roles_Variance_Fields>;
};


/** aggregate fields of "user_roles" */
export type User_Roles_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<User_Roles_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type User_Roles_Avg_Fields = {
  __typename: 'user_roles_avg_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "user_roles". All fields are combined with a logical 'AND'. */
export type User_Roles_Bool_Exp = {
  _and?: InputMaybe<Array<User_Roles_Bool_Exp>>;
  _not?: InputMaybe<User_Roles_Bool_Exp>;
  _or?: InputMaybe<Array<User_Roles_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  level?: InputMaybe<Int_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "user_roles" */
export type User_Roles_Constraint =
  /** unique or primary key constraint on columns "name" */
  | 'user_roles_name_key'
  /** unique or primary key constraint on columns "id" */
  | 'user_roles_pkey';

/** input type for incrementing numeric columns in table "user_roles" */
export type User_Roles_Inc_Input = {
  level?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "user_roles" */
export type User_Roles_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  level?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type User_Roles_Max_Fields = {
  __typename: 'user_roles_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  level: Maybe<Scalars['Int']['output']>;
  name: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type User_Roles_Min_Fields = {
  __typename: 'user_roles_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  level: Maybe<Scalars['Int']['output']>;
  name: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "user_roles" */
export type User_Roles_Mutation_Response = {
  __typename: 'user_roles_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<User_Roles>;
};

/** input type for inserting object relation for remote table "user_roles" */
export type User_Roles_Obj_Rel_Insert_Input = {
  data: User_Roles_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<User_Roles_On_Conflict>;
};

/** on_conflict condition type for table "user_roles" */
export type User_Roles_On_Conflict = {
  constraint: User_Roles_Constraint;
  update_columns?: Array<User_Roles_Update_Column>;
  where?: InputMaybe<User_Roles_Bool_Exp>;
};

/** Ordering options when selecting data from "user_roles". */
export type User_Roles_Order_By = {
  created_at?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  level?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
};

/** primary key columns input for table: user_roles */
export type User_Roles_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "user_roles" */
export type User_Roles_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'description'
  /** column name */
  | 'id'
  /** column name */
  | 'level'
  /** column name */
  | 'name';

/** input type for updating data in table "user_roles" */
export type User_Roles_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  level?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type User_Roles_Stddev_Fields = {
  __typename: 'user_roles_stddev_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type User_Roles_Stddev_Pop_Fields = {
  __typename: 'user_roles_stddev_pop_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type User_Roles_Stddev_Samp_Fields = {
  __typename: 'user_roles_stddev_samp_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "user_roles" */
export type User_Roles_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: User_Roles_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type User_Roles_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  level?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type User_Roles_Sum_Fields = {
  __typename: 'user_roles_sum_fields';
  level: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "user_roles" */
export type User_Roles_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'description'
  /** column name */
  | 'id'
  /** column name */
  | 'level'
  /** column name */
  | 'name';

export type User_Roles_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<User_Roles_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<User_Roles_Set_Input>;
  /** filter the rows which have to be updated */
  where: User_Roles_Bool_Exp;
};

/** aggregate var_pop on columns */
export type User_Roles_Var_Pop_Fields = {
  __typename: 'user_roles_var_pop_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type User_Roles_Var_Samp_Fields = {
  __typename: 'user_roles_var_samp_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type User_Roles_Variance_Fields = {
  __typename: 'user_roles_variance_fields';
  level: Maybe<Scalars['Float']['output']>;
};

/** columns and relationships of "users" */
export type Users = {
  __typename: 'users';
  /** An object relationship */
  compensation: Maybe<Compensation>;
  /** An object relationship */
  contact_information: Maybe<Contact_Information>;
  created_at: Maybe<Scalars['timestamptz']['output']>;
  display_name: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['uuid']['output'];
  is_active: Maybe<Scalars['Boolean']['output']>;
  /** An array relationship */
  job_information: Array<Job_Information>;
  /** An aggregate relationship */
  job_information_aggregate: Job_Information_Aggregate;
  job_title: Maybe<Scalars['String']['output']>;
  onboarding_status: Maybe<Scalars['onboarding_status']['output']>;
  password_hash: Scalars['String']['output'];
  /** An array relationship */
  role_assignments: Array<User_Role_Assignments>;
  /** An aggregate relationship */
  role_assignments_aggregate: User_Role_Assignments_Aggregate;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};


/** columns and relationships of "users" */
export type UsersJob_InformationArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersJob_Information_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Job_Information_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Job_Information_Order_By>>;
  where?: InputMaybe<Job_Information_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersRole_AssignmentsArgs = {
  distinct_on?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Role_Assignments_Order_By>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersRole_Assignments_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Role_Assignments_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<User_Role_Assignments_Order_By>>;
  where?: InputMaybe<User_Role_Assignments_Bool_Exp>;
};

/** aggregated selection of "users" */
export type Users_Aggregate = {
  __typename: 'users_aggregate';
  aggregate: Maybe<Users_Aggregate_Fields>;
  nodes: Array<Users>;
};

/** aggregate fields of "users" */
export type Users_Aggregate_Fields = {
  __typename: 'users_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Users_Max_Fields>;
  min: Maybe<Users_Min_Fields>;
};


/** aggregate fields of "users" */
export type Users_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
export type Users_Bool_Exp = {
  _and?: InputMaybe<Array<Users_Bool_Exp>>;
  _not?: InputMaybe<Users_Bool_Exp>;
  _or?: InputMaybe<Array<Users_Bool_Exp>>;
  compensation?: InputMaybe<Compensation_Bool_Exp>;
  contact_information?: InputMaybe<Contact_Information_Bool_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  display_name?: InputMaybe<String_Comparison_Exp>;
  email?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_active?: InputMaybe<Boolean_Comparison_Exp>;
  job_information?: InputMaybe<Job_Information_Bool_Exp>;
  job_information_aggregate?: InputMaybe<Job_Information_Aggregate_Bool_Exp>;
  job_title?: InputMaybe<String_Comparison_Exp>;
  onboarding_status?: InputMaybe<Onboarding_Status_Comparison_Exp>;
  password_hash?: InputMaybe<String_Comparison_Exp>;
  role_assignments?: InputMaybe<User_Role_Assignments_Bool_Exp>;
  role_assignments_aggregate?: InputMaybe<User_Role_Assignments_Aggregate_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "users" */
export type Users_Constraint =
  /** unique or primary key constraint on columns "email" */
  | 'users_email_key'
  /** unique or primary key constraint on columns "id" */
  | 'users_pkey';

/** input type for inserting data into table "users" */
export type Users_Insert_Input = {
  compensation?: InputMaybe<Compensation_Obj_Rel_Insert_Input>;
  contact_information?: InputMaybe<Contact_Information_Obj_Rel_Insert_Input>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  display_name?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  job_information?: InputMaybe<Job_Information_Arr_Rel_Insert_Input>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  onboarding_status?: InputMaybe<Scalars['onboarding_status']['input']>;
  password_hash?: InputMaybe<Scalars['String']['input']>;
  role_assignments?: InputMaybe<User_Role_Assignments_Arr_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate max on columns */
export type Users_Max_Fields = {
  __typename: 'users_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  display_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  onboarding_status: Maybe<Scalars['onboarding_status']['output']>;
  password_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type Users_Min_Fields = {
  __typename: 'users_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  display_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  onboarding_status: Maybe<Scalars['onboarding_status']['output']>;
  password_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** response of any mutation on the table "users" */
export type Users_Mutation_Response = {
  __typename: 'users_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Users>;
};

/** input type for inserting object relation for remote table "users" */
export type Users_Obj_Rel_Insert_Input = {
  data: Users_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Users_On_Conflict>;
};

/** on_conflict condition type for table "users" */
export type Users_On_Conflict = {
  constraint: Users_Constraint;
  update_columns?: Array<Users_Update_Column>;
  where?: InputMaybe<Users_Bool_Exp>;
};

/** Ordering options when selecting data from "users". */
export type Users_Order_By = {
  compensation?: InputMaybe<Compensation_Order_By>;
  contact_information?: InputMaybe<Contact_Information_Order_By>;
  created_at?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
  email?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_active?: InputMaybe<Order_By>;
  job_information_aggregate?: InputMaybe<Job_Information_Aggregate_Order_By>;
  job_title?: InputMaybe<Order_By>;
  onboarding_status?: InputMaybe<Order_By>;
  password_hash?: InputMaybe<Order_By>;
  role_assignments_aggregate?: InputMaybe<User_Role_Assignments_Aggregate_Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: users */
export type Users_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "users" */
export type Users_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'display_name'
  /** column name */
  | 'email'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'job_title'
  /** column name */
  | 'onboarding_status'
  /** column name */
  | 'password_hash'
  /** column name */
  | 'updated_at';

/** input type for updating data in table "users" */
export type Users_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  display_name?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  onboarding_status?: InputMaybe<Scalars['onboarding_status']['input']>;
  password_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** Streaming cursor of the table "users" */
export type Users_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  display_name?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  onboarding_status?: InputMaybe<Scalars['onboarding_status']['input']>;
  password_hash?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** update columns of table "users" */
export type Users_Update_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'display_name'
  /** column name */
  | 'email'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'job_title'
  /** column name */
  | 'onboarding_status'
  /** column name */
  | 'password_hash'
  /** column name */
  | 'updated_at';

export type Users_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Users_Set_Input>;
  /** filter the rows which have to be updated */
  where: Users_Bool_Exp;
};

/** columns and relationships of "users_with_roles" */
export type Users_With_Roles = {
  __typename: 'users_with_roles';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  display_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  is_active: Maybe<Scalars['Boolean']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  onboarding_status: Maybe<Scalars['onboarding_status']['output']>;
  password_hash: Maybe<Scalars['String']['output']>;
  roles: Maybe<Scalars['json']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};


/** columns and relationships of "users_with_roles" */
export type Users_With_RolesRolesArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "users_with_roles" */
export type Users_With_Roles_Aggregate = {
  __typename: 'users_with_roles_aggregate';
  aggregate: Maybe<Users_With_Roles_Aggregate_Fields>;
  nodes: Array<Users_With_Roles>;
};

/** aggregate fields of "users_with_roles" */
export type Users_With_Roles_Aggregate_Fields = {
  __typename: 'users_with_roles_aggregate_fields';
  count: Scalars['Int']['output'];
  max: Maybe<Users_With_Roles_Max_Fields>;
  min: Maybe<Users_With_Roles_Min_Fields>;
};


/** aggregate fields of "users_with_roles" */
export type Users_With_Roles_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_With_Roles_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "users_with_roles". All fields are combined with a logical 'AND'. */
export type Users_With_Roles_Bool_Exp = {
  _and?: InputMaybe<Array<Users_With_Roles_Bool_Exp>>;
  _not?: InputMaybe<Users_With_Roles_Bool_Exp>;
  _or?: InputMaybe<Array<Users_With_Roles_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  display_name?: InputMaybe<String_Comparison_Exp>;
  email?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  is_active?: InputMaybe<Boolean_Comparison_Exp>;
  job_title?: InputMaybe<String_Comparison_Exp>;
  onboarding_status?: InputMaybe<Onboarding_Status_Comparison_Exp>;
  password_hash?: InputMaybe<String_Comparison_Exp>;
  roles?: InputMaybe<Json_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** aggregate max on columns */
export type Users_With_Roles_Max_Fields = {
  __typename: 'users_with_roles_max_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  display_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  onboarding_status: Maybe<Scalars['onboarding_status']['output']>;
  password_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type Users_With_Roles_Min_Fields = {
  __typename: 'users_with_roles_min_fields';
  created_at: Maybe<Scalars['timestamptz']['output']>;
  display_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['uuid']['output']>;
  job_title: Maybe<Scalars['String']['output']>;
  onboarding_status: Maybe<Scalars['onboarding_status']['output']>;
  password_hash: Maybe<Scalars['String']['output']>;
  updated_at: Maybe<Scalars['timestamptz']['output']>;
};

/** Ordering options when selecting data from "users_with_roles". */
export type Users_With_Roles_Order_By = {
  created_at?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
  email?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  is_active?: InputMaybe<Order_By>;
  job_title?: InputMaybe<Order_By>;
  onboarding_status?: InputMaybe<Order_By>;
  password_hash?: InputMaybe<Order_By>;
  roles?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** select columns of table "users_with_roles" */
export type Users_With_Roles_Select_Column =
  /** column name */
  | 'created_at'
  /** column name */
  | 'display_name'
  /** column name */
  | 'email'
  /** column name */
  | 'id'
  /** column name */
  | 'is_active'
  /** column name */
  | 'job_title'
  /** column name */
  | 'onboarding_status'
  /** column name */
  | 'password_hash'
  /** column name */
  | 'roles'
  /** column name */
  | 'updated_at';

/** Streaming cursor of the table "users_with_roles" */
export type Users_With_Roles_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_With_Roles_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_With_Roles_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  display_name?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  is_active?: InputMaybe<Scalars['Boolean']['input']>;
  job_title?: InputMaybe<Scalars['String']['input']>;
  onboarding_status?: InputMaybe<Scalars['onboarding_status']['input']>;
  password_hash?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<Scalars['json']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['uuid']['input']>;
  _gt?: InputMaybe<Scalars['uuid']['input']>;
  _gte?: InputMaybe<Scalars['uuid']['input']>;
  _in?: InputMaybe<Array<Scalars['uuid']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['uuid']['input']>;
  _lte?: InputMaybe<Scalars['uuid']['input']>;
  _neq?: InputMaybe<Scalars['uuid']['input']>;
  _nin?: InputMaybe<Array<Scalars['uuid']['input']>>;
};
