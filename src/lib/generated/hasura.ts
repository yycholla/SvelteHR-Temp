import gql from 'graphql-tag';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
	[_ in K]?: never;
};
export type Incremental<T> =
	| T
	| { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
	ID: { input: string; output: string };
	String: { input: string; output: string };
	Boolean: { input: boolean; output: boolean };
	Int: { input: number; output: number };
	Float: { input: number; output: number };
	numeric: { input: number; output: number };
	onboarding_status: {
		input: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated';
		output: 'PreHire' | 'Onboarding' | 'Active' | 'Terminated';
	};
	timestamptz: { input: string; output: string };
	uuid: { input: string; output: string };
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_comparison_exp = {
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

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_comparison_exp = {
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

/** ordering argument of a cursor */
export enum cursor_ordering {
	/** ascending ordering of the cursor */
	ASC = 'ASC',
	/** descending ordering of the cursor */
	DESC = 'DESC'
}

/** columns and relationships of "departments" */
export type departments = {
	__typename?: 'departments';
	budget?: Maybe<Scalars['numeric']['output']>;
	created_at?: Maybe<Scalars['timestamptz']['output']>;
	description?: Maybe<Scalars['String']['output']>;
	id: Scalars['uuid']['output'];
	is_active?: Maybe<Scalars['Boolean']['output']>;
	manager_id?: Maybe<Scalars['uuid']['output']>;
	name: Scalars['String']['output'];
	parent_department_id?: Maybe<Scalars['uuid']['output']>;
	updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregated selection of "departments" */
export type departments_aggregate = {
	__typename?: 'departments_aggregate';
	aggregate?: Maybe<departments_aggregate_fields>;
	nodes: Array<departments>;
};

/** aggregate fields of "departments" */
export type departments_aggregate_fields = {
	__typename?: 'departments_aggregate_fields';
	avg?: Maybe<departments_avg_fields>;
	count: Scalars['Int']['output'];
	max?: Maybe<departments_max_fields>;
	min?: Maybe<departments_min_fields>;
	stddev?: Maybe<departments_stddev_fields>;
	stddev_pop?: Maybe<departments_stddev_pop_fields>;
	stddev_samp?: Maybe<departments_stddev_samp_fields>;
	sum?: Maybe<departments_sum_fields>;
	var_pop?: Maybe<departments_var_pop_fields>;
	var_samp?: Maybe<departments_var_samp_fields>;
	variance?: Maybe<departments_variance_fields>;
};

/** aggregate fields of "departments" */
export type departments_aggregate_fieldscountArgs = {
	columns?: InputMaybe<Array<departments_select_column>>;
	distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type departments_avg_fields = {
	__typename?: 'departments_avg_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "departments". All fields are combined with a logical 'AND'. */
export type departments_bool_exp = {
	_and?: InputMaybe<Array<departments_bool_exp>>;
	_not?: InputMaybe<departments_bool_exp>;
	_or?: InputMaybe<Array<departments_bool_exp>>;
	budget?: InputMaybe<numeric_comparison_exp>;
	created_at?: InputMaybe<timestamptz_comparison_exp>;
	description?: InputMaybe<String_comparison_exp>;
	id?: InputMaybe<uuid_comparison_exp>;
	is_active?: InputMaybe<Boolean_comparison_exp>;
	manager_id?: InputMaybe<uuid_comparison_exp>;
	name?: InputMaybe<String_comparison_exp>;
	parent_department_id?: InputMaybe<uuid_comparison_exp>;
	updated_at?: InputMaybe<timestamptz_comparison_exp>;
};

/** unique or primary key constraints on table "departments" */
export enum departments_constraint {
	/** unique or primary key constraint on columns "name" */
	departments_name_key = 'departments_name_key',
	/** unique or primary key constraint on columns "id" */
	departments_pkey = 'departments_pkey'
}

/** input type for incrementing numeric columns in table "departments" */
export type departments_inc_input = {
	budget?: InputMaybe<Scalars['numeric']['input']>;
};

/** input type for inserting data into table "departments" */
export type departments_insert_input = {
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

/** aggregate max on columns */
export type departments_max_fields = {
	__typename?: 'departments_max_fields';
	budget?: Maybe<Scalars['numeric']['output']>;
	created_at?: Maybe<Scalars['timestamptz']['output']>;
	description?: Maybe<Scalars['String']['output']>;
	id?: Maybe<Scalars['uuid']['output']>;
	manager_id?: Maybe<Scalars['uuid']['output']>;
	name?: Maybe<Scalars['String']['output']>;
	parent_department_id?: Maybe<Scalars['uuid']['output']>;
	updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type departments_min_fields = {
	__typename?: 'departments_min_fields';
	budget?: Maybe<Scalars['numeric']['output']>;
	created_at?: Maybe<Scalars['timestamptz']['output']>;
	description?: Maybe<Scalars['String']['output']>;
	id?: Maybe<Scalars['uuid']['output']>;
	manager_id?: Maybe<Scalars['uuid']['output']>;
	name?: Maybe<Scalars['String']['output']>;
	parent_department_id?: Maybe<Scalars['uuid']['output']>;
	updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** response of any mutation on the table "departments" */
export type departments_mutation_response = {
	__typename?: 'departments_mutation_response';
	/** number of rows affected by the mutation */
	affected_rows: Scalars['Int']['output'];
	/** data from the rows affected by the mutation */
	returning: Array<departments>;
};

/** on_conflict condition type for table "departments" */
export type departments_on_conflict = {
	constraint: departments_constraint;
	update_columns?: Array<departments_update_column>;
	where?: InputMaybe<departments_bool_exp>;
};

/** Ordering options when selecting data from "departments". */
export type departments_order_by = {
	budget?: InputMaybe<order_by>;
	created_at?: InputMaybe<order_by>;
	description?: InputMaybe<order_by>;
	id?: InputMaybe<order_by>;
	is_active?: InputMaybe<order_by>;
	manager_id?: InputMaybe<order_by>;
	name?: InputMaybe<order_by>;
	parent_department_id?: InputMaybe<order_by>;
	updated_at?: InputMaybe<order_by>;
};

/** primary key columns input for table: departments */
export type departments_pk_columns_input = {
	id: Scalars['uuid']['input'];
};

/** select columns of table "departments" */
export enum departments_select_column {
	/** column name */
	budget = 'budget',
	/** column name */
	created_at = 'created_at',
	/** column name */
	description = 'description',
	/** column name */
	id = 'id',
	/** column name */
	is_active = 'is_active',
	/** column name */
	manager_id = 'manager_id',
	/** column name */
	name = 'name',
	/** column name */
	parent_department_id = 'parent_department_id',
	/** column name */
	updated_at = 'updated_at'
}

/** input type for updating data in table "departments" */
export type departments_set_input = {
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
export type departments_stddev_fields = {
	__typename?: 'departments_stddev_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type departments_stddev_pop_fields = {
	__typename?: 'departments_stddev_pop_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type departments_stddev_samp_fields = {
	__typename?: 'departments_stddev_samp_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "departments" */
export type departments_stream_cursor_input = {
	/** Stream column input with initial value */
	initial_value: departments_stream_cursor_value_input;
	/** cursor ordering */
	ordering?: InputMaybe<cursor_ordering>;
};

/** Initial value of the column from where the streaming should start */
export type departments_stream_cursor_value_input = {
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
export type departments_sum_fields = {
	__typename?: 'departments_sum_fields';
	budget?: Maybe<Scalars['numeric']['output']>;
};

/** update columns of table "departments" */
export enum departments_update_column {
	/** column name */
	budget = 'budget',
	/** column name */
	created_at = 'created_at',
	/** column name */
	description = 'description',
	/** column name */
	id = 'id',
	/** column name */
	is_active = 'is_active',
	/** column name */
	manager_id = 'manager_id',
	/** column name */
	name = 'name',
	/** column name */
	parent_department_id = 'parent_department_id',
	/** column name */
	updated_at = 'updated_at'
}

export type departments_updates = {
	/** increments the numeric columns with given value of the filtered values */
	_inc?: InputMaybe<departments_inc_input>;
	/** sets the columns of the filtered rows to the given values */
	_set?: InputMaybe<departments_set_input>;
	/** filter the rows which have to be updated */
	where: departments_bool_exp;
};

/** aggregate var_pop on columns */
export type departments_var_pop_fields = {
	__typename?: 'departments_var_pop_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type departments_var_samp_fields = {
	__typename?: 'departments_var_samp_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type departments_variance_fields = {
	__typename?: 'departments_variance_fields';
	budget?: Maybe<Scalars['Float']['output']>;
};

/** mutation root */
export type mutation_root = {
	__typename?: 'mutation_root';
	/** delete data from the table: "departments" */
	delete_departments?: Maybe<departments_mutation_response>;
	/** delete single row from the table: "departments" */
	delete_departments_by_pk?: Maybe<departments>;
	/** delete data from the table: "users" */
	delete_users?: Maybe<users_mutation_response>;
	/** delete single row from the table: "users" */
	delete_users_by_pk?: Maybe<users>;
	/** insert data into the table: "departments" */
	insert_departments?: Maybe<departments_mutation_response>;
	/** insert a single row into the table: "departments" */
	insert_departments_one?: Maybe<departments>;
	/** insert data into the table: "users" */
	insert_users?: Maybe<users_mutation_response>;
	/** insert a single row into the table: "users" */
	insert_users_one?: Maybe<users>;
	/** update data of the table: "departments" */
	update_departments?: Maybe<departments_mutation_response>;
	/** update single row of the table: "departments" */
	update_departments_by_pk?: Maybe<departments>;
	/** update multiples rows of table: "departments" */
	update_departments_many?: Maybe<Array<Maybe<departments_mutation_response>>>;
	/** update data of the table: "users" */
	update_users?: Maybe<users_mutation_response>;
	/** update single row of the table: "users" */
	update_users_by_pk?: Maybe<users>;
	/** update multiples rows of table: "users" */
	update_users_many?: Maybe<Array<Maybe<users_mutation_response>>>;
};

/** mutation root */
export type mutation_rootdelete_departmentsArgs = {
	where: departments_bool_exp;
};

/** mutation root */
export type mutation_rootdelete_departments_by_pkArgs = {
	id: Scalars['uuid']['input'];
};

/** mutation root */
export type mutation_rootdelete_usersArgs = {
	where: users_bool_exp;
};

/** mutation root */
export type mutation_rootdelete_users_by_pkArgs = {
	id: Scalars['uuid']['input'];
};

/** mutation root */
export type mutation_rootinsert_departmentsArgs = {
	objects: Array<departments_insert_input>;
	on_conflict?: InputMaybe<departments_on_conflict>;
};

/** mutation root */
export type mutation_rootinsert_departments_oneArgs = {
	object: departments_insert_input;
	on_conflict?: InputMaybe<departments_on_conflict>;
};

/** mutation root */
export type mutation_rootinsert_usersArgs = {
	objects: Array<users_insert_input>;
	on_conflict?: InputMaybe<users_on_conflict>;
};

/** mutation root */
export type mutation_rootinsert_users_oneArgs = {
	object: users_insert_input;
	on_conflict?: InputMaybe<users_on_conflict>;
};

/** mutation root */
export type mutation_rootupdate_departmentsArgs = {
	_inc?: InputMaybe<departments_inc_input>;
	_set?: InputMaybe<departments_set_input>;
	where: departments_bool_exp;
};

/** mutation root */
export type mutation_rootupdate_departments_by_pkArgs = {
	_inc?: InputMaybe<departments_inc_input>;
	_set?: InputMaybe<departments_set_input>;
	pk_columns: departments_pk_columns_input;
};

/** mutation root */
export type mutation_rootupdate_departments_manyArgs = {
	updates: Array<departments_updates>;
};

/** mutation root */
export type mutation_rootupdate_usersArgs = {
	_set?: InputMaybe<users_set_input>;
	where: users_bool_exp;
};

/** mutation root */
export type mutation_rootupdate_users_by_pkArgs = {
	_set?: InputMaybe<users_set_input>;
	pk_columns: users_pk_columns_input;
};

/** mutation root */
export type mutation_rootupdate_users_manyArgs = {
	updates: Array<users_updates>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type numeric_comparison_exp = {
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

/** Boolean expression to compare columns of type "onboarding_status". All fields are combined with logical 'AND'. */
export type onboarding_status_comparison_exp = {
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
export enum order_by {
	/** in ascending order, nulls last */
	asc = 'asc',
	/** in ascending order, nulls first */
	asc_nulls_first = 'asc_nulls_first',
	/** in ascending order, nulls last */
	asc_nulls_last = 'asc_nulls_last',
	/** in descending order, nulls first */
	desc = 'desc',
	/** in descending order, nulls first */
	desc_nulls_first = 'desc_nulls_first',
	/** in descending order, nulls last */
	desc_nulls_last = 'desc_nulls_last'
}

export type query_root = {
	__typename?: 'query_root';
	/** fetch data from the table: "departments" */
	departments: Array<departments>;
	/** fetch aggregated fields from the table: "departments" */
	departments_aggregate: departments_aggregate;
	/** fetch data from the table: "departments" using primary key columns */
	departments_by_pk?: Maybe<departments>;
	/** fetch data from the table: "users" */
	users: Array<users>;
	/** fetch aggregated fields from the table: "users" */
	users_aggregate: users_aggregate;
	/** fetch data from the table: "users" using primary key columns */
	users_by_pk?: Maybe<users>;
};

export type query_rootdepartmentsArgs = {
	distinct_on?: InputMaybe<Array<departments_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<departments_order_by>>;
	where?: InputMaybe<departments_bool_exp>;
};

export type query_rootdepartments_aggregateArgs = {
	distinct_on?: InputMaybe<Array<departments_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<departments_order_by>>;
	where?: InputMaybe<departments_bool_exp>;
};

export type query_rootdepartments_by_pkArgs = {
	id: Scalars['uuid']['input'];
};

export type query_rootusersArgs = {
	distinct_on?: InputMaybe<Array<users_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<users_order_by>>;
	where?: InputMaybe<users_bool_exp>;
};

export type query_rootusers_aggregateArgs = {
	distinct_on?: InputMaybe<Array<users_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<users_order_by>>;
	where?: InputMaybe<users_bool_exp>;
};

export type query_rootusers_by_pkArgs = {
	id: Scalars['uuid']['input'];
};

export type subscription_root = {
	__typename?: 'subscription_root';
	/** fetch data from the table: "departments" */
	departments: Array<departments>;
	/** fetch aggregated fields from the table: "departments" */
	departments_aggregate: departments_aggregate;
	/** fetch data from the table: "departments" using primary key columns */
	departments_by_pk?: Maybe<departments>;
	/** fetch data from the table in a streaming manner: "departments" */
	departments_stream: Array<departments>;
	/** fetch data from the table: "users" */
	users: Array<users>;
	/** fetch aggregated fields from the table: "users" */
	users_aggregate: users_aggregate;
	/** fetch data from the table: "users" using primary key columns */
	users_by_pk?: Maybe<users>;
	/** fetch data from the table in a streaming manner: "users" */
	users_stream: Array<users>;
};

export type subscription_rootdepartmentsArgs = {
	distinct_on?: InputMaybe<Array<departments_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<departments_order_by>>;
	where?: InputMaybe<departments_bool_exp>;
};

export type subscription_rootdepartments_aggregateArgs = {
	distinct_on?: InputMaybe<Array<departments_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<departments_order_by>>;
	where?: InputMaybe<departments_bool_exp>;
};

export type subscription_rootdepartments_by_pkArgs = {
	id: Scalars['uuid']['input'];
};

export type subscription_rootdepartments_streamArgs = {
	batch_size: Scalars['Int']['input'];
	cursor: Array<InputMaybe<departments_stream_cursor_input>>;
	where?: InputMaybe<departments_bool_exp>;
};

export type subscription_rootusersArgs = {
	distinct_on?: InputMaybe<Array<users_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<users_order_by>>;
	where?: InputMaybe<users_bool_exp>;
};

export type subscription_rootusers_aggregateArgs = {
	distinct_on?: InputMaybe<Array<users_select_column>>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	order_by?: InputMaybe<Array<users_order_by>>;
	where?: InputMaybe<users_bool_exp>;
};

export type subscription_rootusers_by_pkArgs = {
	id: Scalars['uuid']['input'];
};

export type subscription_rootusers_streamArgs = {
	batch_size: Scalars['Int']['input'];
	cursor: Array<InputMaybe<users_stream_cursor_input>>;
	where?: InputMaybe<users_bool_exp>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type timestamptz_comparison_exp = {
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

/** columns and relationships of "users" */
export type users = {
	__typename?: 'users';
	created_at?: Maybe<Scalars['timestamptz']['output']>;
	display_name: Scalars['String']['output'];
	email: Scalars['String']['output'];
	id: Scalars['uuid']['output'];
	is_active?: Maybe<Scalars['Boolean']['output']>;
	job_title?: Maybe<Scalars['String']['output']>;
	onboarding_status?: Maybe<Scalars['onboarding_status']['output']>;
	password_hash: Scalars['String']['output'];
	updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregated selection of "users" */
export type users_aggregate = {
	__typename?: 'users_aggregate';
	aggregate?: Maybe<users_aggregate_fields>;
	nodes: Array<users>;
};

/** aggregate fields of "users" */
export type users_aggregate_fields = {
	__typename?: 'users_aggregate_fields';
	count: Scalars['Int']['output'];
	max?: Maybe<users_max_fields>;
	min?: Maybe<users_min_fields>;
};

/** aggregate fields of "users" */
export type users_aggregate_fieldscountArgs = {
	columns?: InputMaybe<Array<users_select_column>>;
	distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
export type users_bool_exp = {
	_and?: InputMaybe<Array<users_bool_exp>>;
	_not?: InputMaybe<users_bool_exp>;
	_or?: InputMaybe<Array<users_bool_exp>>;
	created_at?: InputMaybe<timestamptz_comparison_exp>;
	display_name?: InputMaybe<String_comparison_exp>;
	email?: InputMaybe<String_comparison_exp>;
	id?: InputMaybe<uuid_comparison_exp>;
	is_active?: InputMaybe<Boolean_comparison_exp>;
	job_title?: InputMaybe<String_comparison_exp>;
	onboarding_status?: InputMaybe<onboarding_status_comparison_exp>;
	password_hash?: InputMaybe<String_comparison_exp>;
	updated_at?: InputMaybe<timestamptz_comparison_exp>;
};

/** unique or primary key constraints on table "users" */
export enum users_constraint {
	/** unique or primary key constraint on columns "email" */
	users_email_key = 'users_email_key',
	/** unique or primary key constraint on columns "id" */
	users_pkey = 'users_pkey'
}

/** input type for inserting data into table "users" */
export type users_insert_input = {
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

/** aggregate max on columns */
export type users_max_fields = {
	__typename?: 'users_max_fields';
	created_at?: Maybe<Scalars['timestamptz']['output']>;
	display_name?: Maybe<Scalars['String']['output']>;
	email?: Maybe<Scalars['String']['output']>;
	id?: Maybe<Scalars['uuid']['output']>;
	job_title?: Maybe<Scalars['String']['output']>;
	onboarding_status?: Maybe<Scalars['onboarding_status']['output']>;
	password_hash?: Maybe<Scalars['String']['output']>;
	updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type users_min_fields = {
	__typename?: 'users_min_fields';
	created_at?: Maybe<Scalars['timestamptz']['output']>;
	display_name?: Maybe<Scalars['String']['output']>;
	email?: Maybe<Scalars['String']['output']>;
	id?: Maybe<Scalars['uuid']['output']>;
	job_title?: Maybe<Scalars['String']['output']>;
	onboarding_status?: Maybe<Scalars['onboarding_status']['output']>;
	password_hash?: Maybe<Scalars['String']['output']>;
	updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** response of any mutation on the table "users" */
export type users_mutation_response = {
	__typename?: 'users_mutation_response';
	/** number of rows affected by the mutation */
	affected_rows: Scalars['Int']['output'];
	/** data from the rows affected by the mutation */
	returning: Array<users>;
};

/** on_conflict condition type for table "users" */
export type users_on_conflict = {
	constraint: users_constraint;
	update_columns?: Array<users_update_column>;
	where?: InputMaybe<users_bool_exp>;
};

/** Ordering options when selecting data from "users". */
export type users_order_by = {
	created_at?: InputMaybe<order_by>;
	display_name?: InputMaybe<order_by>;
	email?: InputMaybe<order_by>;
	id?: InputMaybe<order_by>;
	is_active?: InputMaybe<order_by>;
	job_title?: InputMaybe<order_by>;
	onboarding_status?: InputMaybe<order_by>;
	password_hash?: InputMaybe<order_by>;
	updated_at?: InputMaybe<order_by>;
};

/** primary key columns input for table: users */
export type users_pk_columns_input = {
	id: Scalars['uuid']['input'];
};

/** select columns of table "users" */
export enum users_select_column {
	/** column name */
	created_at = 'created_at',
	/** column name */
	display_name = 'display_name',
	/** column name */
	email = 'email',
	/** column name */
	id = 'id',
	/** column name */
	is_active = 'is_active',
	/** column name */
	job_title = 'job_title',
	/** column name */
	onboarding_status = 'onboarding_status',
	/** column name */
	password_hash = 'password_hash',
	/** column name */
	updated_at = 'updated_at'
}

/** input type for updating data in table "users" */
export type users_set_input = {
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
export type users_stream_cursor_input = {
	/** Stream column input with initial value */
	initial_value: users_stream_cursor_value_input;
	/** cursor ordering */
	ordering?: InputMaybe<cursor_ordering>;
};

/** Initial value of the column from where the streaming should start */
export type users_stream_cursor_value_input = {
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
export enum users_update_column {
	/** column name */
	created_at = 'created_at',
	/** column name */
	display_name = 'display_name',
	/** column name */
	email = 'email',
	/** column name */
	id = 'id',
	/** column name */
	is_active = 'is_active',
	/** column name */
	job_title = 'job_title',
	/** column name */
	onboarding_status = 'onboarding_status',
	/** column name */
	password_hash = 'password_hash',
	/** column name */
	updated_at = 'updated_at'
}

export type users_updates = {
	/** sets the columns of the filtered rows to the given values */
	_set?: InputMaybe<users_set_input>;
	/** filter the rows which have to be updated */
	where: users_bool_exp;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type uuid_comparison_exp = {
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
