/* eslint-disable */
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
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
	/** A floating point number that requires more precision than IEEE 754 binary 64 */
	BigFloat: { input: number; output: number };
	/**
	 * A signed eight-byte integer. The upper big integer values are greater than the
	 * max value for a JavaScript number. Therefore all big integers will be output as
	 * strings and not numbers.
	 */
	BigInt: { input: number; output: number };
	/** A location in a connection that can be used for resuming pagination. */
	Cursor: { input: string; output: string };
	/** The day, does not include a time. */
	Date: { input: string; output: string };
	/**
	 * A point in time as described by the [ISO
	 * 8601](https://en.wikipedia.org/wiki/ISO_8601) standard. May or may not include a timezone.
	 */
	Datetime: { input: string; output: string };
	/** An IPv4 or IPv6 host address, and optionally its subnet. */
	InternetAddress: { input: any; output: any };
	/** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
	JSON: { input: any; output: any };
	/**
	 * A JSON Web Token defined by [RFC 7519](https://tools.ietf.org/html/rfc7519)
	 * which securely represents claims between two parties.
	 */
	JwtToken: { input: any; output: any };
	/** The exact time of day, does not include the date. May or may not have a timezone offset. */
	Time: { input: any; output: any };
	/** A universally unique identifier as defined by [RFC 4122](https://tools.ietf.org/html/rfc4122). */
	UUID: { input: string; output: string };
};

export type AccessLevel = 'CONFIDENTIAL' | 'EMPLOYEE_ONLY' | 'HR_ONLY' | 'MANAGER_ONLY' | 'PUBLIC';

export type AccrualFrequency = 'ANNUALLY' | 'BIWEEKLY' | 'MONTHLY' | 'PER_PAY_PERIOD' | 'QUARTERLY';

export type AnonymizationLevel = 'ANONYMIZED' | 'FULLY_ANONYMIZED' | 'NONE' | 'PSEUDONYMIZED';

/** All input for the `anonymizeUserData` mutation. */
export type AnonymizeUserDataInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pAnonymizationReason?: InputMaybe<Scalars['String']['input']>;
	pKeepAggregationData?: InputMaybe<Scalars['Boolean']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `anonymizeUserData` mutation. */
export type AnonymizeUserDataPayload = {
	__typename: 'AnonymizeUserDataPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

export type AuditActionType =
	| 'BULK_OPERATION'
	| 'CREATE'
	| 'DATA_ANONYMIZATION'
	| 'DATA_RETENTION'
	| 'DELETE'
	| 'EXPORT'
	| 'IMPORT'
	| 'LOGIN'
	| 'LOGOUT'
	| 'PERMISSION_CHANGE'
	| 'READ'
	| 'UPDATE';

/** Comprehensive audit trail for all system activities and data changes */
export type AuditLog = Node & {
	__typename: 'AuditLog';
	actionType: AuditActionType;
	apiEndpoint: Maybe<Scalars['String']['output']>;
	applicationName: Maybe<Scalars['String']['output']>;
	archiveDate: Maybe<Scalars['Date']['output']>;
	changedFields: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	consentReference: Maybe<Scalars['UUID']['output']>;
	containsPii: Maybe<Scalars['Boolean']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	dataClassification: Maybe<DataClassification>;
	environment: Maybe<Scalars['String']['output']>;
	httpMethod: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	ipAddress: Maybe<Scalars['InternetAddress']['output']>;
	isArchived: Maybe<Scalars['Boolean']['output']>;
	legalBasis: Maybe<Scalars['String']['output']>;
	newValues: Maybe<Scalars['JSON']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	oldValues: Maybe<Scalars['JSON']['output']>;
	piiFields: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	recordId: Maybe<Scalars['UUID']['output']>;
	requestId: Maybe<Scalars['String']['output']>;
	requiresConsent: Maybe<Scalars['Boolean']['output']>;
	retentionDate: Maybe<Scalars['Date']['output']>;
	sessionId: Maybe<Scalars['UUID']['output']>;
	tableName: Scalars['String']['output'];
	userAgent: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `AuditLog`. */
	userByUserId: Maybe<User>;
	userId: Maybe<Scalars['UUID']['output']>;
	/** Reads a single `UserSession` that is related to this `AuditLog`. */
	userSessionBySessionId: Maybe<UserSession>;
};

/**
 * A condition to be used against `AuditLog` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type AuditLogCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `sessionId` field. */
	sessionId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `tableName` field. */
	tableName?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `AuditLog` */
export type AuditLogInput = {
	actionType: AuditActionType;
	apiEndpoint?: InputMaybe<Scalars['String']['input']>;
	applicationName?: InputMaybe<Scalars['String']['input']>;
	archiveDate?: InputMaybe<Scalars['Date']['input']>;
	changedFields?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	consentReference?: InputMaybe<Scalars['UUID']['input']>;
	containsPii?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataClassification?: InputMaybe<DataClassification>;
	environment?: InputMaybe<Scalars['String']['input']>;
	httpMethod?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isArchived?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	newValues?: InputMaybe<Scalars['JSON']['input']>;
	oldValues?: InputMaybe<Scalars['JSON']['input']>;
	piiFields?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	recordId?: InputMaybe<Scalars['UUID']['input']>;
	requestId?: InputMaybe<Scalars['String']['input']>;
	requiresConsent?: InputMaybe<Scalars['Boolean']['input']>;
	retentionDate?: InputMaybe<Scalars['Date']['input']>;
	sessionId?: InputMaybe<Scalars['UUID']['input']>;
	tableName: Scalars['String']['input'];
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** Represents an update to a `AuditLog`. Fields that are set will be updated. */
export type AuditLogPatch = {
	actionType?: InputMaybe<AuditActionType>;
	apiEndpoint?: InputMaybe<Scalars['String']['input']>;
	applicationName?: InputMaybe<Scalars['String']['input']>;
	archiveDate?: InputMaybe<Scalars['Date']['input']>;
	changedFields?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	consentReference?: InputMaybe<Scalars['UUID']['input']>;
	containsPii?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataClassification?: InputMaybe<DataClassification>;
	environment?: InputMaybe<Scalars['String']['input']>;
	httpMethod?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isArchived?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	newValues?: InputMaybe<Scalars['JSON']['input']>;
	oldValues?: InputMaybe<Scalars['JSON']['input']>;
	piiFields?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	recordId?: InputMaybe<Scalars['UUID']['input']>;
	requestId?: InputMaybe<Scalars['String']['input']>;
	requiresConsent?: InputMaybe<Scalars['Boolean']['input']>;
	retentionDate?: InputMaybe<Scalars['Date']['input']>;
	sessionId?: InputMaybe<Scalars['UUID']['input']>;
	tableName?: InputMaybe<Scalars['String']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `AuditLog` values. */
export type AuditLogsConnection = {
	__typename: 'AuditLogsConnection';
	/** A list of edges which contains the `AuditLog` and cursor to aid in pagination. */
	edges: Array<AuditLogsEdge>;
	/** A list of `AuditLog` objects. */
	nodes: Array<AuditLog>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `AuditLog` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `AuditLog` edge in the connection. */
export type AuditLogsEdge = {
	__typename: 'AuditLogsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `AuditLog` at the end of the edge. */
	node: AuditLog;
};

/** Methods to use when ordering `AuditLog`. */
export type AuditLogsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'SESSION_ID_ASC'
	| 'SESSION_ID_DESC'
	| 'TABLE_NAME_ASC'
	| 'TABLE_NAME_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

export type AuthSession = Node & {
	__typename: 'AuthSession';
	createdAt: Maybe<Scalars['Datetime']['output']>;
	expiresAt: Scalars['Datetime']['output'];
	id: Scalars['UUID']['output'];
	ipAddress: Maybe<Scalars['InternetAddress']['output']>;
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	tokenHash: Scalars['String']['output'];
	userAgent: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `AuthSession`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `AuthSession` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type AuthSessionCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `AuthSession` */
export type AuthSessionInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	expiresAt: Scalars['Datetime']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	tokenHash: Scalars['String']['input'];
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `AuthSession`. Fields that are set will be updated. */
export type AuthSessionPatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	tokenHash?: InputMaybe<Scalars['String']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `AuthSession` values. */
export type AuthSessionsConnection = {
	__typename: 'AuthSessionsConnection';
	/** A list of edges which contains the `AuthSession` and cursor to aid in pagination. */
	edges: Array<AuthSessionsEdge>;
	/** A list of `AuthSession` objects. */
	nodes: Array<AuthSession>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `AuthSession` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `AuthSession` edge in the connection. */
export type AuthSessionsEdge = {
	__typename: 'AuthSessionsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `AuthSession` at the end of the edge. */
	node: AuthSession;
};

/** Methods to use when ordering `AuthSession`. */
export type AuthSessionsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** All input for the `authenticate` mutation. */
export type AuthenticateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	email: Scalars['String']['input'];
	password: Scalars['String']['input'];
};

/** The output of our `authenticate` mutation. */
export type AuthenticatePayload = {
	__typename: 'AuthenticatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	jwtToken: Maybe<Scalars['JwtToken']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** A connection to a list of `CalculateTurnoverRateRecord` values. */
export type CalculateTurnoverRateConnection = {
	__typename: 'CalculateTurnoverRateConnection';
	/** A list of edges which contains the `CalculateTurnoverRateRecord` and cursor to aid in pagination. */
	edges: Array<CalculateTurnoverRateEdge>;
	/** A list of `CalculateTurnoverRateRecord` objects. */
	nodes: Array<CalculateTurnoverRateRecord>;
	/** The count of *all* `CalculateTurnoverRateRecord` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `CalculateTurnoverRateRecord` edge in the connection. */
export type CalculateTurnoverRateEdge = {
	__typename: 'CalculateTurnoverRateEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `CalculateTurnoverRateRecord` at the end of the edge. */
	node: CalculateTurnoverRateRecord;
};

/** The return type of our `calculateTurnoverRate` query. */
export type CalculateTurnoverRateRecord = {
	__typename: 'CalculateTurnoverRateRecord';
	avgEmployees: Maybe<Scalars['BigFloat']['output']>;
	newHires: Maybe<Scalars['Int']['output']>;
	periodEnd: Maybe<Scalars['Date']['output']>;
	periodStart: Maybe<Scalars['Date']['output']>;
	terminations: Maybe<Scalars['Int']['output']>;
	totalEmployeesStart: Maybe<Scalars['Int']['output']>;
	turnoverRatePercent: Maybe<Scalars['BigFloat']['output']>;
};

/** All input for the `checkPrivacyComplianceStatus` mutation. */
export type CheckPrivacyComplianceStatusInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pTableName?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `checkPrivacyComplianceStatus` mutation. */
export type CheckPrivacyComplianceStatusPayload = {
	__typename: 'CheckPrivacyComplianceStatusPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<CheckPrivacyComplianceStatusRecord>>>;
};

/** The return type of our `checkPrivacyComplianceStatus` mutation. */
export type CheckPrivacyComplianceStatusRecord = {
	__typename: 'CheckPrivacyComplianceStatusRecord';
	complianceScore: Maybe<Scalars['Int']['output']>;
	recordsMissingConsent: Maybe<Scalars['BigInt']['output']>;
	recordsOverdueDeletion: Maybe<Scalars['BigInt']['output']>;
	recordsWithMetadata: Maybe<Scalars['BigInt']['output']>;
	tableName: Maybe<Scalars['String']['output']>;
	totalRecords: Maybe<Scalars['BigInt']['output']>;
};

/** All input for the `checkRetentionCompliance` mutation. */
export type CheckRetentionComplianceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pTableName?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `checkRetentionCompliance` mutation. */
export type CheckRetentionCompliancePayload = {
	__typename: 'CheckRetentionCompliancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<CheckRetentionComplianceRecord>>>;
};

/** The return type of our `checkRetentionCompliance` mutation. */
export type CheckRetentionComplianceRecord = {
	__typename: 'CheckRetentionComplianceRecord';
	complianceStatus: Maybe<Scalars['String']['output']>;
	oldestRecordDate: Maybe<Scalars['Date']['output']>;
	policyName: Maybe<Scalars['String']['output']>;
	recordsDueForDeletion: Maybe<Scalars['BigInt']['output']>;
	tableName: Maybe<Scalars['String']['output']>;
};

export type CompensationType =
	| 'BASE_SALARY'
	| 'BENEFITS'
	| 'BONUS'
	| 'COMMISSION'
	| 'HOURLY_WAGE'
	| 'OVERTIME'
	| 'REIMBURSEMENT'
	| 'STOCK_OPTIONS';

/** A connection to a list of `Competency` values. */
export type CompetenciesConnection = {
	__typename: 'CompetenciesConnection';
	/** A list of edges which contains the `Competency` and cursor to aid in pagination. */
	edges: Array<CompetenciesEdge>;
	/** A list of `Competency` objects. */
	nodes: Array<Competency>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `Competency` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `Competency` edge in the connection. */
export type CompetenciesEdge = {
	__typename: 'CompetenciesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `Competency` at the end of the edge. */
	node: Competency;
};

/** Methods to use when ordering `Competency`. */
export type CompetenciesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** Core competencies evaluated during performance reviews */
export type Competency = Node & {
	__typename: 'Competency';
	appliesToRoles: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	category: Maybe<Scalars['String']['output']>;
	/** Reads and enables pagination through a set of `CompetencyRating`. */
	competencyRatingsByCompetencyId: CompetencyRatingsConnection;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	description: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	name: Scalars['String']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	sortOrder: Maybe<Scalars['Int']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	weight: Maybe<Scalars['BigFloat']['output']>;
};

/** Core competencies evaluated during performance reviews */
export type CompetencyCompetencyRatingsByCompetencyIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<CompetencyRatingCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<CompetencyRatingsOrderBy>>;
};

/**
 * A condition to be used against `Competency` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type CompetencyCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `Competency` */
export type CompetencyInput = {
	appliesToRoles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	category?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	name: Scalars['String']['input'];
	sortOrder?: InputMaybe<Scalars['Int']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	weight?: InputMaybe<Scalars['BigFloat']['input']>;
};

export type CompetencyLevel =
	| 'BELOW_EXPECTATIONS'
	| 'EXCEEDS_EXPECTATIONS'
	| 'MEETS_EXPECTATIONS'
	| 'OUTSTANDING';

/** Represents an update to a `Competency`. Fields that are set will be updated. */
export type CompetencyPatch = {
	appliesToRoles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	category?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	name?: InputMaybe<Scalars['String']['input']>;
	sortOrder?: InputMaybe<Scalars['Int']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	weight?: InputMaybe<Scalars['BigFloat']['input']>;
};

/** Competency ratings by employee and manager for each review */
export type CompetencyRating = Node & {
	__typename: 'CompetencyRating';
	/** Reads a single `Competency` that is related to this `CompetencyRating`. */
	competencyByCompetencyId: Maybe<Competency>;
	competencyId: Scalars['UUID']['output'];
	createdAt: Maybe<Scalars['Datetime']['output']>;
	developmentActions: Maybe<Scalars['String']['output']>;
	employeeComment: Maybe<Scalars['String']['output']>;
	employeeRating: Maybe<CompetencyLevel>;
	finalRating: Maybe<CompetencyLevel>;
	id: Scalars['UUID']['output'];
	managerComment: Maybe<Scalars['String']['output']>;
	managerRating: Maybe<CompetencyLevel>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads a single `PerformanceReview` that is related to this `CompetencyRating`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	reviewId: Scalars['UUID']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `CompetencyRating` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type CompetencyRatingCondition = {
	/** Checks for equality with the object’s `competencyId` field. */
	competencyId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `reviewId` field. */
	reviewId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `CompetencyRating` */
export type CompetencyRatingInput = {
	competencyId: Scalars['UUID']['input'];
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	developmentActions?: InputMaybe<Scalars['String']['input']>;
	employeeComment?: InputMaybe<Scalars['String']['input']>;
	employeeRating?: InputMaybe<CompetencyLevel>;
	finalRating?: InputMaybe<CompetencyLevel>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	managerComment?: InputMaybe<Scalars['String']['input']>;
	managerRating?: InputMaybe<CompetencyLevel>;
	reviewId: Scalars['UUID']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `CompetencyRating`. Fields that are set will be updated. */
export type CompetencyRatingPatch = {
	competencyId?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	developmentActions?: InputMaybe<Scalars['String']['input']>;
	employeeComment?: InputMaybe<Scalars['String']['input']>;
	employeeRating?: InputMaybe<CompetencyLevel>;
	finalRating?: InputMaybe<CompetencyLevel>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	managerComment?: InputMaybe<Scalars['String']['input']>;
	managerRating?: InputMaybe<CompetencyLevel>;
	reviewId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `CompetencyRating` values. */
export type CompetencyRatingsConnection = {
	__typename: 'CompetencyRatingsConnection';
	/** A list of edges which contains the `CompetencyRating` and cursor to aid in pagination. */
	edges: Array<CompetencyRatingsEdge>;
	/** A list of `CompetencyRating` objects. */
	nodes: Array<CompetencyRating>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `CompetencyRating` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `CompetencyRating` edge in the connection. */
export type CompetencyRatingsEdge = {
	__typename: 'CompetencyRatingsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `CompetencyRating` at the end of the edge. */
	node: CompetencyRating;
};

/** Methods to use when ordering `CompetencyRating`. */
export type CompetencyRatingsOrderBy =
	| 'COMPETENCY_ID_ASC'
	| 'COMPETENCY_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'REVIEW_ID_ASC'
	| 'REVIEW_ID_DESC';

/** All input for the `completeWorkflowTask` mutation. */
export type CompleteWorkflowTaskInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pCompletionData?: InputMaybe<Scalars['JSON']['input']>;
	pTaskId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `completeWorkflowTask` mutation. */
export type CompleteWorkflowTaskPayload = {
	__typename: 'CompleteWorkflowTaskPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	completedTask: Maybe<WorkflowTask>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedById: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedToId: Maybe<User>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowTask`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowTask`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
	/** An edge for our `WorkflowTask`. May be used by Relay 1. */
	workflowTaskEdge: Maybe<WorkflowTasksEdge>;
};

/** The output of our `completeWorkflowTask` mutation. */
export type CompleteWorkflowTaskPayloadWorkflowTaskEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/** GDPR consent management and tracking */
export type ConsentRecord = Node & {
	__typename: 'ConsentRecord';
	consentEvidence: Maybe<Scalars['JSON']['output']>;
	consentMethod: Maybe<Scalars['String']['output']>;
	consentType: Scalars['String']['output'];
	consentVersion: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	expiresAt: Maybe<Scalars['Datetime']['output']>;
	givenAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	internationalTransfer: Maybe<Scalars['Boolean']['output']>;
	legalBasis: Maybe<Scalars['String']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	previousConsentId: Maybe<Scalars['UUID']['output']>;
	processingCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	purpose: Scalars['String']['output'];
	status: ConsentStatus;
	thirdParties: Maybe<Scalars['JSON']['output']>;
	thirdPartySharing: Maybe<Scalars['Boolean']['output']>;
	transferSafeguards: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `ConsentRecord`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	withdrawalReason: Maybe<Scalars['String']['output']>;
	withdrawnAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `ConsentRecord` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type ConsentRecordCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<ConsentStatus>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `ConsentRecord` */
export type ConsentRecordInput = {
	consentEvidence?: InputMaybe<Scalars['JSON']['input']>;
	consentMethod?: InputMaybe<Scalars['String']['input']>;
	consentType: Scalars['String']['input'];
	consentVersion?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	givenAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	internationalTransfer?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	previousConsentId?: InputMaybe<Scalars['UUID']['input']>;
	processingCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	purpose: Scalars['String']['input'];
	status?: InputMaybe<ConsentStatus>;
	thirdParties?: InputMaybe<Scalars['JSON']['input']>;
	thirdPartySharing?: InputMaybe<Scalars['Boolean']['input']>;
	transferSafeguards?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
	withdrawalReason?: InputMaybe<Scalars['String']['input']>;
	withdrawnAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `ConsentRecord`. Fields that are set will be updated. */
export type ConsentRecordPatch = {
	consentEvidence?: InputMaybe<Scalars['JSON']['input']>;
	consentMethod?: InputMaybe<Scalars['String']['input']>;
	consentType?: InputMaybe<Scalars['String']['input']>;
	consentVersion?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	givenAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	internationalTransfer?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	previousConsentId?: InputMaybe<Scalars['UUID']['input']>;
	processingCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	purpose?: InputMaybe<Scalars['String']['input']>;
	status?: InputMaybe<ConsentStatus>;
	thirdParties?: InputMaybe<Scalars['JSON']['input']>;
	thirdPartySharing?: InputMaybe<Scalars['Boolean']['input']>;
	transferSafeguards?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	withdrawalReason?: InputMaybe<Scalars['String']['input']>;
	withdrawnAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `ConsentRecord` values. */
export type ConsentRecordsConnection = {
	__typename: 'ConsentRecordsConnection';
	/** A list of edges which contains the `ConsentRecord` and cursor to aid in pagination. */
	edges: Array<ConsentRecordsEdge>;
	/** A list of `ConsentRecord` objects. */
	nodes: Array<ConsentRecord>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `ConsentRecord` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `ConsentRecord` edge in the connection. */
export type ConsentRecordsEdge = {
	__typename: 'ConsentRecordsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `ConsentRecord` at the end of the edge. */
	node: ConsentRecord;
};

/** Methods to use when ordering `ConsentRecord`. */
export type ConsentRecordsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

export type ConsentStatus = 'EXPIRED' | 'GIVEN' | 'NOT_REQUIRED' | 'PENDING' | 'WITHDRAWN';

/** Employee contact details and emergency contacts */
export type ContactInfo = Node & {
	__typename: 'ContactInfo';
	addressLine1: Maybe<Scalars['String']['output']>;
	addressLine2: Maybe<Scalars['String']['output']>;
	city: Maybe<Scalars['String']['output']>;
	country: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	emergencyContactName: Maybe<Scalars['String']['output']>;
	emergencyContactPhone: Maybe<Scalars['String']['output']>;
	employeeId: Scalars['UUID']['output'];
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	phoneNumber: Maybe<Scalars['String']['output']>;
	postalCode: Maybe<Scalars['String']['output']>;
	stateProvince: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `ContactInfo`. */
	userByEmployeeId: Maybe<User>;
};

/**
 * A condition to be used against `ContactInfo` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type ContactInfoCondition = {
	/** Checks for equality with the object’s `employeeId` field. */
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `ContactInfo` */
export type ContactInfoInput = {
	addressLine1?: InputMaybe<Scalars['String']['input']>;
	addressLine2?: InputMaybe<Scalars['String']['input']>;
	city?: InputMaybe<Scalars['String']['input']>;
	country?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	emergencyContactName?: InputMaybe<Scalars['String']['input']>;
	emergencyContactPhone?: InputMaybe<Scalars['String']['input']>;
	employeeId: Scalars['UUID']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	phoneNumber?: InputMaybe<Scalars['String']['input']>;
	postalCode?: InputMaybe<Scalars['String']['input']>;
	stateProvince?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `ContactInfo`. Fields that are set will be updated. */
export type ContactInfoPatch = {
	addressLine1?: InputMaybe<Scalars['String']['input']>;
	addressLine2?: InputMaybe<Scalars['String']['input']>;
	city?: InputMaybe<Scalars['String']['input']>;
	country?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	emergencyContactName?: InputMaybe<Scalars['String']['input']>;
	emergencyContactPhone?: InputMaybe<Scalars['String']['input']>;
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	phoneNumber?: InputMaybe<Scalars['String']['input']>;
	postalCode?: InputMaybe<Scalars['String']['input']>;
	stateProvince?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `ContactInfo` values. */
export type ContactInfosConnection = {
	__typename: 'ContactInfosConnection';
	/** A list of edges which contains the `ContactInfo` and cursor to aid in pagination. */
	edges: Array<ContactInfosEdge>;
	/** A list of `ContactInfo` objects. */
	nodes: Array<ContactInfo>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `ContactInfo` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `ContactInfo` edge in the connection. */
export type ContactInfosEdge = {
	__typename: 'ContactInfosEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `ContactInfo` at the end of the edge. */
	node: ContactInfo;
};

/** Methods to use when ordering `ContactInfo`. */
export type ContactInfosOrderBy =
	| 'EMPLOYEE_ID_ASC'
	| 'EMPLOYEE_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** All input for the create `AuditLog` mutation. */
export type CreateAuditLogInput = {
	/** The `AuditLog` to be created by this mutation. */
	auditLog: AuditLogInput;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our create `AuditLog` mutation. */
export type CreateAuditLogPayload = {
	__typename: 'CreateAuditLogPayload';
	/** The `AuditLog` that was created by this mutation. */
	auditLog: Maybe<AuditLog>;
	/** An edge for our `AuditLog`. May be used by Relay 1. */
	auditLogEdge: Maybe<AuditLogsEdge>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `AuditLog`. */
	userByUserId: Maybe<User>;
	/** Reads a single `UserSession` that is related to this `AuditLog`. */
	userSessionBySessionId: Maybe<UserSession>;
};

/** The output of our create `AuditLog` mutation. */
export type CreateAuditLogPayloadAuditLogEdgeArgs = {
	orderBy?: InputMaybe<Array<AuditLogsOrderBy>>;
};

/** All input for the create `AuthSession` mutation. */
export type CreateAuthSessionInput = {
	/** The `AuthSession` to be created by this mutation. */
	authSession: AuthSessionInput;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our create `AuthSession` mutation. */
export type CreateAuthSessionPayload = {
	__typename: 'CreateAuthSessionPayload';
	/** The `AuthSession` that was created by this mutation. */
	authSession: Maybe<AuthSession>;
	/** An edge for our `AuthSession`. May be used by Relay 1. */
	authSessionEdge: Maybe<AuthSessionsEdge>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `AuthSession`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `AuthSession` mutation. */
export type CreateAuthSessionPayloadAuthSessionEdgeArgs = {
	orderBy?: InputMaybe<Array<AuthSessionsOrderBy>>;
};

/** All input for the create `Competency` mutation. */
export type CreateCompetencyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `Competency` to be created by this mutation. */
	competency: CompetencyInput;
};

/** The output of our create `Competency` mutation. */
export type CreateCompetencyPayload = {
	__typename: 'CreateCompetencyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Competency` that was created by this mutation. */
	competency: Maybe<Competency>;
	/** An edge for our `Competency`. May be used by Relay 1. */
	competencyEdge: Maybe<CompetenciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `Competency` mutation. */
export type CreateCompetencyPayloadCompetencyEdgeArgs = {
	orderBy?: InputMaybe<Array<CompetenciesOrderBy>>;
};

/** All input for the create `CompetencyRating` mutation. */
export type CreateCompetencyRatingInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `CompetencyRating` to be created by this mutation. */
	competencyRating: CompetencyRatingInput;
};

/** The output of our create `CompetencyRating` mutation. */
export type CreateCompetencyRatingPayload = {
	__typename: 'CreateCompetencyRatingPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Competency` that is related to this `CompetencyRating`. */
	competencyByCompetencyId: Maybe<Competency>;
	/** The `CompetencyRating` that was created by this mutation. */
	competencyRating: Maybe<CompetencyRating>;
	/** An edge for our `CompetencyRating`. May be used by Relay 1. */
	competencyRatingEdge: Maybe<CompetencyRatingsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `CompetencyRating`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `CompetencyRating` mutation. */
export type CreateCompetencyRatingPayloadCompetencyRatingEdgeArgs = {
	orderBy?: InputMaybe<Array<CompetencyRatingsOrderBy>>;
};

/** All input for the create `ConsentRecord` mutation. */
export type CreateConsentRecordInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `ConsentRecord` to be created by this mutation. */
	consentRecord: ConsentRecordInput;
};

/** The output of our create `ConsentRecord` mutation. */
export type CreateConsentRecordPayload = {
	__typename: 'CreateConsentRecordPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ConsentRecord` that was created by this mutation. */
	consentRecord: Maybe<ConsentRecord>;
	/** An edge for our `ConsentRecord`. May be used by Relay 1. */
	consentRecordEdge: Maybe<ConsentRecordsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ConsentRecord`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `ConsentRecord` mutation. */
export type CreateConsentRecordPayloadConsentRecordEdgeArgs = {
	orderBy?: InputMaybe<Array<ConsentRecordsOrderBy>>;
};

/** All input for the create `ContactInfo` mutation. */
export type CreateContactInfoInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `ContactInfo` to be created by this mutation. */
	contactInfo: ContactInfoInput;
};

/** The output of our create `ContactInfo` mutation. */
export type CreateContactInfoPayload = {
	__typename: 'CreateContactInfoPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ContactInfo` that was created by this mutation. */
	contactInfo: Maybe<ContactInfo>;
	/** An edge for our `ContactInfo`. May be used by Relay 1. */
	contactInfoEdge: Maybe<ContactInfosEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ContactInfo`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our create `ContactInfo` mutation. */
export type CreateContactInfoPayloadContactInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<ContactInfosOrderBy>>;
};

/** All input for the create `DataBreachIncident` mutation. */
export type CreateDataBreachIncidentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DataBreachIncident` to be created by this mutation. */
	dataBreachIncident: DataBreachIncidentInput;
};

/** The output of our create `DataBreachIncident` mutation. */
export type CreateDataBreachIncidentPayload = {
	__typename: 'CreateDataBreachIncidentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataBreachIncident` that was created by this mutation. */
	dataBreachIncident: Maybe<DataBreachIncident>;
	/** An edge for our `DataBreachIncident`. May be used by Relay 1. */
	dataBreachIncidentEdge: Maybe<DataBreachIncidentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `DataBreachIncident` mutation. */
export type CreateDataBreachIncidentPayloadDataBreachIncidentEdgeArgs = {
	orderBy?: InputMaybe<Array<DataBreachIncidentsOrderBy>>;
};

/** All input for the create `DataLineage` mutation. */
export type CreateDataLineageInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DataLineage` to be created by this mutation. */
	dataLineage: DataLineageInput;
};

/** The output of our create `DataLineage` mutation. */
export type CreateDataLineagePayload = {
	__typename: 'CreateDataLineagePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataLineage` that was created by this mutation. */
	dataLineage: Maybe<DataLineage>;
	/** An edge for our `DataLineage`. May be used by Relay 1. */
	dataLineageEdge: Maybe<DataLineagesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DataLineage`. */
	userByPerformedByUserId: Maybe<User>;
};

/** The output of our create `DataLineage` mutation. */
export type CreateDataLineagePayloadDataLineageEdgeArgs = {
	orderBy?: InputMaybe<Array<DataLineagesOrderBy>>;
};

/** All input for the `createDataProtectionMetadata` mutation. */
export type CreateDataProtectionMetadataInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pColumnName?: InputMaybe<Scalars['String']['input']>;
	pConsentRequired?: InputMaybe<Scalars['Boolean']['input']>;
	pDataClassification?: InputMaybe<DataClassification>;
	pEncryptionStatus?: InputMaybe<EncryptionStatus>;
	pLegalBasisReference?: InputMaybe<Scalars['String']['input']>;
	pRecordId?: InputMaybe<Scalars['UUID']['input']>;
	pSensitivityScore?: InputMaybe<Scalars['Int']['input']>;
	pTableName?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `createDataProtectionMetadata` mutation. */
export type CreateDataProtectionMetadataPayload = {
	__typename: 'CreateDataProtectionMetadataPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	metadataId: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the create `DataProtectionMetadatum` mutation. */
export type CreateDataProtectionMetadatumInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DataProtectionMetadatum` to be created by this mutation. */
	dataProtectionMetadatum: DataProtectionMetadatumInput;
};

/** The output of our create `DataProtectionMetadatum` mutation. */
export type CreateDataProtectionMetadatumPayload = {
	__typename: 'CreateDataProtectionMetadatumPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataProtectionMetadatum` that was created by this mutation. */
	dataProtectionMetadatum: Maybe<DataProtectionMetadatum>;
	/** An edge for our `DataProtectionMetadatum`. May be used by Relay 1. */
	dataProtectionMetadatumEdge: Maybe<DataProtectionMetadataEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `DataProtectionMetadatum` mutation. */
export type CreateDataProtectionMetadatumPayloadDataProtectionMetadatumEdgeArgs = {
	orderBy?: InputMaybe<Array<DataProtectionMetadataOrderBy>>;
};

/** All input for the create `DataRetentionPolicy` mutation. */
export type CreateDataRetentionPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DataRetentionPolicy` to be created by this mutation. */
	dataRetentionPolicy: DataRetentionPolicyInput;
};

/** The output of our create `DataRetentionPolicy` mutation. */
export type CreateDataRetentionPolicyPayload = {
	__typename: 'CreateDataRetentionPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataRetentionPolicy` that was created by this mutation. */
	dataRetentionPolicy: Maybe<DataRetentionPolicy>;
	/** An edge for our `DataRetentionPolicy`. May be used by Relay 1. */
	dataRetentionPolicyEdge: Maybe<DataRetentionPoliciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `DataRetentionPolicy` mutation. */
export type CreateDataRetentionPolicyPayloadDataRetentionPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<DataRetentionPoliciesOrderBy>>;
};

/** All input for the create `Department` mutation. */
export type CreateDepartmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `Department` to be created by this mutation. */
	department: DepartmentInput;
};

/** The output of our create `Department` mutation. */
export type CreateDepartmentPayload = {
	__typename: 'CreateDepartmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Department` that was created by this mutation. */
	department: Maybe<Department>;
	/** Reads a single `Department` that is related to this `Department`. */
	departmentByParentDepartmentId: Maybe<Department>;
	/** An edge for our `Department`. May be used by Relay 1. */
	departmentEdge: Maybe<DepartmentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `Department`. */
	userByManagerId: Maybe<User>;
};

/** The output of our create `Department` mutation. */
export type CreateDepartmentPayloadDepartmentEdgeArgs = {
	orderBy?: InputMaybe<Array<DepartmentsOrderBy>>;
};

/** All input for the create `DocumentAccess` mutation. */
export type CreateDocumentAccessInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DocumentAccess` to be created by this mutation. */
	documentAccess: DocumentAccessInput;
};

/** The output of our create `DocumentAccess` mutation. */
export type CreateDocumentAccessPayload = {
	__typename: 'CreateDocumentAccessPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DocumentAccess` that was created by this mutation. */
	documentAccess: Maybe<DocumentAccess>;
	/** An edge for our `DocumentAccess`. May be used by Relay 1. */
	documentAccessEdge: Maybe<DocumentAccessesEdge>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentAccess`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByGrantedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `DocumentAccess` mutation. */
export type CreateDocumentAccessPayloadDocumentAccessEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** All input for the create `DocumentSignature` mutation. */
export type CreateDocumentSignatureInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DocumentSignature` to be created by this mutation. */
	documentSignature: DocumentSignatureInput;
};

/** The output of our create `DocumentSignature` mutation. */
export type CreateDocumentSignaturePayload = {
	__typename: 'CreateDocumentSignaturePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DocumentSignature` that was created by this mutation. */
	documentSignature: Maybe<DocumentSignature>;
	/** An edge for our `DocumentSignature`. May be used by Relay 1. */
	documentSignatureEdge: Maybe<DocumentSignaturesEdge>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentSignature`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentSignature`. */
	userBySignerId: Maybe<User>;
};

/** The output of our create `DocumentSignature` mutation. */
export type CreateDocumentSignaturePayloadDocumentSignatureEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentSignaturesOrderBy>>;
};

/** All input for the create `DocumentTemplate` mutation. */
export type CreateDocumentTemplateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `DocumentTemplate` to be created by this mutation. */
	documentTemplate: DocumentTemplateInput;
};

/** The output of our create `DocumentTemplate` mutation. */
export type CreateDocumentTemplatePayload = {
	__typename: 'CreateDocumentTemplatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DocumentTemplate` that was created by this mutation. */
	documentTemplate: Maybe<DocumentTemplate>;
	/** Reads a single `DocumentTemplate` that is related to this `DocumentTemplate`. */
	documentTemplateByPreviousVersionId: Maybe<DocumentTemplate>;
	/** An edge for our `DocumentTemplate`. May be used by Relay 1. */
	documentTemplateEdge: Maybe<DocumentTemplatesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentTemplate`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our create `DocumentTemplate` mutation. */
export type CreateDocumentTemplatePayloadDocumentTemplateEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentTemplatesOrderBy>>;
};

/** All input for the create `EmployeeDocument` mutation. */
export type CreateEmployeeDocumentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `EmployeeDocument` to be created by this mutation. */
	employeeDocument: EmployeeDocumentInput;
};

/** The output of our create `EmployeeDocument` mutation. */
export type CreateEmployeeDocumentPayload = {
	__typename: 'CreateEmployeeDocumentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `DocumentTemplate` that is related to this `EmployeeDocument`. */
	documentTemplateByTemplateId: Maybe<DocumentTemplate>;
	/** The `EmployeeDocument` that was created by this mutation. */
	employeeDocument: Maybe<EmployeeDocument>;
	/** An edge for our `EmployeeDocument`. May be used by Relay 1. */
	employeeDocumentEdge: Maybe<EmployeeDocumentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our create `EmployeeDocument` mutation. */
export type CreateEmployeeDocumentPayloadEmployeeDocumentEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/** All input for the create `EmployeeGoal` mutation. */
export type CreateEmployeeGoalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `EmployeeGoal` to be created by this mutation. */
	employeeGoal: EmployeeGoalInput;
};

/** The output of our create `EmployeeGoal` mutation. */
export type CreateEmployeeGoalPayload = {
	__typename: 'CreateEmployeeGoalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `EmployeeGoal` that was created by this mutation. */
	employeeGoal: Maybe<EmployeeGoal>;
	/** An edge for our `EmployeeGoal`. May be used by Relay 1. */
	employeeGoalEdge: Maybe<EmployeeGoalsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `EmployeeGoal`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our create `EmployeeGoal` mutation. */
export type CreateEmployeeGoalPayloadEmployeeGoalEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** All input for the create `ErasureRequest` mutation. */
export type CreateErasureRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `ErasureRequest` to be created by this mutation. */
	erasureRequest: ErasureRequestInput;
};

/** The output of our create `ErasureRequest` mutation. */
export type CreateErasureRequestPayload = {
	__typename: 'CreateErasureRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ErasureRequest` that was created by this mutation. */
	erasureRequest: Maybe<ErasureRequest>;
	/** An edge for our `ErasureRequest`. May be used by Relay 1. */
	erasureRequestEdge: Maybe<ErasureRequestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ErasureRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `ErasureRequest` mutation. */
export type CreateErasureRequestPayloadErasureRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<ErasureRequestsOrderBy>>;
};

/** All input for the create `FailedLoginAttempt` mutation. */
export type CreateFailedLoginAttemptInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `FailedLoginAttempt` to be created by this mutation. */
	failedLoginAttempt: FailedLoginAttemptInput;
};

/** The output of our create `FailedLoginAttempt` mutation. */
export type CreateFailedLoginAttemptPayload = {
	__typename: 'CreateFailedLoginAttemptPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `FailedLoginAttempt` that was created by this mutation. */
	failedLoginAttempt: Maybe<FailedLoginAttempt>;
	/** An edge for our `FailedLoginAttempt`. May be used by Relay 1. */
	failedLoginAttemptEdge: Maybe<FailedLoginAttemptsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `FailedLoginAttempt` mutation. */
export type CreateFailedLoginAttemptPayloadFailedLoginAttemptEdgeArgs = {
	orderBy?: InputMaybe<Array<FailedLoginAttemptsOrderBy>>;
};

/** All input for the `createGoal` mutation. */
export type CreateGoalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pCategory?: InputMaybe<Scalars['String']['input']>;
	pCreatedBy?: InputMaybe<Scalars['UUID']['input']>;
	pDescription?: InputMaybe<Scalars['String']['input']>;
	pEmployeeId?: InputMaybe<Scalars['UUID']['input']>;
	pPriority?: InputMaybe<Scalars['String']['input']>;
	pReviewId?: InputMaybe<Scalars['UUID']['input']>;
	pTargetDate?: InputMaybe<Scalars['Date']['input']>;
	pTitle?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `createGoal` mutation. */
export type CreateGoalPayload = {
	__typename: 'CreateGoalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	employeeGoal: Maybe<EmployeeGoal>;
	/** An edge for our `EmployeeGoal`. May be used by Relay 1. */
	employeeGoalEdge: Maybe<EmployeeGoalsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `EmployeeGoal`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our `createGoal` mutation. */
export type CreateGoalPayloadEmployeeGoalEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** All input for the create `JobInfo` mutation. */
export type CreateJobInfoInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `JobInfo` to be created by this mutation. */
	jobInfo: JobInfoInput;
};

/** The output of our create `JobInfo` mutation. */
export type CreateJobInfoPayload = {
	__typename: 'CreateJobInfoPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Department` that is related to this `JobInfo`. */
	departmentByDepartmentId: Maybe<Department>;
	/** The `JobInfo` that was created by this mutation. */
	jobInfo: Maybe<JobInfo>;
	/** An edge for our `JobInfo`. May be used by Relay 1. */
	jobInfoEdge: Maybe<JobInfosEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByManagerId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByReportsTo: Maybe<User>;
};

/** The output of our create `JobInfo` mutation. */
export type CreateJobInfoPayloadJobInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** All input for the `createNewEmployeeCompensation` mutation. */
export type CreateNewEmployeeCompensationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pBaseAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	pCompensationType?: InputMaybe<CompensationType>;
	pEffectiveDate?: InputMaybe<Scalars['Date']['input']>;
	pEmployeeId?: InputMaybe<Scalars['UUID']['input']>;
	pEmploymentStatus?: InputMaybe<EmploymentStatus>;
	pHealthInsuranceEligible?: InputMaybe<Scalars['Boolean']['input']>;
	pOvertimeEligible?: InputMaybe<Scalars['Boolean']['input']>;
	pPayFrequency?: InputMaybe<PayFrequency>;
	pRetirementPlanEligible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The output of our `createNewEmployeeCompensation` mutation. */
export type CreateNewEmployeeCompensationPayload = {
	__typename: 'CreateNewEmployeeCompensationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	newEmployeeCompensation: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `createNewPayrollPeriod` mutation. */
export type CreateNewPayrollPeriodInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pPayDate?: InputMaybe<Scalars['Date']['input']>;
	pPayFrequency?: InputMaybe<PayFrequency>;
	pPeriodEndDate?: InputMaybe<Scalars['Date']['input']>;
	pPeriodName?: InputMaybe<Scalars['String']['input']>;
	pPeriodStartDate?: InputMaybe<Scalars['Date']['input']>;
};

/** The output of our `createNewPayrollPeriod` mutation. */
export type CreateNewPayrollPeriodPayload = {
	__typename: 'CreateNewPayrollPeriodPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	newPayrollPeriod: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the create `NotificationDelivery` mutation. */
export type CreateNotificationDeliveryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `NotificationDelivery` to be created by this mutation. */
	notificationDelivery: NotificationDeliveryInput;
};

/** The output of our create `NotificationDelivery` mutation. */
export type CreateNotificationDeliveryPayload = {
	__typename: 'CreateNotificationDeliveryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Notification` that is related to this `NotificationDelivery`. */
	notificationByNotificationId: Maybe<Notification>;
	/** The `NotificationDelivery` that was created by this mutation. */
	notificationDelivery: Maybe<NotificationDelivery>;
	/** An edge for our `NotificationDelivery`. May be used by Relay 1. */
	notificationDeliveryEdge: Maybe<NotificationDeliveriesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationDelivery`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `NotificationDelivery` mutation. */
export type CreateNotificationDeliveryPayloadNotificationDeliveryEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationDeliveriesOrderBy>>;
};

/** All input for the create `NotificationDigest` mutation. */
export type CreateNotificationDigestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `NotificationDigest` to be created by this mutation. */
	notificationDigest: NotificationDigestInput;
};

/** The output of our create `NotificationDigest` mutation. */
export type CreateNotificationDigestPayload = {
	__typename: 'CreateNotificationDigestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationDigest` that was created by this mutation. */
	notificationDigest: Maybe<NotificationDigest>;
	/** An edge for our `NotificationDigest`. May be used by Relay 1. */
	notificationDigestEdge: Maybe<NotificationDigestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationDigest`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `NotificationDigest` mutation. */
export type CreateNotificationDigestPayloadNotificationDigestEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationDigestsOrderBy>>;
};

/** All input for the create `Notification` mutation. */
export type CreateNotificationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `Notification` to be created by this mutation. */
	notification: NotificationInput;
};

/** The output of our create `Notification` mutation. */
export type CreateNotificationPayload = {
	__typename: 'CreateNotificationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Notification` that was created by this mutation. */
	notification: Maybe<Notification>;
	/** Reads a single `Notification` that is related to this `Notification`. */
	notificationByParentNotificationId: Maybe<Notification>;
	/** An edge for our `Notification`. May be used by Relay 1. */
	notificationEdge: Maybe<NotificationsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `Notification`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `Notification` mutation. */
export type CreateNotificationPayloadNotificationEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationsOrderBy>>;
};

/** All input for the create `NotificationPreference` mutation. */
export type CreateNotificationPreferenceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `NotificationPreference` to be created by this mutation. */
	notificationPreference: NotificationPreferenceInput;
};

/** The output of our create `NotificationPreference` mutation. */
export type CreateNotificationPreferencePayload = {
	__typename: 'CreateNotificationPreferencePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationPreference` that was created by this mutation. */
	notificationPreference: Maybe<NotificationPreference>;
	/** An edge for our `NotificationPreference`. May be used by Relay 1. */
	notificationPreferenceEdge: Maybe<NotificationPreferencesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationPreference`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `NotificationPreference` mutation. */
export type CreateNotificationPreferencePayloadNotificationPreferenceEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationPreferencesOrderBy>>;
};

/** All input for the create `NotificationSubscription` mutation. */
export type CreateNotificationSubscriptionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `NotificationSubscription` to be created by this mutation. */
	notificationSubscription: NotificationSubscriptionInput;
};

/** The output of our create `NotificationSubscription` mutation. */
export type CreateNotificationSubscriptionPayload = {
	__typename: 'CreateNotificationSubscriptionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationSubscription` that was created by this mutation. */
	notificationSubscription: Maybe<NotificationSubscription>;
	/** An edge for our `NotificationSubscription`. May be used by Relay 1. */
	notificationSubscriptionEdge: Maybe<NotificationSubscriptionsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationSubscription`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `NotificationSubscription` mutation. */
export type CreateNotificationSubscriptionPayloadNotificationSubscriptionEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationSubscriptionsOrderBy>>;
};

/** All input for the create `NotificationTemplate` mutation. */
export type CreateNotificationTemplateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `NotificationTemplate` to be created by this mutation. */
	notificationTemplate: NotificationTemplateInput;
};

/** The output of our create `NotificationTemplate` mutation. */
export type CreateNotificationTemplatePayload = {
	__typename: 'CreateNotificationTemplatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationTemplate` that was created by this mutation. */
	notificationTemplate: Maybe<NotificationTemplate>;
	/** Reads a single `NotificationTemplate` that is related to this `NotificationTemplate`. */
	notificationTemplateByPreviousVersionId: Maybe<NotificationTemplate>;
	/** An edge for our `NotificationTemplate`. May be used by Relay 1. */
	notificationTemplateEdge: Maybe<NotificationTemplatesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationTemplate`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our create `NotificationTemplate` mutation. */
export type CreateNotificationTemplatePayloadNotificationTemplateEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationTemplatesOrderBy>>;
};

/** All input for the create `PasswordPolicy` mutation. */
export type CreatePasswordPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `PasswordPolicy` to be created by this mutation. */
	passwordPolicy: PasswordPolicyInput;
};

/** The output of our create `PasswordPolicy` mutation. */
export type CreatePasswordPolicyPayload = {
	__typename: 'CreatePasswordPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PasswordPolicy` that was created by this mutation. */
	passwordPolicy: Maybe<PasswordPolicy>;
	/** An edge for our `PasswordPolicy`. May be used by Relay 1. */
	passwordPolicyEdge: Maybe<PasswordPoliciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `PasswordPolicy` mutation. */
export type CreatePasswordPolicyPayloadPasswordPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<PasswordPoliciesOrderBy>>;
};

/** All input for the create `PayrollPeriod` mutation. */
export type CreatePayrollPeriodInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `PayrollPeriod` to be created by this mutation. */
	payrollPeriod: PayrollPeriodInput;
};

/** The output of our create `PayrollPeriod` mutation. */
export type CreatePayrollPeriodPayload = {
	__typename: 'CreatePayrollPeriodPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PayrollPeriod` that was created by this mutation. */
	payrollPeriod: Maybe<PayrollPeriod>;
	/** An edge for our `PayrollPeriod`. May be used by Relay 1. */
	payrollPeriodEdge: Maybe<PayrollPeriodsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByApprovedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByProcessedBy: Maybe<User>;
};

/** The output of our create `PayrollPeriod` mutation. */
export type CreatePayrollPeriodPayloadPayrollPeriodEdgeArgs = {
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** All input for the create `PerformanceReview` mutation. */
export type CreatePerformanceReviewInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `PerformanceReview` to be created by this mutation. */
	performanceReview: PerformanceReviewInput;
};

/** The output of our create `PerformanceReview` mutation. */
export type CreatePerformanceReviewPayload = {
	__typename: 'CreatePerformanceReviewPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PerformanceReview` that was created by this mutation. */
	performanceReview: Maybe<PerformanceReview>;
	/** An edge for our `PerformanceReview`. May be used by Relay 1. */
	performanceReviewEdge: Maybe<PerformanceReviewsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `ReviewCycle` that is related to this `PerformanceReview`. */
	reviewCycleByCycleId: Maybe<ReviewCycle>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByHrReviewerId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByManagerId: Maybe<User>;
};

/** The output of our create `PerformanceReview` mutation. */
export type CreatePerformanceReviewPayloadPerformanceReviewEdgeArgs = {
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** All input for the create `PrivacyImpactAssessment` mutation. */
export type CreatePrivacyImpactAssessmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `PrivacyImpactAssessment` to be created by this mutation. */
	privacyImpactAssessment: PrivacyImpactAssessmentInput;
};

/** The output of our create `PrivacyImpactAssessment` mutation. */
export type CreatePrivacyImpactAssessmentPayload = {
	__typename: 'CreatePrivacyImpactAssessmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PrivacyImpactAssessment` that was created by this mutation. */
	privacyImpactAssessment: Maybe<PrivacyImpactAssessment>;
	/** An edge for our `PrivacyImpactAssessment`. May be used by Relay 1. */
	privacyImpactAssessmentEdge: Maybe<PrivacyImpactAssessmentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `PrivacyImpactAssessment` mutation. */
export type CreatePrivacyImpactAssessmentPayloadPrivacyImpactAssessmentEdgeArgs = {
	orderBy?: InputMaybe<Array<PrivacyImpactAssessmentsOrderBy>>;
};

/** All input for the create `PrivacyRequest` mutation. */
export type CreatePrivacyRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `PrivacyRequest` to be created by this mutation. */
	privacyRequest: PrivacyRequestInput;
};

/** The output of our create `PrivacyRequest` mutation. */
export type CreatePrivacyRequestPayload = {
	__typename: 'CreatePrivacyRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PrivacyRequest` that was created by this mutation. */
	privacyRequest: Maybe<PrivacyRequest>;
	/** An edge for our `PrivacyRequest`. May be used by Relay 1. */
	privacyRequestEdge: Maybe<PrivacyRequestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByAssignedTo: Maybe<User>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `PrivacyRequest` mutation. */
export type CreatePrivacyRequestPayloadPrivacyRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<PrivacyRequestsOrderBy>>;
};

/** All input for the create `ProcessingActivity` mutation. */
export type CreateProcessingActivityInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `ProcessingActivity` to be created by this mutation. */
	processingActivity: ProcessingActivityInput;
};

/** The output of our create `ProcessingActivity` mutation. */
export type CreateProcessingActivityPayload = {
	__typename: 'CreateProcessingActivityPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ProcessingActivity` that was created by this mutation. */
	processingActivity: Maybe<ProcessingActivity>;
	/** An edge for our `ProcessingActivity`. May be used by Relay 1. */
	processingActivityEdge: Maybe<ProcessingActivitiesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our create `ProcessingActivity` mutation. */
export type CreateProcessingActivityPayloadProcessingActivityEdgeArgs = {
	orderBy?: InputMaybe<Array<ProcessingActivitiesOrderBy>>;
};

/** All input for the create `ReviewCycle` mutation. */
export type CreateReviewCycleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `ReviewCycle` to be created by this mutation. */
	reviewCycle: ReviewCycleInput;
};

/** The output of our create `ReviewCycle` mutation. */
export type CreateReviewCyclePayload = {
	__typename: 'CreateReviewCyclePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `ReviewCycle` that was created by this mutation. */
	reviewCycle: Maybe<ReviewCycle>;
	/** An edge for our `ReviewCycle`. May be used by Relay 1. */
	reviewCycleEdge: Maybe<ReviewCyclesEdge>;
	/** Reads a single `User` that is related to this `ReviewCycle`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our create `ReviewCycle` mutation. */
export type CreateReviewCyclePayloadReviewCycleEdgeArgs = {
	orderBy?: InputMaybe<Array<ReviewCyclesOrderBy>>;
};

/** All input for the `createReviewsForCycle` mutation. */
export type CreateReviewsForCycleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pCreatedBy?: InputMaybe<Scalars['UUID']['input']>;
	pCycleId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `createReviewsForCycle` mutation. */
export type CreateReviewsForCyclePayload = {
	__typename: 'CreateReviewsForCyclePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	integer: Maybe<Scalars['Int']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the create `SecurityEvent` mutation. */
export type CreateSecurityEventInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `SecurityEvent` to be created by this mutation. */
	securityEvent: SecurityEventInput;
};

/** The output of our create `SecurityEvent` mutation. */
export type CreateSecurityEventPayload = {
	__typename: 'CreateSecurityEventPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `SecurityEvent` that was created by this mutation. */
	securityEvent: Maybe<SecurityEvent>;
	/** An edge for our `SecurityEvent`. May be used by Relay 1. */
	securityEventEdge: Maybe<SecurityEventsEdge>;
	/** Reads a single `User` that is related to this `SecurityEvent`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `SecurityEvent` mutation. */
export type CreateSecurityEventPayloadSecurityEventEdgeArgs = {
	orderBy?: InputMaybe<Array<SecurityEventsOrderBy>>;
};

/** All input for the create `TimeOffBalance` mutation. */
export type CreateTimeOffBalanceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `TimeOffBalance` to be created by this mutation. */
	timeOffBalance: TimeOffBalanceInput;
};

/** The output of our create `TimeOffBalance` mutation. */
export type CreateTimeOffBalancePayload = {
	__typename: 'CreateTimeOffBalancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `TimeOffBalance` that was created by this mutation. */
	timeOffBalance: Maybe<TimeOffBalance>;
	/** An edge for our `TimeOffBalance`. May be used by Relay 1. */
	timeOffBalanceEdge: Maybe<TimeOffBalancesEdge>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffBalance`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	/** Reads a single `User` that is related to this `TimeOffBalance`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `TimeOffBalance` mutation. */
export type CreateTimeOffBalancePayloadTimeOffBalanceEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffBalancesOrderBy>>;
};

/** All input for the create `TimeOffPolicy` mutation. */
export type CreateTimeOffPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `TimeOffPolicy` to be created by this mutation. */
	timeOffPolicy: TimeOffPolicyInput;
};

/** The output of our create `TimeOffPolicy` mutation. */
export type CreateTimeOffPolicyPayload = {
	__typename: 'CreateTimeOffPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `TimeOffPolicy` that was created by this mutation. */
	timeOffPolicy: Maybe<TimeOffPolicy>;
	/** An edge for our `TimeOffPolicy`. May be used by Relay 1. */
	timeOffPolicyEdge: Maybe<TimeOffPoliciesEdge>;
	/** Reads a single `User` that is related to this `TimeOffPolicy`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our create `TimeOffPolicy` mutation. */
export type CreateTimeOffPolicyPayloadTimeOffPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffPoliciesOrderBy>>;
};

/** All input for the create `TimeOffRequest` mutation. */
export type CreateTimeOffRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `TimeOffRequest` to be created by this mutation. */
	timeOffRequest: TimeOffRequestInput;
};

/** The output of our create `TimeOffRequest` mutation. */
export type CreateTimeOffRequestPayload = {
	__typename: 'CreateTimeOffRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffRequest`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	/** The `TimeOffRequest` that was created by this mutation. */
	timeOffRequest: Maybe<TimeOffRequest>;
	/** An edge for our `TimeOffRequest`. May be used by Relay 1. */
	timeOffRequestEdge: Maybe<TimeOffRequestsEdge>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByReviewedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our create `TimeOffRequest` mutation. */
export type CreateTimeOffRequestPayloadTimeOffRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** All input for the create `UserDevice` mutation. */
export type CreateUserDeviceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `UserDevice` to be created by this mutation. */
	userDevice: UserDeviceInput;
};

/** The output of our create `UserDevice` mutation. */
export type CreateUserDevicePayload = {
	__typename: 'CreateUserDevicePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserDevice`. */
	userByUserId: Maybe<User>;
	/** The `UserDevice` that was created by this mutation. */
	userDevice: Maybe<UserDevice>;
	/** An edge for our `UserDevice`. May be used by Relay 1. */
	userDeviceEdge: Maybe<UserDevicesEdge>;
};

/** The output of our create `UserDevice` mutation. */
export type CreateUserDevicePayloadUserDeviceEdgeArgs = {
	orderBy?: InputMaybe<Array<UserDevicesOrderBy>>;
};

/** All input for the create `User` mutation. */
export type CreateUserInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `User` to be created by this mutation. */
	user: UserInput;
};

/** All input for the create `UserMfaSetting` mutation. */
export type CreateUserMfaSettingInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `UserMfaSetting` to be created by this mutation. */
	userMfaSetting: UserMfaSettingInput;
};

/** The output of our create `UserMfaSetting` mutation. */
export type CreateUserMfaSettingPayload = {
	__typename: 'CreateUserMfaSettingPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserMfaSetting`. */
	userByUserId: Maybe<User>;
	/** The `UserMfaSetting` that was created by this mutation. */
	userMfaSetting: Maybe<UserMfaSetting>;
	/** An edge for our `UserMfaSetting`. May be used by Relay 1. */
	userMfaSettingEdge: Maybe<UserMfaSettingsEdge>;
};

/** The output of our create `UserMfaSetting` mutation. */
export type CreateUserMfaSettingPayloadUserMfaSettingEdgeArgs = {
	orderBy?: InputMaybe<Array<UserMfaSettingsOrderBy>>;
};

/** All input for the create `UserPasswordHistory` mutation. */
export type CreateUserPasswordHistoryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `UserPasswordHistory` to be created by this mutation. */
	userPasswordHistory: UserPasswordHistoryInput;
};

/** The output of our create `UserPasswordHistory` mutation. */
export type CreateUserPasswordHistoryPayload = {
	__typename: 'CreateUserPasswordHistoryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserPasswordHistory`. */
	userByUserId: Maybe<User>;
	/** The `UserPasswordHistory` that was created by this mutation. */
	userPasswordHistory: Maybe<UserPasswordHistory>;
	/** An edge for our `UserPasswordHistory`. May be used by Relay 1. */
	userPasswordHistoryEdge: Maybe<UserPasswordHistoriesEdge>;
};

/** The output of our create `UserPasswordHistory` mutation. */
export type CreateUserPasswordHistoryPayloadUserPasswordHistoryEdgeArgs = {
	orderBy?: InputMaybe<Array<UserPasswordHistoriesOrderBy>>;
};

/** The output of our create `User` mutation. */
export type CreateUserPayload = {
	__typename: 'CreateUserPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `User` that was created by this mutation. */
	user: Maybe<User>;
	/** An edge for our `User`. May be used by Relay 1. */
	userEdge: Maybe<UsersEdge>;
};

/** The output of our create `User` mutation. */
export type CreateUserPayloadUserEdgeArgs = {
	orderBy?: InputMaybe<Array<UsersOrderBy>>;
};

/** All input for the create `UserRoleAssignment` mutation. */
export type CreateUserRoleAssignmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `UserRoleAssignment` to be created by this mutation. */
	userRoleAssignment: UserRoleAssignmentInput;
};

/** The output of our create `UserRoleAssignment` mutation. */
export type CreateUserRoleAssignmentPayload = {
	__typename: 'CreateUserRoleAssignmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByAssignedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByUserId: Maybe<User>;
	/** The `UserRoleAssignment` that was created by this mutation. */
	userRoleAssignment: Maybe<UserRoleAssignment>;
	/** An edge for our `UserRoleAssignment`. May be used by Relay 1. */
	userRoleAssignmentEdge: Maybe<UserRoleAssignmentsEdge>;
	/** Reads a single `UserRole` that is related to this `UserRoleAssignment`. */
	userRoleByRoleId: Maybe<UserRole>;
};

/** The output of our create `UserRoleAssignment` mutation. */
export type CreateUserRoleAssignmentPayloadUserRoleAssignmentEdgeArgs = {
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

/** All input for the create `UserRole` mutation. */
export type CreateUserRoleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `UserRole` to be created by this mutation. */
	userRole: UserRoleInput;
};

/** The output of our create `UserRole` mutation. */
export type CreateUserRolePayload = {
	__typename: 'CreateUserRolePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `UserRole` that was created by this mutation. */
	userRole: Maybe<UserRole>;
	/** An edge for our `UserRole`. May be used by Relay 1. */
	userRoleEdge: Maybe<UserRolesEdge>;
};

/** The output of our create `UserRole` mutation. */
export type CreateUserRolePayloadUserRoleEdgeArgs = {
	orderBy?: InputMaybe<Array<UserRolesOrderBy>>;
};

/** All input for the create `UserSession` mutation. */
export type CreateUserSessionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `UserSession` to be created by this mutation. */
	userSession: UserSessionInput;
};

/** The output of our create `UserSession` mutation. */
export type CreateUserSessionPayload = {
	__typename: 'CreateUserSessionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `UserSession` that was created by this mutation. */
	userSession: Maybe<UserSession>;
	/** An edge for our `UserSession`. May be used by Relay 1. */
	userSessionEdge: Maybe<UserSessionsEdge>;
};

/** The output of our create `UserSession` mutation. */
export type CreateUserSessionPayloadUserSessionEdgeArgs = {
	orderBy?: InputMaybe<Array<UserSessionsOrderBy>>;
};

/** All input for the create `WorkflowApproval` mutation. */
export type CreateWorkflowApprovalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `WorkflowApproval` to be created by this mutation. */
	workflowApproval: WorkflowApprovalInput;
};

/** The output of our create `WorkflowApproval` mutation. */
export type CreateWorkflowApprovalPayload = {
	__typename: 'CreateWorkflowApprovalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByApproverId: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByEscalatedToId: Maybe<User>;
	/** The `WorkflowApproval` that was created by this mutation. */
	workflowApproval: Maybe<WorkflowApproval>;
	/** An edge for our `WorkflowApproval`. May be used by Relay 1. */
	workflowApprovalEdge: Maybe<WorkflowApprovalsEdge>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowApproval`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowApproval`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
};

/** The output of our create `WorkflowApproval` mutation. */
export type CreateWorkflowApprovalPayloadWorkflowApprovalEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** All input for the create `WorkflowDefinition` mutation. */
export type CreateWorkflowDefinitionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `WorkflowDefinition` to be created by this mutation. */
	workflowDefinition: WorkflowDefinitionInput;
};

/** The output of our create `WorkflowDefinition` mutation. */
export type CreateWorkflowDefinitionPayload = {
	__typename: 'CreateWorkflowDefinitionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Department` that is related to this `WorkflowDefinition`. */
	departmentByDepartmentId: Maybe<Department>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowDefinition`. */
	userByCreatedBy: Maybe<User>;
	/** The `WorkflowDefinition` that was created by this mutation. */
	workflowDefinition: Maybe<WorkflowDefinition>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowDefinition`. */
	workflowDefinitionByParentWorkflowId: Maybe<WorkflowDefinition>;
	/** An edge for our `WorkflowDefinition`. May be used by Relay 1. */
	workflowDefinitionEdge: Maybe<WorkflowDefinitionsEdge>;
};

/** The output of our create `WorkflowDefinition` mutation. */
export type CreateWorkflowDefinitionPayloadWorkflowDefinitionEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** All input for the create `WorkflowInstance` mutation. */
export type CreateWorkflowInstanceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `WorkflowInstance` to be created by this mutation. */
	workflowInstance: WorkflowInstanceInput;
};

/** The output of our create `WorkflowInstance` mutation. */
export type CreateWorkflowInstancePayload = {
	__typename: 'CreateWorkflowInstancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowInstance`. */
	userByTriggeredByUserId: Maybe<User>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowInstance`. */
	workflowDefinitionByWorkflowDefinitionId: Maybe<WorkflowDefinition>;
	/** The `WorkflowInstance` that was created by this mutation. */
	workflowInstance: Maybe<WorkflowInstance>;
	/** An edge for our `WorkflowInstance`. May be used by Relay 1. */
	workflowInstanceEdge: Maybe<WorkflowInstancesEdge>;
};

/** The output of our create `WorkflowInstance` mutation. */
export type CreateWorkflowInstancePayloadWorkflowInstanceEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowInstancesOrderBy>>;
};

/** All input for the create `WorkflowStepExecution` mutation. */
export type CreateWorkflowStepExecutionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `WorkflowStepExecution` to be created by this mutation. */
	workflowStepExecution: WorkflowStepExecutionInput;
};

/** The output of our create `WorkflowStepExecution` mutation. */
export type CreateWorkflowStepExecutionPayload = {
	__typename: 'CreateWorkflowStepExecutionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowStepExecution`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** The `WorkflowStepExecution` that was created by this mutation. */
	workflowStepExecution: Maybe<WorkflowStepExecution>;
	/** An edge for our `WorkflowStepExecution`. May be used by Relay 1. */
	workflowStepExecutionEdge: Maybe<WorkflowStepExecutionsEdge>;
};

/** The output of our create `WorkflowStepExecution` mutation. */
export type CreateWorkflowStepExecutionPayloadWorkflowStepExecutionEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowStepExecutionsOrderBy>>;
};

/** All input for the create `WorkflowTask` mutation. */
export type CreateWorkflowTaskInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The `WorkflowTask` to be created by this mutation. */
	workflowTask: WorkflowTaskInput;
};

/** The output of our create `WorkflowTask` mutation. */
export type CreateWorkflowTaskPayload = {
	__typename: 'CreateWorkflowTaskPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedById: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedToId: Maybe<User>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowTask`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowTask`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
	/** The `WorkflowTask` that was created by this mutation. */
	workflowTask: Maybe<WorkflowTask>;
	/** An edge for our `WorkflowTask`. May be used by Relay 1. */
	workflowTaskEdge: Maybe<WorkflowTasksEdge>;
};

/** The output of our create `WorkflowTask` mutation. */
export type CreateWorkflowTaskPayloadWorkflowTaskEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/** Pre-calculated metrics for dashboard display */
export type DashboardMetric = {
	__typename: 'DashboardMetric';
	lastUpdated: Maybe<Scalars['Datetime']['output']>;
	metricCategory: Maybe<Scalars['String']['output']>;
	metrics: Maybe<Scalars['JSON']['output']>;
};

/** A connection to a list of `DashboardMetric` values. */
export type DashboardMetricsConnection = {
	__typename: 'DashboardMetricsConnection';
	/** A list of edges which contains the `DashboardMetric` and cursor to aid in pagination. */
	edges: Array<DashboardMetricsEdge>;
	/** A list of `DashboardMetric` objects. */
	nodes: Array<DashboardMetric>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DashboardMetric` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DashboardMetric` edge in the connection. */
export type DashboardMetricsEdge = {
	__typename: 'DashboardMetricsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DashboardMetric` at the end of the edge. */
	node: DashboardMetric;
};

/** Methods to use when ordering `DashboardMetric`. */
export type DashboardMetricsOrderBy = 'NATURAL';

/** Data breach incident management and regulatory compliance */
export type DataBreachIncident = Node & {
	__typename: 'DataBreachIncident';
	affectedDataCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	affectedIndividualsNotified: Maybe<Scalars['Boolean']['output']>;
	attackVector: Maybe<Scalars['String']['output']>;
	authorityReferenceNumber: Maybe<Scalars['String']['output']>;
	breachType: Scalars['String']['output'];
	businessImpactDescription: Maybe<Scalars['String']['output']>;
	closedAt: Maybe<Scalars['Datetime']['output']>;
	closedBy: Maybe<Scalars['UUID']['output']>;
	confirmedAffectedRecords: Maybe<Scalars['Int']['output']>;
	containmentActions: Maybe<Scalars['String']['output']>;
	containmentCompletedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	discoveredAt: Scalars['Datetime']['output'];
	discoveredBy: Maybe<Scalars['UUID']['output']>;
	estimatedAffectedRecords: Maybe<Scalars['Int']['output']>;
	estimatedCost: Maybe<Scalars['BigFloat']['output']>;
	evidencePreserved: Maybe<Scalars['Boolean']['output']>;
	forensicAnalysisRequired: Maybe<Scalars['Boolean']['output']>;
	id: Scalars['UUID']['output'];
	incidentNumber: Scalars['String']['output'];
	incidentResponseTeam: Maybe<Scalars['JSON']['output']>;
	incidentTitle: Scalars['String']['output'];
	investigationFindings: Maybe<Scalars['String']['output']>;
	investigationStatus: Maybe<Scalars['String']['output']>;
	lessonsLearned: Maybe<Scalars['String']['output']>;
	likelihoodOfRisk: Maybe<Scalars['String']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	notificationMethod: Maybe<Scalars['String']['output']>;
	postIncidentReviewCompleted: Maybe<Scalars['Boolean']['output']>;
	potentialConsequences: Maybe<Scalars['String']['output']>;
	preventiveMeasures: Maybe<Scalars['String']['output']>;
	recoveryActions: Maybe<Scalars['String']['output']>;
	recoveryCompletedAt: Maybe<Scalars['Datetime']['output']>;
	regulatoryNotificationCompleted: Maybe<Scalars['Boolean']['output']>;
	regulatoryNotificationDeadline: Maybe<Scalars['Date']['output']>;
	regulatoryNotificationRequired: Maybe<Scalars['Boolean']['output']>;
	reportedToAuthorityAt: Maybe<Scalars['Datetime']['output']>;
	reportedToDpoAt: Maybe<Scalars['Datetime']['output']>;
	reputationImpact: Maybe<Scalars['String']['output']>;
	rootCause: Maybe<Scalars['String']['output']>;
	severity: Maybe<Scalars['String']['output']>;
	status: Maybe<Scalars['String']['output']>;
	systemsAffected: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	vulnerabilitiesExploited: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

/**
 * A condition to be used against `DataBreachIncident` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type DataBreachIncidentCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `incidentNumber` field. */
	incidentNumber?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `severity` field. */
	severity?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `DataBreachIncident` */
export type DataBreachIncidentInput = {
	affectedDataCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	affectedIndividualsNotified?: InputMaybe<Scalars['Boolean']['input']>;
	attackVector?: InputMaybe<Scalars['String']['input']>;
	authorityReferenceNumber?: InputMaybe<Scalars['String']['input']>;
	breachType: Scalars['String']['input'];
	businessImpactDescription?: InputMaybe<Scalars['String']['input']>;
	closedAt?: InputMaybe<Scalars['Datetime']['input']>;
	closedBy?: InputMaybe<Scalars['UUID']['input']>;
	confirmedAffectedRecords?: InputMaybe<Scalars['Int']['input']>;
	containmentActions?: InputMaybe<Scalars['String']['input']>;
	containmentCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	discoveredAt: Scalars['Datetime']['input'];
	discoveredBy?: InputMaybe<Scalars['UUID']['input']>;
	estimatedAffectedRecords?: InputMaybe<Scalars['Int']['input']>;
	estimatedCost?: InputMaybe<Scalars['BigFloat']['input']>;
	evidencePreserved?: InputMaybe<Scalars['Boolean']['input']>;
	forensicAnalysisRequired?: InputMaybe<Scalars['Boolean']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	incidentNumber: Scalars['String']['input'];
	incidentResponseTeam?: InputMaybe<Scalars['JSON']['input']>;
	incidentTitle: Scalars['String']['input'];
	investigationFindings?: InputMaybe<Scalars['String']['input']>;
	investigationStatus?: InputMaybe<Scalars['String']['input']>;
	lessonsLearned?: InputMaybe<Scalars['String']['input']>;
	likelihoodOfRisk?: InputMaybe<Scalars['String']['input']>;
	notificationMethod?: InputMaybe<Scalars['String']['input']>;
	postIncidentReviewCompleted?: InputMaybe<Scalars['Boolean']['input']>;
	potentialConsequences?: InputMaybe<Scalars['String']['input']>;
	preventiveMeasures?: InputMaybe<Scalars['String']['input']>;
	recoveryActions?: InputMaybe<Scalars['String']['input']>;
	recoveryCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	regulatoryNotificationCompleted?: InputMaybe<Scalars['Boolean']['input']>;
	regulatoryNotificationDeadline?: InputMaybe<Scalars['Date']['input']>;
	regulatoryNotificationRequired?: InputMaybe<Scalars['Boolean']['input']>;
	reportedToAuthorityAt?: InputMaybe<Scalars['Datetime']['input']>;
	reportedToDpoAt?: InputMaybe<Scalars['Datetime']['input']>;
	reputationImpact?: InputMaybe<Scalars['String']['input']>;
	rootCause?: InputMaybe<Scalars['String']['input']>;
	severity?: InputMaybe<Scalars['String']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	systemsAffected?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	vulnerabilitiesExploited?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** Represents an update to a `DataBreachIncident`. Fields that are set will be updated. */
export type DataBreachIncidentPatch = {
	affectedDataCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	affectedIndividualsNotified?: InputMaybe<Scalars['Boolean']['input']>;
	attackVector?: InputMaybe<Scalars['String']['input']>;
	authorityReferenceNumber?: InputMaybe<Scalars['String']['input']>;
	breachType?: InputMaybe<Scalars['String']['input']>;
	businessImpactDescription?: InputMaybe<Scalars['String']['input']>;
	closedAt?: InputMaybe<Scalars['Datetime']['input']>;
	closedBy?: InputMaybe<Scalars['UUID']['input']>;
	confirmedAffectedRecords?: InputMaybe<Scalars['Int']['input']>;
	containmentActions?: InputMaybe<Scalars['String']['input']>;
	containmentCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	discoveredAt?: InputMaybe<Scalars['Datetime']['input']>;
	discoveredBy?: InputMaybe<Scalars['UUID']['input']>;
	estimatedAffectedRecords?: InputMaybe<Scalars['Int']['input']>;
	estimatedCost?: InputMaybe<Scalars['BigFloat']['input']>;
	evidencePreserved?: InputMaybe<Scalars['Boolean']['input']>;
	forensicAnalysisRequired?: InputMaybe<Scalars['Boolean']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	incidentNumber?: InputMaybe<Scalars['String']['input']>;
	incidentResponseTeam?: InputMaybe<Scalars['JSON']['input']>;
	incidentTitle?: InputMaybe<Scalars['String']['input']>;
	investigationFindings?: InputMaybe<Scalars['String']['input']>;
	investigationStatus?: InputMaybe<Scalars['String']['input']>;
	lessonsLearned?: InputMaybe<Scalars['String']['input']>;
	likelihoodOfRisk?: InputMaybe<Scalars['String']['input']>;
	notificationMethod?: InputMaybe<Scalars['String']['input']>;
	postIncidentReviewCompleted?: InputMaybe<Scalars['Boolean']['input']>;
	potentialConsequences?: InputMaybe<Scalars['String']['input']>;
	preventiveMeasures?: InputMaybe<Scalars['String']['input']>;
	recoveryActions?: InputMaybe<Scalars['String']['input']>;
	recoveryCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	regulatoryNotificationCompleted?: InputMaybe<Scalars['Boolean']['input']>;
	regulatoryNotificationDeadline?: InputMaybe<Scalars['Date']['input']>;
	regulatoryNotificationRequired?: InputMaybe<Scalars['Boolean']['input']>;
	reportedToAuthorityAt?: InputMaybe<Scalars['Datetime']['input']>;
	reportedToDpoAt?: InputMaybe<Scalars['Datetime']['input']>;
	reputationImpact?: InputMaybe<Scalars['String']['input']>;
	rootCause?: InputMaybe<Scalars['String']['input']>;
	severity?: InputMaybe<Scalars['String']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	systemsAffected?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	vulnerabilitiesExploited?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** A connection to a list of `DataBreachIncident` values. */
export type DataBreachIncidentsConnection = {
	__typename: 'DataBreachIncidentsConnection';
	/** A list of edges which contains the `DataBreachIncident` and cursor to aid in pagination. */
	edges: Array<DataBreachIncidentsEdge>;
	/** A list of `DataBreachIncident` objects. */
	nodes: Array<DataBreachIncident>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DataBreachIncident` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DataBreachIncident` edge in the connection. */
export type DataBreachIncidentsEdge = {
	__typename: 'DataBreachIncidentsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DataBreachIncident` at the end of the edge. */
	node: DataBreachIncident;
};

/** Methods to use when ordering `DataBreachIncident`. */
export type DataBreachIncidentsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'INCIDENT_NUMBER_ASC'
	| 'INCIDENT_NUMBER_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'SEVERITY_ASC'
	| 'SEVERITY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC';

export type DataClassification =
	| 'CONFIDENTIAL'
	| 'INTERNAL'
	| 'PII'
	| 'PUBLIC'
	| 'RESTRICTED'
	| 'SENSITIVE_PII';

/** Complete data lineage tracking for governance and compliance */
export type DataLineage = Node & {
	__typename: 'DataLineage';
	action: DataLineageAction;
	auditReference: Maybe<Scalars['UUID']['output']>;
	automatedProcess: Maybe<Scalars['Boolean']['output']>;
	complianceRequirement: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	dataQualityScore: Maybe<Scalars['Int']['output']>;
	id: Scalars['UUID']['output'];
	impactAssessment: Maybe<Scalars['String']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	performedBySessionId: Maybe<Scalars['UUID']['output']>;
	performedByUserId: Maybe<Scalars['UUID']['output']>;
	processName: Maybe<Scalars['String']['output']>;
	reversible: Maybe<Scalars['Boolean']['output']>;
	sourceColumn: Maybe<Scalars['String']['output']>;
	sourceRecordId: Maybe<Scalars['UUID']['output']>;
	sourceTable: Scalars['String']['output'];
	targetColumn: Maybe<Scalars['String']['output']>;
	targetRecordId: Maybe<Scalars['UUID']['output']>;
	targetTable: Maybe<Scalars['String']['output']>;
	transformationDetails: Maybe<Scalars['JSON']['output']>;
	transformationType: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `DataLineage`. */
	userByPerformedByUserId: Maybe<User>;
};

export type DataLineageAction =
	| 'ACCESSED'
	| 'ANONYMIZED'
	| 'ARCHIVED'
	| 'CREATED'
	| 'DELETED'
	| 'EXPORTED'
	| 'MODIFIED'
	| 'SHARED';

/**
 * A condition to be used against `DataLineage` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type DataLineageCondition = {
	/** Checks for equality with the object’s `action` field. */
	action?: InputMaybe<DataLineageAction>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `performedByUserId` field. */
	performedByUserId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `sourceTable` field. */
	sourceTable?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `targetTable` field. */
	targetTable?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `DataLineage` */
export type DataLineageInput = {
	action: DataLineageAction;
	auditReference?: InputMaybe<Scalars['UUID']['input']>;
	automatedProcess?: InputMaybe<Scalars['Boolean']['input']>;
	complianceRequirement?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataQualityScore?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	impactAssessment?: InputMaybe<Scalars['String']['input']>;
	performedBySessionId?: InputMaybe<Scalars['UUID']['input']>;
	performedByUserId?: InputMaybe<Scalars['UUID']['input']>;
	processName?: InputMaybe<Scalars['String']['input']>;
	reversible?: InputMaybe<Scalars['Boolean']['input']>;
	sourceColumn?: InputMaybe<Scalars['String']['input']>;
	sourceRecordId?: InputMaybe<Scalars['UUID']['input']>;
	sourceTable: Scalars['String']['input'];
	targetColumn?: InputMaybe<Scalars['String']['input']>;
	targetRecordId?: InputMaybe<Scalars['UUID']['input']>;
	targetTable?: InputMaybe<Scalars['String']['input']>;
	transformationDetails?: InputMaybe<Scalars['JSON']['input']>;
	transformationType?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an update to a `DataLineage`. Fields that are set will be updated. */
export type DataLineagePatch = {
	action?: InputMaybe<DataLineageAction>;
	auditReference?: InputMaybe<Scalars['UUID']['input']>;
	automatedProcess?: InputMaybe<Scalars['Boolean']['input']>;
	complianceRequirement?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataQualityScore?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	impactAssessment?: InputMaybe<Scalars['String']['input']>;
	performedBySessionId?: InputMaybe<Scalars['UUID']['input']>;
	performedByUserId?: InputMaybe<Scalars['UUID']['input']>;
	processName?: InputMaybe<Scalars['String']['input']>;
	reversible?: InputMaybe<Scalars['Boolean']['input']>;
	sourceColumn?: InputMaybe<Scalars['String']['input']>;
	sourceRecordId?: InputMaybe<Scalars['UUID']['input']>;
	sourceTable?: InputMaybe<Scalars['String']['input']>;
	targetColumn?: InputMaybe<Scalars['String']['input']>;
	targetRecordId?: InputMaybe<Scalars['UUID']['input']>;
	targetTable?: InputMaybe<Scalars['String']['input']>;
	transformationDetails?: InputMaybe<Scalars['JSON']['input']>;
	transformationType?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of `DataLineage` values. */
export type DataLineagesConnection = {
	__typename: 'DataLineagesConnection';
	/** A list of edges which contains the `DataLineage` and cursor to aid in pagination. */
	edges: Array<DataLineagesEdge>;
	/** A list of `DataLineage` objects. */
	nodes: Array<DataLineage>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DataLineage` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DataLineage` edge in the connection. */
export type DataLineagesEdge = {
	__typename: 'DataLineagesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DataLineage` at the end of the edge. */
	node: DataLineage;
};

/** Methods to use when ordering `DataLineage`. */
export type DataLineagesOrderBy =
	| 'ACTION_ASC'
	| 'ACTION_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PERFORMED_BY_USER_ID_ASC'
	| 'PERFORMED_BY_USER_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'SOURCE_TABLE_ASC'
	| 'SOURCE_TABLE_DESC'
	| 'TARGET_TABLE_ASC'
	| 'TARGET_TABLE_DESC';

/** A connection to a list of `DataProtectionMetadatum` values. */
export type DataProtectionMetadataConnection = {
	__typename: 'DataProtectionMetadataConnection';
	/** A list of edges which contains the `DataProtectionMetadatum` and cursor to aid in pagination. */
	edges: Array<DataProtectionMetadataEdge>;
	/** A list of `DataProtectionMetadatum` objects. */
	nodes: Array<DataProtectionMetadatum>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DataProtectionMetadatum` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DataProtectionMetadatum` edge in the connection. */
export type DataProtectionMetadataEdge = {
	__typename: 'DataProtectionMetadataEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DataProtectionMetadatum` at the end of the edge. */
	node: DataProtectionMetadatum;
};

/** Methods to use when ordering `DataProtectionMetadatum`. */
export type DataProtectionMetadataOrderBy =
	| 'DATA_CLASSIFICATION_ASC'
	| 'DATA_CLASSIFICATION_DESC'
	| 'ENCRYPTION_STATUS_ASC'
	| 'ENCRYPTION_STATUS_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'TABLE_NAME_ASC'
	| 'TABLE_NAME_DESC';

/** Comprehensive data protection tracking and metadata management */
export type DataProtectionMetadatum = Node & {
	__typename: 'DataProtectionMetadatum';
	accessControlRules: Maybe<Scalars['JSON']['output']>;
	anonymizationAppliedAt: Maybe<Scalars['Datetime']['output']>;
	anonymizationLevel: Maybe<AnonymizationLevel>;
	columnName: Maybe<Scalars['String']['output']>;
	consentRecordId: Maybe<Scalars['UUID']['output']>;
	consentRequired: Maybe<Scalars['Boolean']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	dataClassification: DataClassification;
	encryptionAlgorithm: Maybe<Scalars['String']['output']>;
	encryptionKeyId: Maybe<Scalars['String']['output']>;
	encryptionStatus: Maybe<EncryptionStatus>;
	id: Scalars['UUID']['output'];
	legalBasisDocumented: Maybe<Scalars['Boolean']['output']>;
	legalBasisReference: Maybe<Scalars['String']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	originalDataHash: Maybe<Scalars['String']['output']>;
	recordId: Maybe<Scalars['UUID']['output']>;
	restrictedAccess: Maybe<Scalars['Boolean']['output']>;
	retentionPolicyId: Maybe<Scalars['UUID']['output']>;
	scheduledDeletionDate: Maybe<Scalars['Date']['output']>;
	sensitivityScore: Maybe<Scalars['Int']['output']>;
	tableName: Scalars['String']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `DataProtectionMetadatum` object types. All
 * fields are tested for equality and combined with a logical ‘and.’
 */
export type DataProtectionMetadatumCondition = {
	/** Checks for equality with the object’s `dataClassification` field. */
	dataClassification?: InputMaybe<DataClassification>;
	/** Checks for equality with the object’s `encryptionStatus` field. */
	encryptionStatus?: InputMaybe<EncryptionStatus>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `tableName` field. */
	tableName?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `DataProtectionMetadatum` */
export type DataProtectionMetadatumInput = {
	accessControlRules?: InputMaybe<Scalars['JSON']['input']>;
	anonymizationAppliedAt?: InputMaybe<Scalars['Datetime']['input']>;
	anonymizationLevel?: InputMaybe<AnonymizationLevel>;
	columnName?: InputMaybe<Scalars['String']['input']>;
	consentRecordId?: InputMaybe<Scalars['UUID']['input']>;
	consentRequired?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataClassification: DataClassification;
	encryptionAlgorithm?: InputMaybe<Scalars['String']['input']>;
	encryptionKeyId?: InputMaybe<Scalars['String']['input']>;
	encryptionStatus?: InputMaybe<EncryptionStatus>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	legalBasisDocumented?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasisReference?: InputMaybe<Scalars['String']['input']>;
	originalDataHash?: InputMaybe<Scalars['String']['input']>;
	recordId?: InputMaybe<Scalars['UUID']['input']>;
	restrictedAccess?: InputMaybe<Scalars['Boolean']['input']>;
	retentionPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	scheduledDeletionDate?: InputMaybe<Scalars['Date']['input']>;
	sensitivityScore?: InputMaybe<Scalars['Int']['input']>;
	tableName: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `DataProtectionMetadatum`. Fields that are set will be updated. */
export type DataProtectionMetadatumPatch = {
	accessControlRules?: InputMaybe<Scalars['JSON']['input']>;
	anonymizationAppliedAt?: InputMaybe<Scalars['Datetime']['input']>;
	anonymizationLevel?: InputMaybe<AnonymizationLevel>;
	columnName?: InputMaybe<Scalars['String']['input']>;
	consentRecordId?: InputMaybe<Scalars['UUID']['input']>;
	consentRequired?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataClassification?: InputMaybe<DataClassification>;
	encryptionAlgorithm?: InputMaybe<Scalars['String']['input']>;
	encryptionKeyId?: InputMaybe<Scalars['String']['input']>;
	encryptionStatus?: InputMaybe<EncryptionStatus>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	legalBasisDocumented?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasisReference?: InputMaybe<Scalars['String']['input']>;
	originalDataHash?: InputMaybe<Scalars['String']['input']>;
	recordId?: InputMaybe<Scalars['UUID']['input']>;
	restrictedAccess?: InputMaybe<Scalars['Boolean']['input']>;
	retentionPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	scheduledDeletionDate?: InputMaybe<Scalars['Date']['input']>;
	sensitivityScore?: InputMaybe<Scalars['Int']['input']>;
	tableName?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `DataRetentionPolicy` values. */
export type DataRetentionPoliciesConnection = {
	__typename: 'DataRetentionPoliciesConnection';
	/** A list of edges which contains the `DataRetentionPolicy` and cursor to aid in pagination. */
	edges: Array<DataRetentionPoliciesEdge>;
	/** A list of `DataRetentionPolicy` objects. */
	nodes: Array<DataRetentionPolicy>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DataRetentionPolicy` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DataRetentionPolicy` edge in the connection. */
export type DataRetentionPoliciesEdge = {
	__typename: 'DataRetentionPoliciesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DataRetentionPolicy` at the end of the edge. */
	node: DataRetentionPolicy;
};

/** Methods to use when ordering `DataRetentionPolicy`. */
export type DataRetentionPoliciesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'NEXT_REVIEW_DATE_ASC'
	| 'NEXT_REVIEW_DATE_DESC'
	| 'POLICY_NAME_ASC'
	| 'POLICY_NAME_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** Data retention policies for compliance with GDPR and other regulations */
export type DataRetentionPolicy = Node & {
	__typename: 'DataRetentionPolicy';
	approvedAt: Maybe<Scalars['Datetime']['output']>;
	approvedBy: Maybe<Scalars['UUID']['output']>;
	autoAnonymize: Maybe<Scalars['Boolean']['output']>;
	autoDelete: Maybe<Scalars['Boolean']['output']>;
	businessJustification: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	dataTypes: Maybe<Array<Maybe<DataClassification>>>;
	description: Maybe<Scalars['String']['output']>;
	exceptionConditions: Maybe<Scalars['JSON']['output']>;
	gracePeriodDays: Maybe<Scalars['Int']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	jurisdiction: Maybe<Scalars['String']['output']>;
	legalBasis: Maybe<Scalars['String']['output']>;
	nextReviewDate: Maybe<Scalars['Date']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	policyName: Scalars['String']['output'];
	regulatoryRequirement: Maybe<Scalars['String']['output']>;
	requireManualReview: Maybe<Scalars['Boolean']['output']>;
	retentionPeriodDays: Scalars['Int']['output'];
	tableNames: Array<Maybe<Scalars['String']['output']>>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `DataRetentionPolicy` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type DataRetentionPolicyCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `nextReviewDate` field. */
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	/** Checks for equality with the object’s `policyName` field. */
	policyName?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `DataRetentionPolicy` */
export type DataRetentionPolicyInput = {
	approvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	autoAnonymize?: InputMaybe<Scalars['Boolean']['input']>;
	autoDelete?: InputMaybe<Scalars['Boolean']['input']>;
	businessJustification?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	dataTypes?: InputMaybe<Array<InputMaybe<DataClassification>>>;
	description?: InputMaybe<Scalars['String']['input']>;
	exceptionConditions?: InputMaybe<Scalars['JSON']['input']>;
	gracePeriodDays?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	jurisdiction?: InputMaybe<Scalars['String']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	policyName: Scalars['String']['input'];
	regulatoryRequirement?: InputMaybe<Scalars['String']['input']>;
	requireManualReview?: InputMaybe<Scalars['Boolean']['input']>;
	retentionPeriodDays: Scalars['Int']['input'];
	tableNames: Array<InputMaybe<Scalars['String']['input']>>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `DataRetentionPolicy`. Fields that are set will be updated. */
export type DataRetentionPolicyPatch = {
	approvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	autoAnonymize?: InputMaybe<Scalars['Boolean']['input']>;
	autoDelete?: InputMaybe<Scalars['Boolean']['input']>;
	businessJustification?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	dataTypes?: InputMaybe<Array<InputMaybe<DataClassification>>>;
	description?: InputMaybe<Scalars['String']['input']>;
	exceptionConditions?: InputMaybe<Scalars['JSON']['input']>;
	gracePeriodDays?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	jurisdiction?: InputMaybe<Scalars['String']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	policyName?: InputMaybe<Scalars['String']['input']>;
	regulatoryRequirement?: InputMaybe<Scalars['String']['input']>;
	requireManualReview?: InputMaybe<Scalars['Boolean']['input']>;
	retentionPeriodDays?: InputMaybe<Scalars['Int']['input']>;
	tableNames?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** All input for the `deleteAuditLogById` mutation. */
export type DeleteAuditLogByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteAuditLog` mutation. */
export type DeleteAuditLogInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `AuditLog` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `AuditLog` mutation. */
export type DeleteAuditLogPayload = {
	__typename: 'DeleteAuditLogPayload';
	/** The `AuditLog` that was deleted by this mutation. */
	auditLog: Maybe<AuditLog>;
	/** An edge for our `AuditLog`. May be used by Relay 1. */
	auditLogEdge: Maybe<AuditLogsEdge>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedAuditLogId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `AuditLog`. */
	userByUserId: Maybe<User>;
	/** Reads a single `UserSession` that is related to this `AuditLog`. */
	userSessionBySessionId: Maybe<UserSession>;
};

/** The output of our delete `AuditLog` mutation. */
export type DeleteAuditLogPayloadAuditLogEdgeArgs = {
	orderBy?: InputMaybe<Array<AuditLogsOrderBy>>;
};

/** All input for the `deleteAuthSessionById` mutation. */
export type DeleteAuthSessionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteAuthSession` mutation. */
export type DeleteAuthSessionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `AuthSession` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `AuthSession` mutation. */
export type DeleteAuthSessionPayload = {
	__typename: 'DeleteAuthSessionPayload';
	/** The `AuthSession` that was deleted by this mutation. */
	authSession: Maybe<AuthSession>;
	/** An edge for our `AuthSession`. May be used by Relay 1. */
	authSessionEdge: Maybe<AuthSessionsEdge>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedAuthSessionId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `AuthSession`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `AuthSession` mutation. */
export type DeleteAuthSessionPayloadAuthSessionEdgeArgs = {
	orderBy?: InputMaybe<Array<AuthSessionsOrderBy>>;
};

/** All input for the `deleteCompetencyById` mutation. */
export type DeleteCompetencyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteCompetency` mutation. */
export type DeleteCompetencyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `Competency` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `Competency` mutation. */
export type DeleteCompetencyPayload = {
	__typename: 'DeleteCompetencyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Competency` that was deleted by this mutation. */
	competency: Maybe<Competency>;
	/** An edge for our `Competency`. May be used by Relay 1. */
	competencyEdge: Maybe<CompetenciesEdge>;
	deletedCompetencyId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `Competency` mutation. */
export type DeleteCompetencyPayloadCompetencyEdgeArgs = {
	orderBy?: InputMaybe<Array<CompetenciesOrderBy>>;
};

/** All input for the `deleteCompetencyRatingById` mutation. */
export type DeleteCompetencyRatingByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteCompetencyRatingByReviewIdAndCompetencyId` mutation. */
export type DeleteCompetencyRatingByReviewIdAndCompetencyIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	competencyId: Scalars['UUID']['input'];
	reviewId: Scalars['UUID']['input'];
};

/** All input for the `deleteCompetencyRating` mutation. */
export type DeleteCompetencyRatingInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `CompetencyRating` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `CompetencyRating` mutation. */
export type DeleteCompetencyRatingPayload = {
	__typename: 'DeleteCompetencyRatingPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Competency` that is related to this `CompetencyRating`. */
	competencyByCompetencyId: Maybe<Competency>;
	/** The `CompetencyRating` that was deleted by this mutation. */
	competencyRating: Maybe<CompetencyRating>;
	/** An edge for our `CompetencyRating`. May be used by Relay 1. */
	competencyRatingEdge: Maybe<CompetencyRatingsEdge>;
	deletedCompetencyRatingId: Maybe<Scalars['ID']['output']>;
	/** Reads a single `PerformanceReview` that is related to this `CompetencyRating`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `CompetencyRating` mutation. */
export type DeleteCompetencyRatingPayloadCompetencyRatingEdgeArgs = {
	orderBy?: InputMaybe<Array<CompetencyRatingsOrderBy>>;
};

/** All input for the `deleteConsentRecordById` mutation. */
export type DeleteConsentRecordByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteConsentRecordByUserIdAndConsentTypeAndConsentVersion` mutation. */
export type DeleteConsentRecordByUserIdAndConsentTypeAndConsentVersionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	consentType: Scalars['String']['input'];
	consentVersion: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteConsentRecord` mutation. */
export type DeleteConsentRecordInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ConsentRecord` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `ConsentRecord` mutation. */
export type DeleteConsentRecordPayload = {
	__typename: 'DeleteConsentRecordPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ConsentRecord` that was deleted by this mutation. */
	consentRecord: Maybe<ConsentRecord>;
	/** An edge for our `ConsentRecord`. May be used by Relay 1. */
	consentRecordEdge: Maybe<ConsentRecordsEdge>;
	deletedConsentRecordId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ConsentRecord`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `ConsentRecord` mutation. */
export type DeleteConsentRecordPayloadConsentRecordEdgeArgs = {
	orderBy?: InputMaybe<Array<ConsentRecordsOrderBy>>;
};

/** All input for the `deleteContactInfoById` mutation. */
export type DeleteContactInfoByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteContactInfo` mutation. */
export type DeleteContactInfoInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ContactInfo` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `ContactInfo` mutation. */
export type DeleteContactInfoPayload = {
	__typename: 'DeleteContactInfoPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ContactInfo` that was deleted by this mutation. */
	contactInfo: Maybe<ContactInfo>;
	/** An edge for our `ContactInfo`. May be used by Relay 1. */
	contactInfoEdge: Maybe<ContactInfosEdge>;
	deletedContactInformationId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ContactInfo`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our delete `ContactInfo` mutation. */
export type DeleteContactInfoPayloadContactInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<ContactInfosOrderBy>>;
};

/** All input for the `deleteDataBreachIncidentById` mutation. */
export type DeleteDataBreachIncidentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDataBreachIncidentByIncidentNumber` mutation. */
export type DeleteDataBreachIncidentByIncidentNumberInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	incidentNumber: Scalars['String']['input'];
};

/** All input for the `deleteDataBreachIncident` mutation. */
export type DeleteDataBreachIncidentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DataBreachIncident` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DataBreachIncident` mutation. */
export type DeleteDataBreachIncidentPayload = {
	__typename: 'DeleteDataBreachIncidentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataBreachIncident` that was deleted by this mutation. */
	dataBreachIncident: Maybe<DataBreachIncident>;
	/** An edge for our `DataBreachIncident`. May be used by Relay 1. */
	dataBreachIncidentEdge: Maybe<DataBreachIncidentsEdge>;
	deletedDataBreachIncidentId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `DataBreachIncident` mutation. */
export type DeleteDataBreachIncidentPayloadDataBreachIncidentEdgeArgs = {
	orderBy?: InputMaybe<Array<DataBreachIncidentsOrderBy>>;
};

/** All input for the `deleteDataLineageById` mutation. */
export type DeleteDataLineageByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDataLineage` mutation. */
export type DeleteDataLineageInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DataLineage` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DataLineage` mutation. */
export type DeleteDataLineagePayload = {
	__typename: 'DeleteDataLineagePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataLineage` that was deleted by this mutation. */
	dataLineage: Maybe<DataLineage>;
	/** An edge for our `DataLineage`. May be used by Relay 1. */
	dataLineageEdge: Maybe<DataLineagesEdge>;
	deletedDataLineageId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DataLineage`. */
	userByPerformedByUserId: Maybe<User>;
};

/** The output of our delete `DataLineage` mutation. */
export type DeleteDataLineagePayloadDataLineageEdgeArgs = {
	orderBy?: InputMaybe<Array<DataLineagesOrderBy>>;
};

/** All input for the `deleteDataProtectionMetadatumById` mutation. */
export type DeleteDataProtectionMetadatumByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDataProtectionMetadatum` mutation. */
export type DeleteDataProtectionMetadatumInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DataProtectionMetadatum` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DataProtectionMetadatum` mutation. */
export type DeleteDataProtectionMetadatumPayload = {
	__typename: 'DeleteDataProtectionMetadatumPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataProtectionMetadatum` that was deleted by this mutation. */
	dataProtectionMetadatum: Maybe<DataProtectionMetadatum>;
	/** An edge for our `DataProtectionMetadatum`. May be used by Relay 1. */
	dataProtectionMetadatumEdge: Maybe<DataProtectionMetadataEdge>;
	deletedDataProtectionMetadatumId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `DataProtectionMetadatum` mutation. */
export type DeleteDataProtectionMetadatumPayloadDataProtectionMetadatumEdgeArgs = {
	orderBy?: InputMaybe<Array<DataProtectionMetadataOrderBy>>;
};

/** All input for the `deleteDataRetentionPolicyById` mutation. */
export type DeleteDataRetentionPolicyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDataRetentionPolicyByPolicyName` mutation. */
export type DeleteDataRetentionPolicyByPolicyNameInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	policyName: Scalars['String']['input'];
};

/** All input for the `deleteDataRetentionPolicy` mutation. */
export type DeleteDataRetentionPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DataRetentionPolicy` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DataRetentionPolicy` mutation. */
export type DeleteDataRetentionPolicyPayload = {
	__typename: 'DeleteDataRetentionPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataRetentionPolicy` that was deleted by this mutation. */
	dataRetentionPolicy: Maybe<DataRetentionPolicy>;
	/** An edge for our `DataRetentionPolicy`. May be used by Relay 1. */
	dataRetentionPolicyEdge: Maybe<DataRetentionPoliciesEdge>;
	deletedDataRetentionPolicyId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `DataRetentionPolicy` mutation. */
export type DeleteDataRetentionPolicyPayloadDataRetentionPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<DataRetentionPoliciesOrderBy>>;
};

/** All input for the `deleteDepartmentById` mutation. */
export type DeleteDepartmentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDepartment` mutation. */
export type DeleteDepartmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `Department` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `Department` mutation. */
export type DeleteDepartmentPayload = {
	__typename: 'DeleteDepartmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedDepartmentId: Maybe<Scalars['ID']['output']>;
	/** The `Department` that was deleted by this mutation. */
	department: Maybe<Department>;
	/** Reads a single `Department` that is related to this `Department`. */
	departmentByParentDepartmentId: Maybe<Department>;
	/** An edge for our `Department`. May be used by Relay 1. */
	departmentEdge: Maybe<DepartmentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `Department`. */
	userByManagerId: Maybe<User>;
};

/** The output of our delete `Department` mutation. */
export type DeleteDepartmentPayloadDepartmentEdgeArgs = {
	orderBy?: InputMaybe<Array<DepartmentsOrderBy>>;
};

/** All input for the `deleteDocumentAccessByDocumentIdAndUserIdAndAccessType` mutation. */
export type DeleteDocumentAccessByDocumentIdAndUserIdAndAccessTypeInput = {
	accessType: Scalars['String']['input'];
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	documentId: Scalars['UUID']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteDocumentAccessById` mutation. */
export type DeleteDocumentAccessByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDocumentAccess` mutation. */
export type DeleteDocumentAccessInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DocumentAccess` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DocumentAccess` mutation. */
export type DeleteDocumentAccessPayload = {
	__typename: 'DeleteDocumentAccessPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedDocumentAccessId: Maybe<Scalars['ID']['output']>;
	/** The `DocumentAccess` that was deleted by this mutation. */
	documentAccess: Maybe<DocumentAccess>;
	/** An edge for our `DocumentAccess`. May be used by Relay 1. */
	documentAccessEdge: Maybe<DocumentAccessesEdge>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentAccess`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByGrantedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `DocumentAccess` mutation. */
export type DeleteDocumentAccessPayloadDocumentAccessEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** All input for the `deleteDocumentSignatureByDocumentIdAndSignerIdAndSignatureType` mutation. */
export type DeleteDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	documentId: Scalars['UUID']['input'];
	signatureType: Scalars['String']['input'];
	signerId: Scalars['UUID']['input'];
};

/** All input for the `deleteDocumentSignatureById` mutation. */
export type DeleteDocumentSignatureByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDocumentSignature` mutation. */
export type DeleteDocumentSignatureInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DocumentSignature` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DocumentSignature` mutation. */
export type DeleteDocumentSignaturePayload = {
	__typename: 'DeleteDocumentSignaturePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedDocumentSignatureId: Maybe<Scalars['ID']['output']>;
	/** The `DocumentSignature` that was deleted by this mutation. */
	documentSignature: Maybe<DocumentSignature>;
	/** An edge for our `DocumentSignature`. May be used by Relay 1. */
	documentSignatureEdge: Maybe<DocumentSignaturesEdge>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentSignature`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentSignature`. */
	userBySignerId: Maybe<User>;
};

/** The output of our delete `DocumentSignature` mutation. */
export type DeleteDocumentSignaturePayloadDocumentSignatureEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentSignaturesOrderBy>>;
};

/** All input for the `deleteDocumentTemplateById` mutation. */
export type DeleteDocumentTemplateByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteDocumentTemplateByTemplateNameAndVersion` mutation. */
export type DeleteDocumentTemplateByTemplateNameAndVersionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	templateName: Scalars['String']['input'];
	version: Scalars['String']['input'];
};

/** All input for the `deleteDocumentTemplate` mutation. */
export type DeleteDocumentTemplateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `DocumentTemplate` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `DocumentTemplate` mutation. */
export type DeleteDocumentTemplatePayload = {
	__typename: 'DeleteDocumentTemplatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedDocumentTemplateId: Maybe<Scalars['ID']['output']>;
	/** The `DocumentTemplate` that was deleted by this mutation. */
	documentTemplate: Maybe<DocumentTemplate>;
	/** Reads a single `DocumentTemplate` that is related to this `DocumentTemplate`. */
	documentTemplateByPreviousVersionId: Maybe<DocumentTemplate>;
	/** An edge for our `DocumentTemplate`. May be used by Relay 1. */
	documentTemplateEdge: Maybe<DocumentTemplatesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentTemplate`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our delete `DocumentTemplate` mutation. */
export type DeleteDocumentTemplatePayloadDocumentTemplateEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentTemplatesOrderBy>>;
};

/** All input for the `deleteEmployeeDocumentById` mutation. */
export type DeleteEmployeeDocumentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteEmployeeDocument` mutation. */
export type DeleteEmployeeDocumentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `EmployeeDocument` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `EmployeeDocument` mutation. */
export type DeleteEmployeeDocumentPayload = {
	__typename: 'DeleteEmployeeDocumentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedEmployeeDocumentId: Maybe<Scalars['ID']['output']>;
	/** Reads a single `DocumentTemplate` that is related to this `EmployeeDocument`. */
	documentTemplateByTemplateId: Maybe<DocumentTemplate>;
	/** The `EmployeeDocument` that was deleted by this mutation. */
	employeeDocument: Maybe<EmployeeDocument>;
	/** An edge for our `EmployeeDocument`. May be used by Relay 1. */
	employeeDocumentEdge: Maybe<EmployeeDocumentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our delete `EmployeeDocument` mutation. */
export type DeleteEmployeeDocumentPayloadEmployeeDocumentEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/** All input for the `deleteEmployeeGoalById` mutation. */
export type DeleteEmployeeGoalByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteEmployeeGoal` mutation. */
export type DeleteEmployeeGoalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `EmployeeGoal` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `EmployeeGoal` mutation. */
export type DeleteEmployeeGoalPayload = {
	__typename: 'DeleteEmployeeGoalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedGoalId: Maybe<Scalars['ID']['output']>;
	/** The `EmployeeGoal` that was deleted by this mutation. */
	employeeGoal: Maybe<EmployeeGoal>;
	/** An edge for our `EmployeeGoal`. May be used by Relay 1. */
	employeeGoalEdge: Maybe<EmployeeGoalsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `EmployeeGoal`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our delete `EmployeeGoal` mutation. */
export type DeleteEmployeeGoalPayloadEmployeeGoalEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** All input for the `deleteErasureRequestById` mutation. */
export type DeleteErasureRequestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteErasureRequest` mutation. */
export type DeleteErasureRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ErasureRequest` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `ErasureRequest` mutation. */
export type DeleteErasureRequestPayload = {
	__typename: 'DeleteErasureRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedErasureRequestId: Maybe<Scalars['ID']['output']>;
	/** The `ErasureRequest` that was deleted by this mutation. */
	erasureRequest: Maybe<ErasureRequest>;
	/** An edge for our `ErasureRequest`. May be used by Relay 1. */
	erasureRequestEdge: Maybe<ErasureRequestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ErasureRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `ErasureRequest` mutation. */
export type DeleteErasureRequestPayloadErasureRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<ErasureRequestsOrderBy>>;
};

/** All input for the `deleteFailedLoginAttemptById` mutation. */
export type DeleteFailedLoginAttemptByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteFailedLoginAttempt` mutation. */
export type DeleteFailedLoginAttemptInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `FailedLoginAttempt` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `FailedLoginAttempt` mutation. */
export type DeleteFailedLoginAttemptPayload = {
	__typename: 'DeleteFailedLoginAttemptPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedFailedLoginAttemptId: Maybe<Scalars['ID']['output']>;
	/** The `FailedLoginAttempt` that was deleted by this mutation. */
	failedLoginAttempt: Maybe<FailedLoginAttempt>;
	/** An edge for our `FailedLoginAttempt`. May be used by Relay 1. */
	failedLoginAttemptEdge: Maybe<FailedLoginAttemptsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `FailedLoginAttempt` mutation. */
export type DeleteFailedLoginAttemptPayloadFailedLoginAttemptEdgeArgs = {
	orderBy?: InputMaybe<Array<FailedLoginAttemptsOrderBy>>;
};

/** All input for the `deleteJobInfoById` mutation. */
export type DeleteJobInfoByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteJobInfo` mutation. */
export type DeleteJobInfoInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `JobInfo` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `JobInfo` mutation. */
export type DeleteJobInfoPayload = {
	__typename: 'DeleteJobInfoPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedJobInformationId: Maybe<Scalars['ID']['output']>;
	/** Reads a single `Department` that is related to this `JobInfo`. */
	departmentByDepartmentId: Maybe<Department>;
	/** The `JobInfo` that was deleted by this mutation. */
	jobInfo: Maybe<JobInfo>;
	/** An edge for our `JobInfo`. May be used by Relay 1. */
	jobInfoEdge: Maybe<JobInfosEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByManagerId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByReportsTo: Maybe<User>;
};

/** The output of our delete `JobInfo` mutation. */
export type DeleteJobInfoPayloadJobInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** All input for the `deleteNotificationById` mutation. */
export type DeleteNotificationByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationDeliveryById` mutation. */
export type DeleteNotificationDeliveryByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationDelivery` mutation. */
export type DeleteNotificationDeliveryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationDelivery` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `NotificationDelivery` mutation. */
export type DeleteNotificationDeliveryPayload = {
	__typename: 'DeleteNotificationDeliveryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedNotificationDeliveryId: Maybe<Scalars['ID']['output']>;
	/** Reads a single `Notification` that is related to this `NotificationDelivery`. */
	notificationByNotificationId: Maybe<Notification>;
	/** The `NotificationDelivery` that was deleted by this mutation. */
	notificationDelivery: Maybe<NotificationDelivery>;
	/** An edge for our `NotificationDelivery`. May be used by Relay 1. */
	notificationDeliveryEdge: Maybe<NotificationDeliveriesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationDelivery`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `NotificationDelivery` mutation. */
export type DeleteNotificationDeliveryPayloadNotificationDeliveryEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationDeliveriesOrderBy>>;
};

/** All input for the `deleteNotificationDigestById` mutation. */
export type DeleteNotificationDigestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationDigest` mutation. */
export type DeleteNotificationDigestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationDigest` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `NotificationDigest` mutation. */
export type DeleteNotificationDigestPayload = {
	__typename: 'DeleteNotificationDigestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedNotificationDigestId: Maybe<Scalars['ID']['output']>;
	/** The `NotificationDigest` that was deleted by this mutation. */
	notificationDigest: Maybe<NotificationDigest>;
	/** An edge for our `NotificationDigest`. May be used by Relay 1. */
	notificationDigestEdge: Maybe<NotificationDigestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationDigest`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `NotificationDigest` mutation. */
export type DeleteNotificationDigestPayloadNotificationDigestEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationDigestsOrderBy>>;
};

/** All input for the `deleteNotification` mutation. */
export type DeleteNotificationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `Notification` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `Notification` mutation. */
export type DeleteNotificationPayload = {
	__typename: 'DeleteNotificationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedNotificationId: Maybe<Scalars['ID']['output']>;
	/** The `Notification` that was deleted by this mutation. */
	notification: Maybe<Notification>;
	/** Reads a single `Notification` that is related to this `Notification`. */
	notificationByParentNotificationId: Maybe<Notification>;
	/** An edge for our `Notification`. May be used by Relay 1. */
	notificationEdge: Maybe<NotificationsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `Notification`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `Notification` mutation. */
export type DeleteNotificationPayloadNotificationEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationsOrderBy>>;
};

/** All input for the `deleteNotificationPreferenceById` mutation. */
export type DeleteNotificationPreferenceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationPreferenceByUserIdAndCategoryAndTemplateKey` mutation. */
export type DeleteNotificationPreferenceByUserIdAndCategoryAndTemplateKeyInput = {
	category: NotificationCategory;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	templateKey: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationPreference` mutation. */
export type DeleteNotificationPreferenceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationPreference` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `NotificationPreference` mutation. */
export type DeleteNotificationPreferencePayload = {
	__typename: 'DeleteNotificationPreferencePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedNotificationPreferenceId: Maybe<Scalars['ID']['output']>;
	/** The `NotificationPreference` that was deleted by this mutation. */
	notificationPreference: Maybe<NotificationPreference>;
	/** An edge for our `NotificationPreference`. May be used by Relay 1. */
	notificationPreferenceEdge: Maybe<NotificationPreferencesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationPreference`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `NotificationPreference` mutation. */
export type DeleteNotificationPreferencePayloadNotificationPreferenceEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationPreferencesOrderBy>>;
};

/** All input for the `deleteNotificationSubscriptionById` mutation. */
export type DeleteNotificationSubscriptionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationSubscriptionByUserIdAndResourceTypeAndResourceId` mutation. */
export type DeleteNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	resourceId: Scalars['UUID']['input'];
	resourceType: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationSubscription` mutation. */
export type DeleteNotificationSubscriptionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationSubscription` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `NotificationSubscription` mutation. */
export type DeleteNotificationSubscriptionPayload = {
	__typename: 'DeleteNotificationSubscriptionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedNotificationSubscriptionId: Maybe<Scalars['ID']['output']>;
	/** The `NotificationSubscription` that was deleted by this mutation. */
	notificationSubscription: Maybe<NotificationSubscription>;
	/** An edge for our `NotificationSubscription`. May be used by Relay 1. */
	notificationSubscriptionEdge: Maybe<NotificationSubscriptionsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationSubscription`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `NotificationSubscription` mutation. */
export type DeleteNotificationSubscriptionPayloadNotificationSubscriptionEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationSubscriptionsOrderBy>>;
};

/** All input for the `deleteNotificationTemplateById` mutation. */
export type DeleteNotificationTemplateByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteNotificationTemplateByTemplateKey` mutation. */
export type DeleteNotificationTemplateByTemplateKeyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	templateKey: Scalars['String']['input'];
};

/** All input for the `deleteNotificationTemplate` mutation. */
export type DeleteNotificationTemplateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationTemplate` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `NotificationTemplate` mutation. */
export type DeleteNotificationTemplatePayload = {
	__typename: 'DeleteNotificationTemplatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedNotificationTemplateId: Maybe<Scalars['ID']['output']>;
	/** The `NotificationTemplate` that was deleted by this mutation. */
	notificationTemplate: Maybe<NotificationTemplate>;
	/** Reads a single `NotificationTemplate` that is related to this `NotificationTemplate`. */
	notificationTemplateByPreviousVersionId: Maybe<NotificationTemplate>;
	/** An edge for our `NotificationTemplate`. May be used by Relay 1. */
	notificationTemplateEdge: Maybe<NotificationTemplatesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationTemplate`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our delete `NotificationTemplate` mutation. */
export type DeleteNotificationTemplatePayloadNotificationTemplateEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationTemplatesOrderBy>>;
};

/** All input for the `deletePasswordPolicyById` mutation. */
export type DeletePasswordPolicyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deletePasswordPolicyByPolicyName` mutation. */
export type DeletePasswordPolicyByPolicyNameInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	policyName: Scalars['String']['input'];
};

/** All input for the `deletePasswordPolicy` mutation. */
export type DeletePasswordPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PasswordPolicy` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `PasswordPolicy` mutation. */
export type DeletePasswordPolicyPayload = {
	__typename: 'DeletePasswordPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedPasswordPolicyId: Maybe<Scalars['ID']['output']>;
	/** The `PasswordPolicy` that was deleted by this mutation. */
	passwordPolicy: Maybe<PasswordPolicy>;
	/** An edge for our `PasswordPolicy`. May be used by Relay 1. */
	passwordPolicyEdge: Maybe<PasswordPoliciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `PasswordPolicy` mutation. */
export type DeletePasswordPolicyPayloadPasswordPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<PasswordPoliciesOrderBy>>;
};

/** All input for the `deletePayrollPeriodById` mutation. */
export type DeletePayrollPeriodByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deletePayrollPeriod` mutation. */
export type DeletePayrollPeriodInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PayrollPeriod` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `PayrollPeriod` mutation. */
export type DeletePayrollPeriodPayload = {
	__typename: 'DeletePayrollPeriodPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedPayrollPeriodId: Maybe<Scalars['ID']['output']>;
	/** The `PayrollPeriod` that was deleted by this mutation. */
	payrollPeriod: Maybe<PayrollPeriod>;
	/** An edge for our `PayrollPeriod`. May be used by Relay 1. */
	payrollPeriodEdge: Maybe<PayrollPeriodsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByApprovedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByProcessedBy: Maybe<User>;
};

/** The output of our delete `PayrollPeriod` mutation. */
export type DeletePayrollPeriodPayloadPayrollPeriodEdgeArgs = {
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** All input for the `deletePerformanceReviewByEmployeeIdAndCycleId` mutation. */
export type DeletePerformanceReviewByEmployeeIdAndCycleIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	cycleId: Scalars['UUID']['input'];
	employeeId: Scalars['UUID']['input'];
};

/** All input for the `deletePerformanceReviewById` mutation. */
export type DeletePerformanceReviewByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deletePerformanceReview` mutation. */
export type DeletePerformanceReviewInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PerformanceReview` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `PerformanceReview` mutation. */
export type DeletePerformanceReviewPayload = {
	__typename: 'DeletePerformanceReviewPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedPerformanceReviewId: Maybe<Scalars['ID']['output']>;
	/** The `PerformanceReview` that was deleted by this mutation. */
	performanceReview: Maybe<PerformanceReview>;
	/** An edge for our `PerformanceReview`. May be used by Relay 1. */
	performanceReviewEdge: Maybe<PerformanceReviewsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `ReviewCycle` that is related to this `PerformanceReview`. */
	reviewCycleByCycleId: Maybe<ReviewCycle>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByHrReviewerId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByManagerId: Maybe<User>;
};

/** The output of our delete `PerformanceReview` mutation. */
export type DeletePerformanceReviewPayloadPerformanceReviewEdgeArgs = {
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** All input for the `deletePrivacyImpactAssessmentByAssessmentReference` mutation. */
export type DeletePrivacyImpactAssessmentByAssessmentReferenceInput = {
	assessmentReference: Scalars['String']['input'];
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** All input for the `deletePrivacyImpactAssessmentById` mutation. */
export type DeletePrivacyImpactAssessmentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deletePrivacyImpactAssessment` mutation. */
export type DeletePrivacyImpactAssessmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PrivacyImpactAssessment` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `PrivacyImpactAssessment` mutation. */
export type DeletePrivacyImpactAssessmentPayload = {
	__typename: 'DeletePrivacyImpactAssessmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedPrivacyImpactAssessmentId: Maybe<Scalars['ID']['output']>;
	/** The `PrivacyImpactAssessment` that was deleted by this mutation. */
	privacyImpactAssessment: Maybe<PrivacyImpactAssessment>;
	/** An edge for our `PrivacyImpactAssessment`. May be used by Relay 1. */
	privacyImpactAssessmentEdge: Maybe<PrivacyImpactAssessmentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `PrivacyImpactAssessment` mutation. */
export type DeletePrivacyImpactAssessmentPayloadPrivacyImpactAssessmentEdgeArgs = {
	orderBy?: InputMaybe<Array<PrivacyImpactAssessmentsOrderBy>>;
};

/** All input for the `deletePrivacyRequestById` mutation. */
export type DeletePrivacyRequestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deletePrivacyRequestByRequestNumber` mutation. */
export type DeletePrivacyRequestByRequestNumberInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	requestNumber: Scalars['String']['input'];
};

/** All input for the `deletePrivacyRequest` mutation. */
export type DeletePrivacyRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PrivacyRequest` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `PrivacyRequest` mutation. */
export type DeletePrivacyRequestPayload = {
	__typename: 'DeletePrivacyRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedPrivacyRequestId: Maybe<Scalars['ID']['output']>;
	/** The `PrivacyRequest` that was deleted by this mutation. */
	privacyRequest: Maybe<PrivacyRequest>;
	/** An edge for our `PrivacyRequest`. May be used by Relay 1. */
	privacyRequestEdge: Maybe<PrivacyRequestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByAssignedTo: Maybe<User>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `PrivacyRequest` mutation. */
export type DeletePrivacyRequestPayloadPrivacyRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<PrivacyRequestsOrderBy>>;
};

/** All input for the `deleteProcessingActivityById` mutation. */
export type DeleteProcessingActivityByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteProcessingActivity` mutation. */
export type DeleteProcessingActivityInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ProcessingActivity` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `ProcessingActivity` mutation. */
export type DeleteProcessingActivityPayload = {
	__typename: 'DeleteProcessingActivityPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedProcessingActivityId: Maybe<Scalars['ID']['output']>;
	/** The `ProcessingActivity` that was deleted by this mutation. */
	processingActivity: Maybe<ProcessingActivity>;
	/** An edge for our `ProcessingActivity`. May be used by Relay 1. */
	processingActivityEdge: Maybe<ProcessingActivitiesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our delete `ProcessingActivity` mutation. */
export type DeleteProcessingActivityPayloadProcessingActivityEdgeArgs = {
	orderBy?: InputMaybe<Array<ProcessingActivitiesOrderBy>>;
};

/** All input for the `deleteReviewCycleById` mutation. */
export type DeleteReviewCycleByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteReviewCycle` mutation. */
export type DeleteReviewCycleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ReviewCycle` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `ReviewCycle` mutation. */
export type DeleteReviewCyclePayload = {
	__typename: 'DeleteReviewCyclePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedReviewCycleId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `ReviewCycle` that was deleted by this mutation. */
	reviewCycle: Maybe<ReviewCycle>;
	/** An edge for our `ReviewCycle`. May be used by Relay 1. */
	reviewCycleEdge: Maybe<ReviewCyclesEdge>;
	/** Reads a single `User` that is related to this `ReviewCycle`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our delete `ReviewCycle` mutation. */
export type DeleteReviewCyclePayloadReviewCycleEdgeArgs = {
	orderBy?: InputMaybe<Array<ReviewCyclesOrderBy>>;
};

/** All input for the `deleteSecurityEventById` mutation. */
export type DeleteSecurityEventByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteSecurityEvent` mutation. */
export type DeleteSecurityEventInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `SecurityEvent` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `SecurityEvent` mutation. */
export type DeleteSecurityEventPayload = {
	__typename: 'DeleteSecurityEventPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedSecurityEventId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `SecurityEvent` that was deleted by this mutation. */
	securityEvent: Maybe<SecurityEvent>;
	/** An edge for our `SecurityEvent`. May be used by Relay 1. */
	securityEventEdge: Maybe<SecurityEventsEdge>;
	/** Reads a single `User` that is related to this `SecurityEvent`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `SecurityEvent` mutation. */
export type DeleteSecurityEventPayloadSecurityEventEdgeArgs = {
	orderBy?: InputMaybe<Array<SecurityEventsOrderBy>>;
};

/** All input for the `deleteTimeOffBalanceById` mutation. */
export type DeleteTimeOffBalanceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteTimeOffBalanceByUserIdAndPolicyIdAndYear` mutation. */
export type DeleteTimeOffBalanceByUserIdAndPolicyIdAndYearInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	policyId: Scalars['UUID']['input'];
	userId: Scalars['UUID']['input'];
	year: Scalars['Int']['input'];
};

/** All input for the `deleteTimeOffBalance` mutation. */
export type DeleteTimeOffBalanceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `TimeOffBalance` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `TimeOffBalance` mutation. */
export type DeleteTimeOffBalancePayload = {
	__typename: 'DeleteTimeOffBalancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedTimeOffBalanceId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `TimeOffBalance` that was deleted by this mutation. */
	timeOffBalance: Maybe<TimeOffBalance>;
	/** An edge for our `TimeOffBalance`. May be used by Relay 1. */
	timeOffBalanceEdge: Maybe<TimeOffBalancesEdge>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffBalance`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	/** Reads a single `User` that is related to this `TimeOffBalance`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `TimeOffBalance` mutation. */
export type DeleteTimeOffBalancePayloadTimeOffBalanceEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffBalancesOrderBy>>;
};

/** All input for the `deleteTimeOffPolicyById` mutation. */
export type DeleteTimeOffPolicyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteTimeOffPolicy` mutation. */
export type DeleteTimeOffPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `TimeOffPolicy` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `TimeOffPolicy` mutation. */
export type DeleteTimeOffPolicyPayload = {
	__typename: 'DeleteTimeOffPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedTimeOffPolicyId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `TimeOffPolicy` that was deleted by this mutation. */
	timeOffPolicy: Maybe<TimeOffPolicy>;
	/** An edge for our `TimeOffPolicy`. May be used by Relay 1. */
	timeOffPolicyEdge: Maybe<TimeOffPoliciesEdge>;
	/** Reads a single `User` that is related to this `TimeOffPolicy`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our delete `TimeOffPolicy` mutation. */
export type DeleteTimeOffPolicyPayloadTimeOffPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffPoliciesOrderBy>>;
};

/** All input for the `deleteTimeOffRequestById` mutation. */
export type DeleteTimeOffRequestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteTimeOffRequest` mutation. */
export type DeleteTimeOffRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `TimeOffRequest` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `TimeOffRequest` mutation. */
export type DeleteTimeOffRequestPayload = {
	__typename: 'DeleteTimeOffRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedTimeOffRequestId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffRequest`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	/** The `TimeOffRequest` that was deleted by this mutation. */
	timeOffRequest: Maybe<TimeOffRequest>;
	/** An edge for our `TimeOffRequest`. May be used by Relay 1. */
	timeOffRequestEdge: Maybe<TimeOffRequestsEdge>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByReviewedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our delete `TimeOffRequest` mutation. */
export type DeleteTimeOffRequestPayloadTimeOffRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** All input for the `deleteUserByEmail` mutation. */
export type DeleteUserByEmailInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	email: Scalars['String']['input'];
};

/** All input for the `deleteUserById` mutation. */
export type DeleteUserByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteUserDeviceById` mutation. */
export type DeleteUserDeviceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteUserDeviceByUserIdAndDeviceId` mutation. */
export type DeleteUserDeviceByUserIdAndDeviceIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	deviceId: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteUserDevice` mutation. */
export type DeleteUserDeviceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserDevice` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `UserDevice` mutation. */
export type DeleteUserDevicePayload = {
	__typename: 'DeleteUserDevicePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserDeviceId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserDevice`. */
	userByUserId: Maybe<User>;
	/** The `UserDevice` that was deleted by this mutation. */
	userDevice: Maybe<UserDevice>;
	/** An edge for our `UserDevice`. May be used by Relay 1. */
	userDeviceEdge: Maybe<UserDevicesEdge>;
};

/** The output of our delete `UserDevice` mutation. */
export type DeleteUserDevicePayloadUserDeviceEdgeArgs = {
	orderBy?: InputMaybe<Array<UserDevicesOrderBy>>;
};

/** All input for the `deleteUser` mutation. */
export type DeleteUserInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `User` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** All input for the `deleteUserMfaSettingById` mutation. */
export type DeleteUserMfaSettingByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteUserMfaSettingByUserId` mutation. */
export type DeleteUserMfaSettingByUserIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteUserMfaSetting` mutation. */
export type DeleteUserMfaSettingInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserMfaSetting` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `UserMfaSetting` mutation. */
export type DeleteUserMfaSettingPayload = {
	__typename: 'DeleteUserMfaSettingPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserMfaSettingId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserMfaSetting`. */
	userByUserId: Maybe<User>;
	/** The `UserMfaSetting` that was deleted by this mutation. */
	userMfaSetting: Maybe<UserMfaSetting>;
	/** An edge for our `UserMfaSetting`. May be used by Relay 1. */
	userMfaSettingEdge: Maybe<UserMfaSettingsEdge>;
};

/** The output of our delete `UserMfaSetting` mutation. */
export type DeleteUserMfaSettingPayloadUserMfaSettingEdgeArgs = {
	orderBy?: InputMaybe<Array<UserMfaSettingsOrderBy>>;
};

/** All input for the `deleteUserPasswordHistoryById` mutation. */
export type DeleteUserPasswordHistoryByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteUserPasswordHistory` mutation. */
export type DeleteUserPasswordHistoryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserPasswordHistory` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `UserPasswordHistory` mutation. */
export type DeleteUserPasswordHistoryPayload = {
	__typename: 'DeleteUserPasswordHistoryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserPasswordHistoryId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserPasswordHistory`. */
	userByUserId: Maybe<User>;
	/** The `UserPasswordHistory` that was deleted by this mutation. */
	userPasswordHistory: Maybe<UserPasswordHistory>;
	/** An edge for our `UserPasswordHistory`. May be used by Relay 1. */
	userPasswordHistoryEdge: Maybe<UserPasswordHistoriesEdge>;
};

/** The output of our delete `UserPasswordHistory` mutation. */
export type DeleteUserPasswordHistoryPayloadUserPasswordHistoryEdgeArgs = {
	orderBy?: InputMaybe<Array<UserPasswordHistoriesOrderBy>>;
};

/** The output of our delete `User` mutation. */
export type DeleteUserPayload = {
	__typename: 'DeleteUserPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `User` that was deleted by this mutation. */
	user: Maybe<User>;
	/** An edge for our `User`. May be used by Relay 1. */
	userEdge: Maybe<UsersEdge>;
};

/** The output of our delete `User` mutation. */
export type DeleteUserPayloadUserEdgeArgs = {
	orderBy?: InputMaybe<Array<UsersOrderBy>>;
};

/** All input for the `deleteUserRoleAssignmentById` mutation. */
export type DeleteUserRoleAssignmentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteUserRoleAssignmentByUserIdAndRoleId` mutation. */
export type DeleteUserRoleAssignmentByUserIdAndRoleIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	roleId: Scalars['Int']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `deleteUserRoleAssignment` mutation. */
export type DeleteUserRoleAssignmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserRoleAssignment` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `UserRoleAssignment` mutation. */
export type DeleteUserRoleAssignmentPayload = {
	__typename: 'DeleteUserRoleAssignmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserRoleAssignmentId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByAssignedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByUserId: Maybe<User>;
	/** The `UserRoleAssignment` that was deleted by this mutation. */
	userRoleAssignment: Maybe<UserRoleAssignment>;
	/** An edge for our `UserRoleAssignment`. May be used by Relay 1. */
	userRoleAssignmentEdge: Maybe<UserRoleAssignmentsEdge>;
	/** Reads a single `UserRole` that is related to this `UserRoleAssignment`. */
	userRoleByRoleId: Maybe<UserRole>;
};

/** The output of our delete `UserRoleAssignment` mutation. */
export type DeleteUserRoleAssignmentPayloadUserRoleAssignmentEdgeArgs = {
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

/** All input for the `deleteUserRoleById` mutation. */
export type DeleteUserRoleByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['Int']['input'];
};

/** All input for the `deleteUserRoleByName` mutation. */
export type DeleteUserRoleByNameInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	name: Scalars['String']['input'];
};

/** All input for the `deleteUserRole` mutation. */
export type DeleteUserRoleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserRole` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `UserRole` mutation. */
export type DeleteUserRolePayload = {
	__typename: 'DeleteUserRolePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserRoleId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `UserRole` that was deleted by this mutation. */
	userRole: Maybe<UserRole>;
	/** An edge for our `UserRole`. May be used by Relay 1. */
	userRoleEdge: Maybe<UserRolesEdge>;
};

/** The output of our delete `UserRole` mutation. */
export type DeleteUserRolePayloadUserRoleEdgeArgs = {
	orderBy?: InputMaybe<Array<UserRolesOrderBy>>;
};

/** All input for the `deleteUserSessionById` mutation. */
export type DeleteUserSessionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteUserSessionByRefreshToken` mutation. */
export type DeleteUserSessionByRefreshTokenInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	refreshToken: Scalars['String']['input'];
};

/** All input for the `deleteUserSessionBySessionToken` mutation. */
export type DeleteUserSessionBySessionTokenInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	sessionToken: Scalars['String']['input'];
};

/** All input for the `deleteUserSession` mutation. */
export type DeleteUserSessionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserSession` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `UserSession` mutation. */
export type DeleteUserSessionPayload = {
	__typename: 'DeleteUserSessionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedUserSessionId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `UserSession` that was deleted by this mutation. */
	userSession: Maybe<UserSession>;
	/** An edge for our `UserSession`. May be used by Relay 1. */
	userSessionEdge: Maybe<UserSessionsEdge>;
};

/** The output of our delete `UserSession` mutation. */
export type DeleteUserSessionPayloadUserSessionEdgeArgs = {
	orderBy?: InputMaybe<Array<UserSessionsOrderBy>>;
};

/** All input for the `deleteWorkflowApprovalById` mutation. */
export type DeleteWorkflowApprovalByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteWorkflowApproval` mutation. */
export type DeleteWorkflowApprovalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowApproval` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `WorkflowApproval` mutation. */
export type DeleteWorkflowApprovalPayload = {
	__typename: 'DeleteWorkflowApprovalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedWorkflowApprovalId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByApproverId: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByEscalatedToId: Maybe<User>;
	/** The `WorkflowApproval` that was deleted by this mutation. */
	workflowApproval: Maybe<WorkflowApproval>;
	/** An edge for our `WorkflowApproval`. May be used by Relay 1. */
	workflowApprovalEdge: Maybe<WorkflowApprovalsEdge>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowApproval`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowApproval`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
};

/** The output of our delete `WorkflowApproval` mutation. */
export type DeleteWorkflowApprovalPayloadWorkflowApprovalEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** All input for the `deleteWorkflowDefinitionById` mutation. */
export type DeleteWorkflowDefinitionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteWorkflowDefinitionByNameAndVersion` mutation. */
export type DeleteWorkflowDefinitionByNameAndVersionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	name: Scalars['String']['input'];
	version: Scalars['Int']['input'];
};

/** All input for the `deleteWorkflowDefinition` mutation. */
export type DeleteWorkflowDefinitionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowDefinition` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `WorkflowDefinition` mutation. */
export type DeleteWorkflowDefinitionPayload = {
	__typename: 'DeleteWorkflowDefinitionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedWorkflowDefinitionId: Maybe<Scalars['ID']['output']>;
	/** Reads a single `Department` that is related to this `WorkflowDefinition`. */
	departmentByDepartmentId: Maybe<Department>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowDefinition`. */
	userByCreatedBy: Maybe<User>;
	/** The `WorkflowDefinition` that was deleted by this mutation. */
	workflowDefinition: Maybe<WorkflowDefinition>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowDefinition`. */
	workflowDefinitionByParentWorkflowId: Maybe<WorkflowDefinition>;
	/** An edge for our `WorkflowDefinition`. May be used by Relay 1. */
	workflowDefinitionEdge: Maybe<WorkflowDefinitionsEdge>;
};

/** The output of our delete `WorkflowDefinition` mutation. */
export type DeleteWorkflowDefinitionPayloadWorkflowDefinitionEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** All input for the `deleteWorkflowInstanceById` mutation. */
export type DeleteWorkflowInstanceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteWorkflowInstance` mutation. */
export type DeleteWorkflowInstanceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowInstance` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `WorkflowInstance` mutation. */
export type DeleteWorkflowInstancePayload = {
	__typename: 'DeleteWorkflowInstancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedWorkflowInstanceId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowInstance`. */
	userByTriggeredByUserId: Maybe<User>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowInstance`. */
	workflowDefinitionByWorkflowDefinitionId: Maybe<WorkflowDefinition>;
	/** The `WorkflowInstance` that was deleted by this mutation. */
	workflowInstance: Maybe<WorkflowInstance>;
	/** An edge for our `WorkflowInstance`. May be used by Relay 1. */
	workflowInstanceEdge: Maybe<WorkflowInstancesEdge>;
};

/** The output of our delete `WorkflowInstance` mutation. */
export type DeleteWorkflowInstancePayloadWorkflowInstanceEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowInstancesOrderBy>>;
};

/** All input for the `deleteWorkflowStepExecutionById` mutation. */
export type DeleteWorkflowStepExecutionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteWorkflowStepExecution` mutation. */
export type DeleteWorkflowStepExecutionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowStepExecution` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `WorkflowStepExecution` mutation. */
export type DeleteWorkflowStepExecutionPayload = {
	__typename: 'DeleteWorkflowStepExecutionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedWorkflowStepExecutionId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowStepExecution`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** The `WorkflowStepExecution` that was deleted by this mutation. */
	workflowStepExecution: Maybe<WorkflowStepExecution>;
	/** An edge for our `WorkflowStepExecution`. May be used by Relay 1. */
	workflowStepExecutionEdge: Maybe<WorkflowStepExecutionsEdge>;
};

/** The output of our delete `WorkflowStepExecution` mutation. */
export type DeleteWorkflowStepExecutionPayloadWorkflowStepExecutionEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowStepExecutionsOrderBy>>;
};

/** All input for the `deleteWorkflowTaskById` mutation. */
export type DeleteWorkflowTaskByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `deleteWorkflowTask` mutation. */
export type DeleteWorkflowTaskInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowTask` to be deleted. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our delete `WorkflowTask` mutation. */
export type DeleteWorkflowTaskPayload = {
	__typename: 'DeleteWorkflowTaskPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	deletedWorkflowTaskId: Maybe<Scalars['ID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedById: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedToId: Maybe<User>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowTask`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowTask`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
	/** The `WorkflowTask` that was deleted by this mutation. */
	workflowTask: Maybe<WorkflowTask>;
	/** An edge for our `WorkflowTask`. May be used by Relay 1. */
	workflowTaskEdge: Maybe<WorkflowTasksEdge>;
};

/** The output of our delete `WorkflowTask` mutation. */
export type DeleteWorkflowTaskPayloadWorkflowTaskEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

export type DeliveryStatus =
	| 'BOUNCED'
	| 'CLICKED'
	| 'DELIVERED'
	| 'FAILED'
	| 'PENDING'
	| 'READ'
	| 'SENT';

/** Organizational departments with hierarchical structure */
export type Department = Node & {
	__typename: 'Department';
	budget: Maybe<Scalars['BigFloat']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `Department` that is related to this `Department`. */
	departmentByParentDepartmentId: Maybe<Department>;
	/** Reads and enables pagination through a set of `Department`. */
	departmentsByParentDepartmentId: DepartmentsConnection;
	description: Maybe<Scalars['String']['output']>;
	/** Computed field showing number of active employees in department */
	employeeCount: Maybe<Scalars['Int']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** Reads and enables pagination through a set of `JobInfo`. */
	jobInfosByDepartmentId: JobInfosConnection;
	managerId: Maybe<Scalars['UUID']['output']>;
	name: Scalars['String']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	parentDepartmentId: Maybe<Scalars['UUID']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `Department`. */
	userByManagerId: Maybe<User>;
	/** Reads and enables pagination through a set of `WorkflowDefinition`. */
	workflowDefinitionsByDepartmentId: WorkflowDefinitionsConnection;
};

/** Organizational departments with hierarchical structure */
export type DepartmentDepartmentsByParentDepartmentIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DepartmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DepartmentsOrderBy>>;
};

/** Organizational departments with hierarchical structure */
export type DepartmentJobInfosByDepartmentIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<JobInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** Organizational departments with hierarchical structure */
export type DepartmentWorkflowDefinitionsByDepartmentIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowDefinitionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** Department statistics and employee distribution */
export type DepartmentAnalytics = {
	__typename: 'DepartmentAnalytics';
	activeEmployees: Maybe<Scalars['BigInt']['output']>;
	avgTenureMonths: Maybe<Scalars['BigFloat']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	description: Maybe<Scalars['String']['output']>;
	employeeCount: Maybe<Scalars['BigInt']['output']>;
	id: Maybe<Scalars['UUID']['output']>;
	inactiveEmployees: Maybe<Scalars['BigInt']['output']>;
	isActive: Maybe<Scalars['Boolean']['output']>;
	managementCount: Maybe<Scalars['BigInt']['output']>;
	managerId: Maybe<Scalars['UUID']['output']>;
	managerName: Maybe<Scalars['String']['output']>;
	maxTenureMonths: Maybe<Scalars['BigFloat']['output']>;
	minTenureMonths: Maybe<Scalars['BigFloat']['output']>;
	name: Maybe<Scalars['String']['output']>;
	onboardingEmployees: Maybe<Scalars['BigInt']['output']>;
	recentHires: Maybe<Scalars['BigInt']['output']>;
	totalEmployees: Maybe<Scalars['BigInt']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/** A connection to a list of `DepartmentAnalytics` values. */
export type DepartmentAnalyticsConnection = {
	__typename: 'DepartmentAnalyticsConnection';
	/** A list of edges which contains the `DepartmentAnalytics` and cursor to aid in pagination. */
	edges: Array<DepartmentAnalyticsEdge>;
	/** A list of `DepartmentAnalytics` objects. */
	nodes: Array<DepartmentAnalytics>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DepartmentAnalytics` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DepartmentAnalytics` edge in the connection. */
export type DepartmentAnalyticsEdge = {
	__typename: 'DepartmentAnalyticsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DepartmentAnalytics` at the end of the edge. */
	node: DepartmentAnalytics;
};

/** Methods to use when ordering `DepartmentAnalytics`. */
export type DepartmentAnalyticsOrderBy = 'NATURAL';

/**
 * A condition to be used against `Department` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type DepartmentCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `managerId` field. */
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `parentDepartmentId` field. */
	parentDepartmentId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `Department` */
export type DepartmentInput = {
	budget?: InputMaybe<Scalars['BigFloat']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	name: Scalars['String']['input'];
	parentDepartmentId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `Department`. Fields that are set will be updated. */
export type DepartmentPatch = {
	budget?: InputMaybe<Scalars['BigFloat']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	name?: InputMaybe<Scalars['String']['input']>;
	parentDepartmentId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `Department` values. */
export type DepartmentsConnection = {
	__typename: 'DepartmentsConnection';
	/** A list of edges which contains the `Department` and cursor to aid in pagination. */
	edges: Array<DepartmentsEdge>;
	/** A list of `Department` objects. */
	nodes: Array<Department>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `Department` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `Department` edge in the connection. */
export type DepartmentsEdge = {
	__typename: 'DepartmentsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `Department` at the end of the edge. */
	node: Department;
};

/** Methods to use when ordering `Department`. */
export type DepartmentsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'MANAGER_ID_ASC'
	| 'MANAGER_ID_DESC'
	| 'NATURAL'
	| 'PARENT_DEPARTMENT_ID_ASC'
	| 'PARENT_DEPARTMENT_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

export type DeviceTrustLevel = 'BLOCKED' | 'RECOGNIZED' | 'TRUSTED' | 'UNKNOWN';

export type DigestFrequency = 'DAILY' | 'HOURLY' | 'IMMEDIATE' | 'NONE' | 'WEEKLY';

/** Document sharing and access control records */
export type DocumentAccess = Node & {
	__typename: 'DocumentAccess';
	accessCount: Maybe<Scalars['Int']['output']>;
	accessReason: Maybe<Scalars['String']['output']>;
	accessType: Scalars['String']['output'];
	createdAt: Maybe<Scalars['Datetime']['output']>;
	documentId: Scalars['UUID']['output'];
	/** Reads a single `EmployeeDocument` that is related to this `DocumentAccess`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	grantedBy: Scalars['UUID']['output'];
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	lastAccessedAt: Maybe<Scalars['Datetime']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByGrantedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	validFrom: Maybe<Scalars['Datetime']['output']>;
	validUntil: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `DocumentAccess` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type DocumentAccessCondition = {
	/** Checks for equality with the object’s `documentId` field. */
	documentId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `grantedBy` field. */
	grantedBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `DocumentAccess` */
export type DocumentAccessInput = {
	accessCount?: InputMaybe<Scalars['Int']['input']>;
	accessReason?: InputMaybe<Scalars['String']['input']>;
	accessType: Scalars['String']['input'];
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	documentId: Scalars['UUID']['input'];
	grantedBy: Scalars['UUID']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	lastAccessedAt?: InputMaybe<Scalars['Datetime']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
	validFrom?: InputMaybe<Scalars['Datetime']['input']>;
	validUntil?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `DocumentAccess`. Fields that are set will be updated. */
export type DocumentAccessPatch = {
	accessCount?: InputMaybe<Scalars['Int']['input']>;
	accessReason?: InputMaybe<Scalars['String']['input']>;
	accessType?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	documentId?: InputMaybe<Scalars['UUID']['input']>;
	grantedBy?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	lastAccessedAt?: InputMaybe<Scalars['Datetime']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	validFrom?: InputMaybe<Scalars['Datetime']['input']>;
	validUntil?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `DocumentAccess` values. */
export type DocumentAccessesConnection = {
	__typename: 'DocumentAccessesConnection';
	/** A list of edges which contains the `DocumentAccess` and cursor to aid in pagination. */
	edges: Array<DocumentAccessesEdge>;
	/** A list of `DocumentAccess` objects. */
	nodes: Array<DocumentAccess>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DocumentAccess` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DocumentAccess` edge in the connection. */
export type DocumentAccessesEdge = {
	__typename: 'DocumentAccessesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DocumentAccess` at the end of the edge. */
	node: DocumentAccess;
};

/** Methods to use when ordering `DocumentAccess`. */
export type DocumentAccessesOrderBy =
	| 'DOCUMENT_ID_ASC'
	| 'DOCUMENT_ID_DESC'
	| 'GRANTED_BY_ASC'
	| 'GRANTED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** Digital signatures for employee documents with verification */
export type DocumentSignature = Node & {
	__typename: 'DocumentSignature';
	createdAt: Maybe<Scalars['Datetime']['output']>;
	documentId: Scalars['UUID']['output'];
	/** Reads a single `EmployeeDocument` that is related to this `DocumentSignature`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	id: Scalars['UUID']['output'];
	ipAddress: Maybe<Scalars['InternetAddress']['output']>;
	isCompleted: Maybe<Scalars['Boolean']['output']>;
	isRequired: Maybe<Scalars['Boolean']['output']>;
	isVerified: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Base64 encoded signature image or cryptographic signature */
	signatureData: Maybe<Scalars['String']['output']>;
	signatureMethod: Maybe<Scalars['String']['output']>;
	signatureOrder: Maybe<Scalars['Int']['output']>;
	signatureType: Scalars['String']['output'];
	signedAt: Maybe<Scalars['Datetime']['output']>;
	signerId: Scalars['UUID']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	userAgent: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `DocumentSignature`. */
	userBySignerId: Maybe<User>;
	verificationCode: Maybe<Scalars['String']['output']>;
};

/**
 * A condition to be used against `DocumentSignature` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type DocumentSignatureCondition = {
	/** Checks for equality with the object’s `documentId` field. */
	documentId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `signerId` field. */
	signerId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `DocumentSignature` */
export type DocumentSignatureInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	documentId: Scalars['UUID']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isCompleted?: InputMaybe<Scalars['Boolean']['input']>;
	isRequired?: InputMaybe<Scalars['Boolean']['input']>;
	isVerified?: InputMaybe<Scalars['Boolean']['input']>;
	/** Base64 encoded signature image or cryptographic signature */
	signatureData?: InputMaybe<Scalars['String']['input']>;
	signatureMethod?: InputMaybe<Scalars['String']['input']>;
	signatureOrder?: InputMaybe<Scalars['Int']['input']>;
	signatureType: Scalars['String']['input'];
	signedAt?: InputMaybe<Scalars['Datetime']['input']>;
	signerId: Scalars['UUID']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	verificationCode?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an update to a `DocumentSignature`. Fields that are set will be updated. */
export type DocumentSignaturePatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	documentId?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isCompleted?: InputMaybe<Scalars['Boolean']['input']>;
	isRequired?: InputMaybe<Scalars['Boolean']['input']>;
	isVerified?: InputMaybe<Scalars['Boolean']['input']>;
	/** Base64 encoded signature image or cryptographic signature */
	signatureData?: InputMaybe<Scalars['String']['input']>;
	signatureMethod?: InputMaybe<Scalars['String']['input']>;
	signatureOrder?: InputMaybe<Scalars['Int']['input']>;
	signatureType?: InputMaybe<Scalars['String']['input']>;
	signedAt?: InputMaybe<Scalars['Datetime']['input']>;
	signerId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	verificationCode?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of `DocumentSignature` values. */
export type DocumentSignaturesConnection = {
	__typename: 'DocumentSignaturesConnection';
	/** A list of edges which contains the `DocumentSignature` and cursor to aid in pagination. */
	edges: Array<DocumentSignaturesEdge>;
	/** A list of `DocumentSignature` objects. */
	nodes: Array<DocumentSignature>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DocumentSignature` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DocumentSignature` edge in the connection. */
export type DocumentSignaturesEdge = {
	__typename: 'DocumentSignaturesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DocumentSignature` at the end of the edge. */
	node: DocumentSignature;
};

/** Methods to use when ordering `DocumentSignature`. */
export type DocumentSignaturesOrderBy =
	| 'DOCUMENT_ID_ASC'
	| 'DOCUMENT_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'SIGNER_ID_ASC'
	| 'SIGNER_ID_DESC';

export type DocumentStatus =
	| 'ARCHIVED'
	| 'COMPLETED'
	| 'DELETED'
	| 'DRAFT'
	| 'EXPIRED'
	| 'PENDING_SIGNATURE'
	| 'SIGNED';

/** Document templates for generating standardized HR documents */
export type DocumentTemplate = Node & {
	__typename: 'DocumentTemplate';
	accessLevel: Maybe<AccessLevel>;
	autoExpireDays: Maybe<Scalars['Int']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	description: Maybe<Scalars['String']['output']>;
	/** Reads a single `DocumentTemplate` that is related to this `DocumentTemplate`. */
	documentTemplateByPreviousVersionId: Maybe<DocumentTemplate>;
	/** Reads and enables pagination through a set of `DocumentTemplate`. */
	documentTemplatesByPreviousVersionId: DocumentTemplatesConnection;
	documentType: DocumentType;
	/** Reads and enables pagination through a set of `EmployeeDocument`. */
	employeeDocumentsByTemplateId: EmployeeDocumentsConnection;
	filePath: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	previousVersionId: Maybe<Scalars['UUID']['output']>;
	requiredFields: Maybe<Scalars['JSON']['output']>;
	requiresSignature: Maybe<Scalars['Boolean']['output']>;
	signatureFields: Maybe<Scalars['JSON']['output']>;
	templateContent: Maybe<Scalars['String']['output']>;
	templateName: Scalars['String']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `DocumentTemplate`. */
	userByCreatedBy: Maybe<User>;
	version: Maybe<Scalars['String']['output']>;
};

/** Document templates for generating standardized HR documents */
export type DocumentTemplateDocumentTemplatesByPreviousVersionIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentTemplateCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentTemplatesOrderBy>>;
};

/** Document templates for generating standardized HR documents */
export type DocumentTemplateEmployeeDocumentsByTemplateIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeDocumentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/**
 * A condition to be used against `DocumentTemplate` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type DocumentTemplateCondition = {
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `previousVersionId` field. */
	previousVersionId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `templateName` field. */
	templateName?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `DocumentTemplate` */
export type DocumentTemplateInput = {
	accessLevel?: InputMaybe<AccessLevel>;
	autoExpireDays?: InputMaybe<Scalars['Int']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	description?: InputMaybe<Scalars['String']['input']>;
	documentType: DocumentType;
	filePath?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	previousVersionId?: InputMaybe<Scalars['UUID']['input']>;
	requiredFields?: InputMaybe<Scalars['JSON']['input']>;
	requiresSignature?: InputMaybe<Scalars['Boolean']['input']>;
	signatureFields?: InputMaybe<Scalars['JSON']['input']>;
	templateContent?: InputMaybe<Scalars['String']['input']>;
	templateName: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	version?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an update to a `DocumentTemplate`. Fields that are set will be updated. */
export type DocumentTemplatePatch = {
	accessLevel?: InputMaybe<AccessLevel>;
	autoExpireDays?: InputMaybe<Scalars['Int']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	documentType?: InputMaybe<DocumentType>;
	filePath?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	previousVersionId?: InputMaybe<Scalars['UUID']['input']>;
	requiredFields?: InputMaybe<Scalars['JSON']['input']>;
	requiresSignature?: InputMaybe<Scalars['Boolean']['input']>;
	signatureFields?: InputMaybe<Scalars['JSON']['input']>;
	templateContent?: InputMaybe<Scalars['String']['input']>;
	templateName?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	version?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of `DocumentTemplate` values. */
export type DocumentTemplatesConnection = {
	__typename: 'DocumentTemplatesConnection';
	/** A list of edges which contains the `DocumentTemplate` and cursor to aid in pagination. */
	edges: Array<DocumentTemplatesEdge>;
	/** A list of `DocumentTemplate` objects. */
	nodes: Array<DocumentTemplate>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `DocumentTemplate` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `DocumentTemplate` edge in the connection. */
export type DocumentTemplatesEdge = {
	__typename: 'DocumentTemplatesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `DocumentTemplate` at the end of the edge. */
	node: DocumentTemplate;
};

/** Methods to use when ordering `DocumentTemplate`. */
export type DocumentTemplatesOrderBy =
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PREVIOUS_VERSION_ID_ASC'
	| 'PREVIOUS_VERSION_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'TEMPLATE_NAME_ASC'
	| 'TEMPLATE_NAME_DESC';

export type DocumentType =
	| 'BACKGROUND_CHECK'
	| 'BANK_INFO'
	| 'BENEFITS_ENROLLMENT'
	| 'CONTRACT'
	| 'DISCIPLINARY_ACTION'
	| 'EMERGENCY_CONTACT'
	| 'HANDBOOK_ACKNOWLEDGMENT'
	| 'MEDICAL_RECORDS'
	| 'OFFER_LETTER'
	| 'OTHER'
	| 'PERFORMANCE_REVIEW'
	| 'POLICY_ACKNOWLEDGMENT'
	| 'REFERENCE_CHECK'
	| 'RESIGNATION_LETTER'
	| 'TAX_FORM'
	| 'TERMINATION_NOTICE'
	| 'TRAINING_CERTIFICATE';

/** Employee documents with file storage and digital signature support */
export type EmployeeDocument = Node & {
	__typename: 'EmployeeDocument';
	accessLevel: Maybe<AccessLevel>;
	complianceNotes: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	description: Maybe<Scalars['String']['output']>;
	/** Reads and enables pagination through a set of `DocumentAccess`. */
	documentAccessesByDocumentId: DocumentAccessesConnection;
	documentContent: Maybe<Scalars['String']['output']>;
	documentData: Maybe<Scalars['JSON']['output']>;
	documentName: Scalars['String']['output'];
	/** Reads and enables pagination through a set of `DocumentSignature`. */
	documentSignaturesByDocumentId: DocumentSignaturesConnection;
	/** Reads a single `DocumentTemplate` that is related to this `EmployeeDocument`. */
	documentTemplateByTemplateId: Maybe<DocumentTemplate>;
	documentType: DocumentType;
	employeeId: Scalars['UUID']['output'];
	expiresAt: Maybe<Scalars['Datetime']['output']>;
	/** SHA-256 hash of file content for integrity verification */
	fileHash: Maybe<Scalars['String']['output']>;
	fileMimeType: Maybe<Scalars['String']['output']>;
	fileName: Maybe<Scalars['String']['output']>;
	filePath: Maybe<Scalars['String']['output']>;
	fileSizeBytes: Maybe<Scalars['BigInt']['output']>;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** How long to retain document after employee termination or document expiration */
	retentionPeriod: Maybe<Interval>;
	status: Maybe<DocumentStatus>;
	tags: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	templateId: Maybe<Scalars['UUID']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByEmployeeId: Maybe<User>;
};

/** Employee documents with file storage and digital signature support */
export type EmployeeDocumentDocumentAccessesByDocumentIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentAccessCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** Employee documents with file storage and digital signature support */
export type EmployeeDocumentDocumentSignaturesByDocumentIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentSignatureCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentSignaturesOrderBy>>;
};

/**
 * A condition to be used against `EmployeeDocument` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type EmployeeDocumentCondition = {
	/** Checks for equality with the object’s `accessLevel` field. */
	accessLevel?: InputMaybe<AccessLevel>;
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `employeeId` field. */
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<DocumentStatus>;
	/** Checks for equality with the object’s `tags` field. */
	tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	/** Checks for equality with the object’s `templateId` field. */
	templateId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `EmployeeDocument` */
export type EmployeeDocumentInput = {
	accessLevel?: InputMaybe<AccessLevel>;
	complianceNotes?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	description?: InputMaybe<Scalars['String']['input']>;
	documentContent?: InputMaybe<Scalars['String']['input']>;
	documentData?: InputMaybe<Scalars['JSON']['input']>;
	documentName: Scalars['String']['input'];
	documentType: DocumentType;
	employeeId: Scalars['UUID']['input'];
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	/** SHA-256 hash of file content for integrity verification */
	fileHash?: InputMaybe<Scalars['String']['input']>;
	fileMimeType?: InputMaybe<Scalars['String']['input']>;
	fileName?: InputMaybe<Scalars['String']['input']>;
	filePath?: InputMaybe<Scalars['String']['input']>;
	fileSizeBytes?: InputMaybe<Scalars['BigInt']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** How long to retain document after employee termination or document expiration */
	retentionPeriod?: InputMaybe<IntervalInput>;
	status?: InputMaybe<DocumentStatus>;
	tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	templateId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `EmployeeDocument`. Fields that are set will be updated. */
export type EmployeeDocumentPatch = {
	accessLevel?: InputMaybe<AccessLevel>;
	complianceNotes?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	documentContent?: InputMaybe<Scalars['String']['input']>;
	documentData?: InputMaybe<Scalars['JSON']['input']>;
	documentName?: InputMaybe<Scalars['String']['input']>;
	documentType?: InputMaybe<DocumentType>;
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	/** SHA-256 hash of file content for integrity verification */
	fileHash?: InputMaybe<Scalars['String']['input']>;
	fileMimeType?: InputMaybe<Scalars['String']['input']>;
	fileName?: InputMaybe<Scalars['String']['input']>;
	filePath?: InputMaybe<Scalars['String']['input']>;
	fileSizeBytes?: InputMaybe<Scalars['BigInt']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** How long to retain document after employee termination or document expiration */
	retentionPeriod?: InputMaybe<IntervalInput>;
	status?: InputMaybe<DocumentStatus>;
	tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	templateId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `EmployeeDocument` values. */
export type EmployeeDocumentsConnection = {
	__typename: 'EmployeeDocumentsConnection';
	/** A list of edges which contains the `EmployeeDocument` and cursor to aid in pagination. */
	edges: Array<EmployeeDocumentsEdge>;
	/** A list of `EmployeeDocument` objects. */
	nodes: Array<EmployeeDocument>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `EmployeeDocument` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `EmployeeDocument` edge in the connection. */
export type EmployeeDocumentsEdge = {
	__typename: 'EmployeeDocumentsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `EmployeeDocument` at the end of the edge. */
	node: EmployeeDocument;
};

/** Methods to use when ordering `EmployeeDocument`. */
export type EmployeeDocumentsOrderBy =
	| 'ACCESS_LEVEL_ASC'
	| 'ACCESS_LEVEL_DESC'
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'EMPLOYEE_ID_ASC'
	| 'EMPLOYEE_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC'
	| 'TAGS_ASC'
	| 'TAGS_DESC'
	| 'TEMPLATE_ID_ASC'
	| 'TEMPLATE_ID_DESC';

/** Individual employee goals linked to performance reviews */
export type EmployeeGoal = Node & {
	__typename: 'EmployeeGoal';
	category: Maybe<Scalars['String']['output']>;
	completedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Maybe<Scalars['UUID']['output']>;
	createdDate: Maybe<Scalars['Date']['output']>;
	description: Maybe<Scalars['String']['output']>;
	employeeId: Scalars['UUID']['output'];
	finalOutcome: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads a single `PerformanceReview` that is related to this `EmployeeGoal`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	priority: Maybe<Scalars['String']['output']>;
	/** Goal completion progress as percentage (0-100) */
	progressPercentage: Maybe<Scalars['Int']['output']>;
	reviewId: Maybe<Scalars['UUID']['output']>;
	status: Maybe<GoalStatus>;
	successCriteria: Maybe<Scalars['String']['output']>;
	targetDate: Maybe<Scalars['Date']['output']>;
	title: Scalars['String']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByEmployeeId: Maybe<User>;
	weight: Maybe<Scalars['BigFloat']['output']>;
};

/**
 * A condition to be used against `EmployeeGoal` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type EmployeeGoalCondition = {
	/** Checks for equality with the object’s `category` field. */
	category?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `employeeId` field. */
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `reviewId` field. */
	reviewId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `EmployeeGoal` */
export type EmployeeGoalInput = {
	category?: InputMaybe<Scalars['String']['input']>;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	createdDate?: InputMaybe<Scalars['Date']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	employeeId: Scalars['UUID']['input'];
	finalOutcome?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	priority?: InputMaybe<Scalars['String']['input']>;
	/** Goal completion progress as percentage (0-100) */
	progressPercentage?: InputMaybe<Scalars['Int']['input']>;
	reviewId?: InputMaybe<Scalars['UUID']['input']>;
	status?: InputMaybe<GoalStatus>;
	successCriteria?: InputMaybe<Scalars['String']['input']>;
	targetDate?: InputMaybe<Scalars['Date']['input']>;
	title: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	weight?: InputMaybe<Scalars['BigFloat']['input']>;
};

/** Represents an update to a `EmployeeGoal`. Fields that are set will be updated. */
export type EmployeeGoalPatch = {
	category?: InputMaybe<Scalars['String']['input']>;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	createdDate?: InputMaybe<Scalars['Date']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	finalOutcome?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	priority?: InputMaybe<Scalars['String']['input']>;
	/** Goal completion progress as percentage (0-100) */
	progressPercentage?: InputMaybe<Scalars['Int']['input']>;
	reviewId?: InputMaybe<Scalars['UUID']['input']>;
	status?: InputMaybe<GoalStatus>;
	successCriteria?: InputMaybe<Scalars['String']['input']>;
	targetDate?: InputMaybe<Scalars['Date']['input']>;
	title?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	weight?: InputMaybe<Scalars['BigFloat']['input']>;
};

/** A connection to a list of `EmployeeGoal` values. */
export type EmployeeGoalsConnection = {
	__typename: 'EmployeeGoalsConnection';
	/** A list of edges which contains the `EmployeeGoal` and cursor to aid in pagination. */
	edges: Array<EmployeeGoalsEdge>;
	/** A list of `EmployeeGoal` objects. */
	nodes: Array<EmployeeGoal>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `EmployeeGoal` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `EmployeeGoal` edge in the connection. */
export type EmployeeGoalsEdge = {
	__typename: 'EmployeeGoalsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `EmployeeGoal` at the end of the edge. */
	node: EmployeeGoal;
};

/** Methods to use when ordering `EmployeeGoal`. */
export type EmployeeGoalsOrderBy =
	| 'CATEGORY_ASC'
	| 'CATEGORY_DESC'
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'EMPLOYEE_ID_ASC'
	| 'EMPLOYEE_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'REVIEW_ID_ASC'
	| 'REVIEW_ID_DESC';

/** Comprehensive employee information with calculated fields */
export type EmployeeOverview = {
	__typename: 'EmployeeOverview';
	departmentId: Maybe<Scalars['UUID']['output']>;
	departmentName: Maybe<Scalars['String']['output']>;
	displayName: Maybe<Scalars['String']['output']>;
	email: Maybe<Scalars['String']['output']>;
	employeeStatus: Maybe<Scalars['String']['output']>;
	employmentType: Maybe<Scalars['String']['output']>;
	endDate: Maybe<Scalars['Date']['output']>;
	hireDate: Maybe<Scalars['Datetime']['output']>;
	id: Maybe<Scalars['UUID']['output']>;
	isActive: Maybe<Scalars['Boolean']['output']>;
	jobTitle: Maybe<Scalars['String']['output']>;
	lastLogin: Maybe<Scalars['Datetime']['output']>;
	managerId: Maybe<Scalars['UUID']['output']>;
	managerName: Maybe<Scalars['String']['output']>;
	onboardingStatus: Maybe<Scalars['String']['output']>;
	primaryRole: Maybe<Scalars['String']['output']>;
	roleLevel: Maybe<Scalars['Int']['output']>;
	startDate: Maybe<Scalars['Date']['output']>;
	tenureMonths: Maybe<Scalars['BigFloat']['output']>;
};

/** A connection to a list of `EmployeeOverview` values. */
export type EmployeeOverviewsConnection = {
	__typename: 'EmployeeOverviewsConnection';
	/** A list of edges which contains the `EmployeeOverview` and cursor to aid in pagination. */
	edges: Array<EmployeeOverviewsEdge>;
	/** A list of `EmployeeOverview` objects. */
	nodes: Array<EmployeeOverview>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `EmployeeOverview` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `EmployeeOverview` edge in the connection. */
export type EmployeeOverviewsEdge = {
	__typename: 'EmployeeOverviewsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `EmployeeOverview` at the end of the edge. */
	node: EmployeeOverview;
};

/** Methods to use when ordering `EmployeeOverview`. */
export type EmployeeOverviewsOrderBy = 'NATURAL';

export type EmploymentStatus =
	| 'CONSULTANT'
	| 'CONTRACT'
	| 'FULL_TIME'
	| 'INTERN'
	| 'PART_TIME'
	| 'TEMPORARY';

export type EncryptionStatus =
	| 'ENCRYPTED'
	| 'PARTIALLY_ENCRYPTED'
	| 'PENDING_ENCRYPTION'
	| 'UNENCRYPTED';

/** GDPR Article 17 right to erasure (right to be forgotten) processing */
export type ErasureRequest = Node & {
	__typename: 'ErasureRequest';
	assignedTo: Maybe<Scalars['UUID']['output']>;
	businessImpactAssessment: Maybe<Scalars['String']['output']>;
	completionCertificatePath: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	dataAnonymizedCount: Maybe<Scalars['Int']['output']>;
	dataDeletedCount: Maybe<Scalars['Int']['output']>;
	dependentDataIdentified: Maybe<Scalars['Boolean']['output']>;
	dependentSystems: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	erasureScope: Scalars['JSON']['output'];
	estimatedCompletionDate: Maybe<Scalars['Date']['output']>;
	executedBy: Maybe<Scalars['UUID']['output']>;
	executionCompletedAt: Maybe<Scalars['Datetime']['output']>;
	executionStartedAt: Maybe<Scalars['Datetime']['output']>;
	executionVerifiedAt: Maybe<Scalars['Datetime']['output']>;
	exemptionJustification: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	legalExemptionsClaimed: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	legalReviewCompletedAt: Maybe<Scalars['Datetime']['output']>;
	legalReviewRequired: Maybe<Scalars['Boolean']['output']>;
	legalReviewerId: Maybe<Scalars['UUID']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	partialErasure: Maybe<Scalars['Boolean']['output']>;
	privacyRequestId: Scalars['UUID']['output'];
	retainAggregatedData: Maybe<Scalars['Boolean']['output']>;
	status: Maybe<Scalars['String']['output']>;
	technicalFeasibility: Maybe<Scalars['String']['output']>;
	technicalNotes: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `ErasureRequest`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	verificationMethod: Maybe<Scalars['String']['output']>;
};

/**
 * A condition to be used against `ErasureRequest` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type ErasureRequestCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `ErasureRequest` */
export type ErasureRequestInput = {
	assignedTo?: InputMaybe<Scalars['UUID']['input']>;
	businessImpactAssessment?: InputMaybe<Scalars['String']['input']>;
	completionCertificatePath?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataAnonymizedCount?: InputMaybe<Scalars['Int']['input']>;
	dataDeletedCount?: InputMaybe<Scalars['Int']['input']>;
	dependentDataIdentified?: InputMaybe<Scalars['Boolean']['input']>;
	dependentSystems?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	erasureScope: Scalars['JSON']['input'];
	estimatedCompletionDate?: InputMaybe<Scalars['Date']['input']>;
	executedBy?: InputMaybe<Scalars['UUID']['input']>;
	executionCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	executionStartedAt?: InputMaybe<Scalars['Datetime']['input']>;
	executionVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	exemptionJustification?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	legalExemptionsClaimed?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	legalReviewCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	legalReviewRequired?: InputMaybe<Scalars['Boolean']['input']>;
	legalReviewerId?: InputMaybe<Scalars['UUID']['input']>;
	partialErasure?: InputMaybe<Scalars['Boolean']['input']>;
	privacyRequestId: Scalars['UUID']['input'];
	retainAggregatedData?: InputMaybe<Scalars['Boolean']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	technicalFeasibility?: InputMaybe<Scalars['String']['input']>;
	technicalNotes?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
	verificationMethod?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an update to a `ErasureRequest`. Fields that are set will be updated. */
export type ErasureRequestPatch = {
	assignedTo?: InputMaybe<Scalars['UUID']['input']>;
	businessImpactAssessment?: InputMaybe<Scalars['String']['input']>;
	completionCertificatePath?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataAnonymizedCount?: InputMaybe<Scalars['Int']['input']>;
	dataDeletedCount?: InputMaybe<Scalars['Int']['input']>;
	dependentDataIdentified?: InputMaybe<Scalars['Boolean']['input']>;
	dependentSystems?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	erasureScope?: InputMaybe<Scalars['JSON']['input']>;
	estimatedCompletionDate?: InputMaybe<Scalars['Date']['input']>;
	executedBy?: InputMaybe<Scalars['UUID']['input']>;
	executionCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	executionStartedAt?: InputMaybe<Scalars['Datetime']['input']>;
	executionVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	exemptionJustification?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	legalExemptionsClaimed?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	legalReviewCompletedAt?: InputMaybe<Scalars['Datetime']['input']>;
	legalReviewRequired?: InputMaybe<Scalars['Boolean']['input']>;
	legalReviewerId?: InputMaybe<Scalars['UUID']['input']>;
	partialErasure?: InputMaybe<Scalars['Boolean']['input']>;
	privacyRequestId?: InputMaybe<Scalars['UUID']['input']>;
	retainAggregatedData?: InputMaybe<Scalars['Boolean']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	technicalFeasibility?: InputMaybe<Scalars['String']['input']>;
	technicalNotes?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	verificationMethod?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of `ErasureRequest` values. */
export type ErasureRequestsConnection = {
	__typename: 'ErasureRequestsConnection';
	/** A list of edges which contains the `ErasureRequest` and cursor to aid in pagination. */
	edges: Array<ErasureRequestsEdge>;
	/** A list of `ErasureRequest` objects. */
	nodes: Array<ErasureRequest>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `ErasureRequest` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `ErasureRequest` edge in the connection. */
export type ErasureRequestsEdge = {
	__typename: 'ErasureRequestsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `ErasureRequest` at the end of the edge. */
	node: ErasureRequest;
};

/** Methods to use when ordering `ErasureRequest`. */
export type ErasureRequestsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** Failed login attempt tracking for security monitoring */
export type FailedLoginAttempt = Node & {
	__typename: 'FailedLoginAttempt';
	attemptCount: Maybe<Scalars['Int']['output']>;
	blockReason: Maybe<Scalars['String']['output']>;
	blockedUntil: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	email: Scalars['String']['output'];
	failureReason: Scalars['String']['output'];
	firstAttemptAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	ipAddress: Scalars['InternetAddress']['output'];
	isBlocked: Maybe<Scalars['Boolean']['output']>;
	lastAttemptAt: Maybe<Scalars['Datetime']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	userAgent: Maybe<Scalars['String']['output']>;
};

/**
 * A condition to be used against `FailedLoginAttempt` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type FailedLoginAttemptCondition = {
	/** Checks for equality with the object’s `email` field. */
	email?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `ipAddress` field. */
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
};

/** An input for mutations affecting `FailedLoginAttempt` */
export type FailedLoginAttemptInput = {
	attemptCount?: InputMaybe<Scalars['Int']['input']>;
	blockReason?: InputMaybe<Scalars['String']['input']>;
	blockedUntil?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	email: Scalars['String']['input'];
	failureReason: Scalars['String']['input'];
	firstAttemptAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress: Scalars['InternetAddress']['input'];
	isBlocked?: InputMaybe<Scalars['Boolean']['input']>;
	lastAttemptAt?: InputMaybe<Scalars['Datetime']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
};

/** Represents an update to a `FailedLoginAttempt`. Fields that are set will be updated. */
export type FailedLoginAttemptPatch = {
	attemptCount?: InputMaybe<Scalars['Int']['input']>;
	blockReason?: InputMaybe<Scalars['String']['input']>;
	blockedUntil?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	email?: InputMaybe<Scalars['String']['input']>;
	failureReason?: InputMaybe<Scalars['String']['input']>;
	firstAttemptAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isBlocked?: InputMaybe<Scalars['Boolean']['input']>;
	lastAttemptAt?: InputMaybe<Scalars['Datetime']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of `FailedLoginAttempt` values. */
export type FailedLoginAttemptsConnection = {
	__typename: 'FailedLoginAttemptsConnection';
	/** A list of edges which contains the `FailedLoginAttempt` and cursor to aid in pagination. */
	edges: Array<FailedLoginAttemptsEdge>;
	/** A list of `FailedLoginAttempt` objects. */
	nodes: Array<FailedLoginAttempt>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `FailedLoginAttempt` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `FailedLoginAttempt` edge in the connection. */
export type FailedLoginAttemptsEdge = {
	__typename: 'FailedLoginAttemptsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `FailedLoginAttempt` at the end of the edge. */
	node: FailedLoginAttempt;
};

/** Methods to use when ordering `FailedLoginAttempt`. */
export type FailedLoginAttemptsOrderBy =
	| 'EMAIL_ASC'
	| 'EMAIL_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'IP_ADDRESS_ASC'
	| 'IP_ADDRESS_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** All input for the `getEmployeeCompensation` mutation. */
export type GetEmployeeCompensationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pAsOfDate?: InputMaybe<Scalars['Date']['input']>;
	pEmployeeId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `getEmployeeCompensation` mutation. */
export type GetEmployeeCompensationPayload = {
	__typename: 'GetEmployeeCompensationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetEmployeeCompensationRecord>>>;
};

/** The return type of our `getEmployeeCompensation` mutation. */
export type GetEmployeeCompensationRecord = {
	__typename: 'GetEmployeeCompensationRecord';
	baseAmount: Maybe<Scalars['BigFloat']['output']>;
	compensationId: Maybe<Scalars['UUID']['output']>;
	compensationType: Maybe<CompensationType>;
	effectiveDate: Maybe<Scalars['Date']['output']>;
	employmentStatus: Maybe<EmploymentStatus>;
	healthInsuranceEligible: Maybe<Scalars['Boolean']['output']>;
	overtimeEligible: Maybe<Scalars['Boolean']['output']>;
	payFrequency: Maybe<PayFrequency>;
	retirementPlanEligible: Maybe<Scalars['Boolean']['output']>;
};

/** All input for the `getMyEmployeeGoals` mutation. */
export type GetMyEmployeeGoalsInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pIncludeCompleted?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The output of our `getMyEmployeeGoals` mutation. */
export type GetMyEmployeeGoalsPayload = {
	__typename: 'GetMyEmployeeGoalsPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetMyEmployeeGoalsRecord>>>;
};

/** The return type of our `getMyEmployeeGoals` mutation. */
export type GetMyEmployeeGoalsRecord = {
	__typename: 'GetMyEmployeeGoalsRecord';
	category: Maybe<Scalars['String']['output']>;
	completedAt: Maybe<Scalars['Datetime']['output']>;
	createdDate: Maybe<Scalars['Date']['output']>;
	description: Maybe<Scalars['String']['output']>;
	goalId: Maybe<Scalars['UUID']['output']>;
	priority: Maybe<Scalars['String']['output']>;
	progressPercentage: Maybe<Scalars['Int']['output']>;
	reviewCycle: Maybe<Scalars['String']['output']>;
	status: Maybe<GoalStatus>;
	targetDate: Maybe<Scalars['Date']['output']>;
	title: Maybe<Scalars['String']['output']>;
};

/** All input for the `getMyEmployeeProfile` mutation. */
export type GetMyEmployeeProfileInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `getMyEmployeeProfile` mutation. */
export type GetMyEmployeeProfilePayload = {
	__typename: 'GetMyEmployeeProfilePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetMyEmployeeProfileRecord>>>;
};

/** The return type of our `getMyEmployeeProfile` mutation. */
export type GetMyEmployeeProfileRecord = {
	__typename: 'GetMyEmployeeProfileRecord';
	addressLine1: Maybe<Scalars['String']['output']>;
	city: Maybe<Scalars['String']['output']>;
	departmentName: Maybe<Scalars['String']['output']>;
	displayName: Maybe<Scalars['String']['output']>;
	email: Maybe<Scalars['String']['output']>;
	emergencyContactName: Maybe<Scalars['String']['output']>;
	emergencyContactPhone: Maybe<Scalars['String']['output']>;
	employmentType: Maybe<Scalars['String']['output']>;
	isActive: Maybe<Scalars['Boolean']['output']>;
	jobTitle: Maybe<Scalars['String']['output']>;
	managerName: Maybe<Scalars['String']['output']>;
	onboardingStatus: Maybe<Scalars['String']['output']>;
	pendingReviews: Maybe<Scalars['Int']['output']>;
	pendingTimeOffRequests: Maybe<Scalars['Int']['output']>;
	phoneNumber: Maybe<Scalars['String']['output']>;
	primaryRole: Maybe<Scalars['String']['output']>;
	roleLevel: Maybe<Scalars['Int']['output']>;
	startDate: Maybe<Scalars['Date']['output']>;
	stateProvince: Maybe<Scalars['String']['output']>;
	tenureMonths: Maybe<Scalars['Int']['output']>;
	userId: Maybe<Scalars['UUID']['output']>;
};

/** All input for the `getMyRecentActivities` mutation. */
export type GetMyRecentActivitiesInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pDays?: InputMaybe<Scalars['Int']['input']>;
	pLimit?: InputMaybe<Scalars['Int']['input']>;
};

/** The output of our `getMyRecentActivities` mutation. */
export type GetMyRecentActivitiesPayload = {
	__typename: 'GetMyRecentActivitiesPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetMyRecentActivitiesRecord>>>;
};

/** The return type of our `getMyRecentActivities` mutation. */
export type GetMyRecentActivitiesRecord = {
	__typename: 'GetMyRecentActivitiesRecord';
	activityDate: Maybe<Scalars['Datetime']['output']>;
	activityType: Maybe<Scalars['String']['output']>;
	description: Maybe<Scalars['String']['output']>;
	metadata: Maybe<Scalars['JSON']['output']>;
	relatedId: Maybe<Scalars['UUID']['output']>;
};

/** All input for the `getMyTimeOffSummary` mutation. */
export type GetMyTimeOffSummaryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `getMyTimeOffSummary` mutation. */
export type GetMyTimeOffSummaryPayload = {
	__typename: 'GetMyTimeOffSummaryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetMyTimeOffSummaryRecord>>>;
};

/** The return type of our `getMyTimeOffSummary` mutation. */
export type GetMyTimeOffSummaryRecord = {
	__typename: 'GetMyTimeOffSummaryRecord';
	currentBalance: Maybe<Scalars['BigFloat']['output']>;
	pendingBalance: Maybe<Scalars['BigFloat']['output']>;
	pendingRequests: Maybe<Scalars['Int']['output']>;
	policyName: Maybe<Scalars['String']['output']>;
	recentRequests: Maybe<Scalars['Int']['output']>;
	timeOffType: Maybe<TimeOffType>;
	usedThisYear: Maybe<Scalars['BigFloat']['output']>;
};

/** All input for the `getPendingDeliveries` mutation. */
export type GetPendingDeliveriesInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pChannel?: InputMaybe<NotificationChannel>;
	pLimit?: InputMaybe<Scalars['Int']['input']>;
};

/** The output of our `getPendingDeliveries` mutation. */
export type GetPendingDeliveriesPayload = {
	__typename: 'GetPendingDeliveriesPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetPendingDeliveriesRecord>>>;
};

/** The return type of our `getPendingDeliveries` mutation. */
export type GetPendingDeliveriesRecord = {
	__typename: 'GetPendingDeliveriesRecord';
	channel: Maybe<NotificationChannel>;
	channelAddress: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	deliveryId: Maybe<Scalars['UUID']['output']>;
	notificationId: Maybe<Scalars['UUID']['output']>;
	notificationMessage: Maybe<Scalars['String']['output']>;
	notificationTitle: Maybe<Scalars['String']['output']>;
	priority: Maybe<NotificationPriority>;
	userId: Maybe<Scalars['UUID']['output']>;
};

/** All input for the `getUserNotificationPreferences` mutation. */
export type GetUserNotificationPreferencesInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pCategory?: InputMaybe<NotificationCategory>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `getUserNotificationPreferences` mutation. */
export type GetUserNotificationPreferencesPayload = {
	__typename: 'GetUserNotificationPreferencesPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetUserNotificationPreferencesRecord>>>;
};

/** The return type of our `getUserNotificationPreferences` mutation. */
export type GetUserNotificationPreferencesRecord = {
	__typename: 'GetUserNotificationPreferencesRecord';
	category: Maybe<NotificationCategory>;
	digestFrequency: Maybe<DigestFrequency>;
	enabledChannels: Maybe<Array<Maybe<NotificationChannel>>>;
	minPriority: Maybe<NotificationPriority>;
	templateKey: Maybe<Scalars['String']['output']>;
};

/** All input for the `getWorkflowStatus` mutation. */
export type GetWorkflowStatusInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `getWorkflowStatus` mutation. */
export type GetWorkflowStatusPayload = {
	__typename: 'GetWorkflowStatusPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<GetWorkflowStatusRecord>>>;
};

/** The return type of our `getWorkflowStatus` mutation. */
export type GetWorkflowStatusRecord = {
	__typename: 'GetWorkflowStatusRecord';
	completedAt: Maybe<Scalars['Datetime']['output']>;
	currentStepId: Maybe<Scalars['String']['output']>;
	instanceId: Maybe<Scalars['UUID']['output']>;
	progressPercent: Maybe<Scalars['Int']['output']>;
	startedAt: Maybe<Scalars['Datetime']['output']>;
	status: Maybe<WorkflowInstanceStatus>;
	workflowName: Maybe<Scalars['String']['output']>;
};

export type GoalStatus = 'CANCELLED' | 'COMPLETED' | 'EXCEEDED' | 'IN_PROGRESS' | 'NOT_STARTED';

/** An interval of time that has passed where the smallest distinct unit is a second. */
export type Interval = {
	__typename: 'Interval';
	/** A quantity of days. */
	days: Maybe<Scalars['Int']['output']>;
	/** A quantity of hours. */
	hours: Maybe<Scalars['Int']['output']>;
	/** A quantity of minutes. */
	minutes: Maybe<Scalars['Int']['output']>;
	/** A quantity of months. */
	months: Maybe<Scalars['Int']['output']>;
	/**
	 * A quantity of seconds. This is the only non-integer field, as all the other
	 * fields will dump their overflow into a smaller unit of time. Intervals don’t
	 * have a smaller unit than seconds.
	 */
	seconds: Maybe<Scalars['Float']['output']>;
	/** A quantity of years. */
	years: Maybe<Scalars['Int']['output']>;
};

/** An interval of time that has passed where the smallest distinct unit is a second. */
export type IntervalInput = {
	/** A quantity of days. */
	days?: InputMaybe<Scalars['Int']['input']>;
	/** A quantity of hours. */
	hours?: InputMaybe<Scalars['Int']['input']>;
	/** A quantity of minutes. */
	minutes?: InputMaybe<Scalars['Int']['input']>;
	/** A quantity of months. */
	months?: InputMaybe<Scalars['Int']['input']>;
	/**
	 * A quantity of seconds. This is the only non-integer field, as all the other
	 * fields will dump their overflow into a smaller unit of time. Intervals don’t
	 * have a smaller unit than seconds.
	 */
	seconds?: InputMaybe<Scalars['Float']['input']>;
	/** A quantity of years. */
	years?: InputMaybe<Scalars['Int']['input']>;
};

/** All input for the `isLoginBlocked` mutation. */
export type IsLoginBlockedInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pEmail?: InputMaybe<Scalars['String']['input']>;
	pIpAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
};

/** The output of our `isLoginBlocked` mutation. */
export type IsLoginBlockedPayload = {
	__typename: 'IsLoginBlockedPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** Employee job details and organizational assignments */
export type JobInfo = Node & {
	__typename: 'JobInfo';
	createdAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `Department` that is related to this `JobInfo`. */
	departmentByDepartmentId: Maybe<Department>;
	departmentId: Maybe<Scalars['UUID']['output']>;
	employeeId: Scalars['UUID']['output'];
	employmentType: Maybe<Scalars['String']['output']>;
	endDate: Maybe<Scalars['Date']['output']>;
	id: Scalars['UUID']['output'];
	jobTitle: Maybe<Scalars['String']['output']>;
	managerId: Maybe<Scalars['UUID']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	reportsTo: Maybe<Scalars['UUID']['output']>;
	startDate: Maybe<Scalars['Date']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByManagerId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByReportsTo: Maybe<User>;
};

/** A condition to be used against `JobInfo` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type JobInfoCondition = {
	/** Checks for equality with the object’s `departmentId` field. */
	departmentId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `employeeId` field. */
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `managerId` field. */
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `reportsTo` field. */
	reportsTo?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `JobInfo` */
export type JobInfoInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	departmentId?: InputMaybe<Scalars['UUID']['input']>;
	employeeId: Scalars['UUID']['input'];
	employmentType?: InputMaybe<Scalars['String']['input']>;
	endDate?: InputMaybe<Scalars['Date']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	jobTitle?: InputMaybe<Scalars['String']['input']>;
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	reportsTo?: InputMaybe<Scalars['UUID']['input']>;
	startDate?: InputMaybe<Scalars['Date']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `JobInfo`. Fields that are set will be updated. */
export type JobInfoPatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	departmentId?: InputMaybe<Scalars['UUID']['input']>;
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	employmentType?: InputMaybe<Scalars['String']['input']>;
	endDate?: InputMaybe<Scalars['Date']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	jobTitle?: InputMaybe<Scalars['String']['input']>;
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	reportsTo?: InputMaybe<Scalars['UUID']['input']>;
	startDate?: InputMaybe<Scalars['Date']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `JobInfo` values. */
export type JobInfosConnection = {
	__typename: 'JobInfosConnection';
	/** A list of edges which contains the `JobInfo` and cursor to aid in pagination. */
	edges: Array<JobInfosEdge>;
	/** A list of `JobInfo` objects. */
	nodes: Array<JobInfo>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `JobInfo` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `JobInfo` edge in the connection. */
export type JobInfosEdge = {
	__typename: 'JobInfosEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `JobInfo` at the end of the edge. */
	node: JobInfo;
};

/** Methods to use when ordering `JobInfo`. */
export type JobInfosOrderBy =
	| 'DEPARTMENT_ID_ASC'
	| 'DEPARTMENT_ID_DESC'
	| 'EMPLOYEE_ID_ASC'
	| 'EMPLOYEE_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'MANAGER_ID_ASC'
	| 'MANAGER_ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'REPORTS_TO_ASC'
	| 'REPORTS_TO_DESC';

/** All input for the `logAuditEvent` mutation. */
export type LogAuditEventInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pActionType?: InputMaybe<AuditActionType>;
	pChangedFields?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	pConsentReference?: InputMaybe<Scalars['UUID']['input']>;
	pContainsPii?: InputMaybe<Scalars['Boolean']['input']>;
	pDataClassification?: InputMaybe<DataClassification>;
	pLegalBasis?: InputMaybe<Scalars['String']['input']>;
	pNewValues?: InputMaybe<Scalars['JSON']['input']>;
	pOldValues?: InputMaybe<Scalars['JSON']['input']>;
	pPiiFields?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	pRecordId?: InputMaybe<Scalars['UUID']['input']>;
	pRequiresConsent?: InputMaybe<Scalars['Boolean']['input']>;
	pTableName?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `logAuditEvent` mutation. */
export type LogAuditEventPayload = {
	__typename: 'LogAuditEventPayload';
	auditId: Maybe<Scalars['UUID']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `logSecurityEvent` mutation. */
export type LogSecurityEventInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pEventCategory?: InputMaybe<Scalars['String']['input']>;
	pEventData?: InputMaybe<Scalars['JSON']['input']>;
	pEventMessage?: InputMaybe<Scalars['String']['input']>;
	pEventType?: InputMaybe<SecurityEventType>;
	pIpAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	pRiskScore?: InputMaybe<Scalars['Int']['input']>;
	pSessionId?: InputMaybe<Scalars['UUID']['input']>;
	pUserAgent?: InputMaybe<Scalars['String']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `logSecurityEvent` mutation. */
export type LogSecurityEventPayload = {
	__typename: 'LogSecurityEventPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	eventId: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `markNotificationRead` mutation. */
export type MarkNotificationReadInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pNotificationId?: InputMaybe<Scalars['UUID']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `markNotificationRead` mutation. */
export type MarkNotificationReadPayload = {
	__typename: 'MarkNotificationReadPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

export type MfaMethod = 'BACKUP_CODE' | 'EMAIL' | 'HARDWARE_TOKEN' | 'SMS' | 'TOTP';

/** The root mutation type which contains root level fields which mutate data. */
export type Mutation = {
	__typename: 'Mutation';
	/** Anonymize user PII data for compliance with retention policies */
	anonymizeUserData: Maybe<AnonymizeUserDataPayload>;
	authenticate: Maybe<AuthenticatePayload>;
	/** Check privacy compliance status across tables */
	checkPrivacyComplianceStatus: Maybe<CheckPrivacyComplianceStatusPayload>;
	/** Check data retention compliance across all policies */
	checkRetentionCompliance: Maybe<CheckRetentionCompliancePayload>;
	/** Mark a workflow task as completed (employee self-service) */
	completeWorkflowTask: Maybe<CompleteWorkflowTaskPayload>;
	/** Creates a single `AuditLog`. */
	createAuditLog: Maybe<CreateAuditLogPayload>;
	/** Creates a single `AuthSession`. */
	createAuthSession: Maybe<CreateAuthSessionPayload>;
	/** Creates a single `Competency`. */
	createCompetency: Maybe<CreateCompetencyPayload>;
	/** Creates a single `CompetencyRating`. */
	createCompetencyRating: Maybe<CreateCompetencyRatingPayload>;
	/** Creates a single `ConsentRecord`. */
	createConsentRecord: Maybe<CreateConsentRecordPayload>;
	/** Creates a single `ContactInfo`. */
	createContactInfo: Maybe<CreateContactInfoPayload>;
	/** Creates a single `DataBreachIncident`. */
	createDataBreachIncident: Maybe<CreateDataBreachIncidentPayload>;
	/** Creates a single `DataLineage`. */
	createDataLineage: Maybe<CreateDataLineagePayload>;
	/** Create comprehensive data protection metadata */
	createDataProtectionMetadata: Maybe<CreateDataProtectionMetadataPayload>;
	/** Creates a single `DataProtectionMetadatum`. */
	createDataProtectionMetadatum: Maybe<CreateDataProtectionMetadatumPayload>;
	/** Creates a single `DataRetentionPolicy`. */
	createDataRetentionPolicy: Maybe<CreateDataRetentionPolicyPayload>;
	/** Creates a single `Department`. */
	createDepartment: Maybe<CreateDepartmentPayload>;
	/** Creates a single `DocumentAccess`. */
	createDocumentAccess: Maybe<CreateDocumentAccessPayload>;
	/** Creates a single `DocumentSignature`. */
	createDocumentSignature: Maybe<CreateDocumentSignaturePayload>;
	/** Creates a single `DocumentTemplate`. */
	createDocumentTemplate: Maybe<CreateDocumentTemplatePayload>;
	/** Creates a single `EmployeeDocument`. */
	createEmployeeDocument: Maybe<CreateEmployeeDocumentPayload>;
	/** Creates a single `EmployeeGoal`. */
	createEmployeeGoal: Maybe<CreateEmployeeGoalPayload>;
	/** Creates a single `ErasureRequest`. */
	createErasureRequest: Maybe<CreateErasureRequestPayload>;
	/** Creates a single `FailedLoginAttempt`. */
	createFailedLoginAttempt: Maybe<CreateFailedLoginAttemptPayload>;
	/** Create a new goal for employee */
	createGoal: Maybe<CreateGoalPayload>;
	/** Creates a single `JobInfo`. */
	createJobInfo: Maybe<CreateJobInfoPayload>;
	/** Create new employee compensation record (HR Admin only) */
	createNewEmployeeCompensation: Maybe<CreateNewEmployeeCompensationPayload>;
	/** Create a new payroll period for processing employee payments */
	createNewPayrollPeriod: Maybe<CreateNewPayrollPeriodPayload>;
	/** Creates a single `Notification`. */
	createNotification: Maybe<CreateNotificationPayload>;
	/** Creates a single `NotificationDelivery`. */
	createNotificationDelivery: Maybe<CreateNotificationDeliveryPayload>;
	/** Creates a single `NotificationDigest`. */
	createNotificationDigest: Maybe<CreateNotificationDigestPayload>;
	/** Creates a single `NotificationPreference`. */
	createNotificationPreference: Maybe<CreateNotificationPreferencePayload>;
	/** Creates a single `NotificationSubscription`. */
	createNotificationSubscription: Maybe<CreateNotificationSubscriptionPayload>;
	/** Creates a single `NotificationTemplate`. */
	createNotificationTemplate: Maybe<CreateNotificationTemplatePayload>;
	/** Creates a single `PasswordPolicy`. */
	createPasswordPolicy: Maybe<CreatePasswordPolicyPayload>;
	/** Creates a single `PayrollPeriod`. */
	createPayrollPeriod: Maybe<CreatePayrollPeriodPayload>;
	/** Creates a single `PerformanceReview`. */
	createPerformanceReview: Maybe<CreatePerformanceReviewPayload>;
	/** Creates a single `PrivacyImpactAssessment`. */
	createPrivacyImpactAssessment: Maybe<CreatePrivacyImpactAssessmentPayload>;
	/** Creates a single `PrivacyRequest`. */
	createPrivacyRequest: Maybe<CreatePrivacyRequestPayload>;
	/** Creates a single `ProcessingActivity`. */
	createProcessingActivity: Maybe<CreateProcessingActivityPayload>;
	/** Creates a single `ReviewCycle`. */
	createReviewCycle: Maybe<CreateReviewCyclePayload>;
	/** Create performance reviews for all eligible employees in a review cycle */
	createReviewsForCycle: Maybe<CreateReviewsForCyclePayload>;
	/** Creates a single `SecurityEvent`. */
	createSecurityEvent: Maybe<CreateSecurityEventPayload>;
	/** Creates a single `TimeOffBalance`. */
	createTimeOffBalance: Maybe<CreateTimeOffBalancePayload>;
	/** Creates a single `TimeOffPolicy`. */
	createTimeOffPolicy: Maybe<CreateTimeOffPolicyPayload>;
	/** Creates a single `TimeOffRequest`. */
	createTimeOffRequest: Maybe<CreateTimeOffRequestPayload>;
	/** Creates a single `User`. */
	createUser: Maybe<CreateUserPayload>;
	/** Creates a single `UserDevice`. */
	createUserDevice: Maybe<CreateUserDevicePayload>;
	/** Creates a single `UserMfaSetting`. */
	createUserMfaSetting: Maybe<CreateUserMfaSettingPayload>;
	/** Creates a single `UserPasswordHistory`. */
	createUserPasswordHistory: Maybe<CreateUserPasswordHistoryPayload>;
	/** Creates a single `UserRole`. */
	createUserRole: Maybe<CreateUserRolePayload>;
	/** Creates a single `UserRoleAssignment`. */
	createUserRoleAssignment: Maybe<CreateUserRoleAssignmentPayload>;
	/** Creates a single `UserSession`. */
	createUserSession: Maybe<CreateUserSessionPayload>;
	/** Creates a single `WorkflowApproval`. */
	createWorkflowApproval: Maybe<CreateWorkflowApprovalPayload>;
	/** Creates a single `WorkflowDefinition`. */
	createWorkflowDefinition: Maybe<CreateWorkflowDefinitionPayload>;
	/** Creates a single `WorkflowInstance`. */
	createWorkflowInstance: Maybe<CreateWorkflowInstancePayload>;
	/** Creates a single `WorkflowStepExecution`. */
	createWorkflowStepExecution: Maybe<CreateWorkflowStepExecutionPayload>;
	/** Creates a single `WorkflowTask`. */
	createWorkflowTask: Maybe<CreateWorkflowTaskPayload>;
	/** Deletes a single `AuditLog` using its globally unique id. */
	deleteAuditLog: Maybe<DeleteAuditLogPayload>;
	/** Deletes a single `AuditLog` using a unique key. */
	deleteAuditLogById: Maybe<DeleteAuditLogPayload>;
	/** Deletes a single `AuthSession` using its globally unique id. */
	deleteAuthSession: Maybe<DeleteAuthSessionPayload>;
	/** Deletes a single `AuthSession` using a unique key. */
	deleteAuthSessionById: Maybe<DeleteAuthSessionPayload>;
	/** Deletes a single `Competency` using its globally unique id. */
	deleteCompetency: Maybe<DeleteCompetencyPayload>;
	/** Deletes a single `Competency` using a unique key. */
	deleteCompetencyById: Maybe<DeleteCompetencyPayload>;
	/** Deletes a single `CompetencyRating` using its globally unique id. */
	deleteCompetencyRating: Maybe<DeleteCompetencyRatingPayload>;
	/** Deletes a single `CompetencyRating` using a unique key. */
	deleteCompetencyRatingById: Maybe<DeleteCompetencyRatingPayload>;
	/** Deletes a single `CompetencyRating` using a unique key. */
	deleteCompetencyRatingByReviewIdAndCompetencyId: Maybe<DeleteCompetencyRatingPayload>;
	/** Deletes a single `ConsentRecord` using its globally unique id. */
	deleteConsentRecord: Maybe<DeleteConsentRecordPayload>;
	/** Deletes a single `ConsentRecord` using a unique key. */
	deleteConsentRecordById: Maybe<DeleteConsentRecordPayload>;
	/** Deletes a single `ConsentRecord` using a unique key. */
	deleteConsentRecordByUserIdAndConsentTypeAndConsentVersion: Maybe<DeleteConsentRecordPayload>;
	/** Deletes a single `ContactInfo` using its globally unique id. */
	deleteContactInfo: Maybe<DeleteContactInfoPayload>;
	/** Deletes a single `ContactInfo` using a unique key. */
	deleteContactInfoById: Maybe<DeleteContactInfoPayload>;
	/** Deletes a single `DataBreachIncident` using its globally unique id. */
	deleteDataBreachIncident: Maybe<DeleteDataBreachIncidentPayload>;
	/** Deletes a single `DataBreachIncident` using a unique key. */
	deleteDataBreachIncidentById: Maybe<DeleteDataBreachIncidentPayload>;
	/** Deletes a single `DataBreachIncident` using a unique key. */
	deleteDataBreachIncidentByIncidentNumber: Maybe<DeleteDataBreachIncidentPayload>;
	/** Deletes a single `DataLineage` using its globally unique id. */
	deleteDataLineage: Maybe<DeleteDataLineagePayload>;
	/** Deletes a single `DataLineage` using a unique key. */
	deleteDataLineageById: Maybe<DeleteDataLineagePayload>;
	/** Deletes a single `DataProtectionMetadatum` using its globally unique id. */
	deleteDataProtectionMetadatum: Maybe<DeleteDataProtectionMetadatumPayload>;
	/** Deletes a single `DataProtectionMetadatum` using a unique key. */
	deleteDataProtectionMetadatumById: Maybe<DeleteDataProtectionMetadatumPayload>;
	/** Deletes a single `DataRetentionPolicy` using its globally unique id. */
	deleteDataRetentionPolicy: Maybe<DeleteDataRetentionPolicyPayload>;
	/** Deletes a single `DataRetentionPolicy` using a unique key. */
	deleteDataRetentionPolicyById: Maybe<DeleteDataRetentionPolicyPayload>;
	/** Deletes a single `DataRetentionPolicy` using a unique key. */
	deleteDataRetentionPolicyByPolicyName: Maybe<DeleteDataRetentionPolicyPayload>;
	/** Deletes a single `Department` using its globally unique id. */
	deleteDepartment: Maybe<DeleteDepartmentPayload>;
	/** Deletes a single `Department` using a unique key. */
	deleteDepartmentById: Maybe<DeleteDepartmentPayload>;
	/** Deletes a single `DocumentAccess` using its globally unique id. */
	deleteDocumentAccess: Maybe<DeleteDocumentAccessPayload>;
	/** Deletes a single `DocumentAccess` using a unique key. */
	deleteDocumentAccessByDocumentIdAndUserIdAndAccessType: Maybe<DeleteDocumentAccessPayload>;
	/** Deletes a single `DocumentAccess` using a unique key. */
	deleteDocumentAccessById: Maybe<DeleteDocumentAccessPayload>;
	/** Deletes a single `DocumentSignature` using its globally unique id. */
	deleteDocumentSignature: Maybe<DeleteDocumentSignaturePayload>;
	/** Deletes a single `DocumentSignature` using a unique key. */
	deleteDocumentSignatureByDocumentIdAndSignerIdAndSignatureType: Maybe<DeleteDocumentSignaturePayload>;
	/** Deletes a single `DocumentSignature` using a unique key. */
	deleteDocumentSignatureById: Maybe<DeleteDocumentSignaturePayload>;
	/** Deletes a single `DocumentTemplate` using its globally unique id. */
	deleteDocumentTemplate: Maybe<DeleteDocumentTemplatePayload>;
	/** Deletes a single `DocumentTemplate` using a unique key. */
	deleteDocumentTemplateById: Maybe<DeleteDocumentTemplatePayload>;
	/** Deletes a single `DocumentTemplate` using a unique key. */
	deleteDocumentTemplateByTemplateNameAndVersion: Maybe<DeleteDocumentTemplatePayload>;
	/** Deletes a single `EmployeeDocument` using its globally unique id. */
	deleteEmployeeDocument: Maybe<DeleteEmployeeDocumentPayload>;
	/** Deletes a single `EmployeeDocument` using a unique key. */
	deleteEmployeeDocumentById: Maybe<DeleteEmployeeDocumentPayload>;
	/** Deletes a single `EmployeeGoal` using its globally unique id. */
	deleteEmployeeGoal: Maybe<DeleteEmployeeGoalPayload>;
	/** Deletes a single `EmployeeGoal` using a unique key. */
	deleteEmployeeGoalById: Maybe<DeleteEmployeeGoalPayload>;
	/** Deletes a single `ErasureRequest` using its globally unique id. */
	deleteErasureRequest: Maybe<DeleteErasureRequestPayload>;
	/** Deletes a single `ErasureRequest` using a unique key. */
	deleteErasureRequestById: Maybe<DeleteErasureRequestPayload>;
	/** Deletes a single `FailedLoginAttempt` using its globally unique id. */
	deleteFailedLoginAttempt: Maybe<DeleteFailedLoginAttemptPayload>;
	/** Deletes a single `FailedLoginAttempt` using a unique key. */
	deleteFailedLoginAttemptById: Maybe<DeleteFailedLoginAttemptPayload>;
	/** Deletes a single `JobInfo` using its globally unique id. */
	deleteJobInfo: Maybe<DeleteJobInfoPayload>;
	/** Deletes a single `JobInfo` using a unique key. */
	deleteJobInfoById: Maybe<DeleteJobInfoPayload>;
	/** Deletes a single `Notification` using its globally unique id. */
	deleteNotification: Maybe<DeleteNotificationPayload>;
	/** Deletes a single `Notification` using a unique key. */
	deleteNotificationById: Maybe<DeleteNotificationPayload>;
	/** Deletes a single `NotificationDelivery` using its globally unique id. */
	deleteNotificationDelivery: Maybe<DeleteNotificationDeliveryPayload>;
	/** Deletes a single `NotificationDelivery` using a unique key. */
	deleteNotificationDeliveryById: Maybe<DeleteNotificationDeliveryPayload>;
	/** Deletes a single `NotificationDigest` using its globally unique id. */
	deleteNotificationDigest: Maybe<DeleteNotificationDigestPayload>;
	/** Deletes a single `NotificationDigest` using a unique key. */
	deleteNotificationDigestById: Maybe<DeleteNotificationDigestPayload>;
	/** Deletes a single `NotificationPreference` using its globally unique id. */
	deleteNotificationPreference: Maybe<DeleteNotificationPreferencePayload>;
	/** Deletes a single `NotificationPreference` using a unique key. */
	deleteNotificationPreferenceById: Maybe<DeleteNotificationPreferencePayload>;
	/** Deletes a single `NotificationPreference` using a unique key. */
	deleteNotificationPreferenceByUserIdAndCategoryAndTemplateKey: Maybe<DeleteNotificationPreferencePayload>;
	/** Deletes a single `NotificationSubscription` using its globally unique id. */
	deleteNotificationSubscription: Maybe<DeleteNotificationSubscriptionPayload>;
	/** Deletes a single `NotificationSubscription` using a unique key. */
	deleteNotificationSubscriptionById: Maybe<DeleteNotificationSubscriptionPayload>;
	/** Deletes a single `NotificationSubscription` using a unique key. */
	deleteNotificationSubscriptionByUserIdAndResourceTypeAndResourceId: Maybe<DeleteNotificationSubscriptionPayload>;
	/** Deletes a single `NotificationTemplate` using its globally unique id. */
	deleteNotificationTemplate: Maybe<DeleteNotificationTemplatePayload>;
	/** Deletes a single `NotificationTemplate` using a unique key. */
	deleteNotificationTemplateById: Maybe<DeleteNotificationTemplatePayload>;
	/** Deletes a single `NotificationTemplate` using a unique key. */
	deleteNotificationTemplateByTemplateKey: Maybe<DeleteNotificationTemplatePayload>;
	/** Deletes a single `PasswordPolicy` using its globally unique id. */
	deletePasswordPolicy: Maybe<DeletePasswordPolicyPayload>;
	/** Deletes a single `PasswordPolicy` using a unique key. */
	deletePasswordPolicyById: Maybe<DeletePasswordPolicyPayload>;
	/** Deletes a single `PasswordPolicy` using a unique key. */
	deletePasswordPolicyByPolicyName: Maybe<DeletePasswordPolicyPayload>;
	/** Deletes a single `PayrollPeriod` using its globally unique id. */
	deletePayrollPeriod: Maybe<DeletePayrollPeriodPayload>;
	/** Deletes a single `PayrollPeriod` using a unique key. */
	deletePayrollPeriodById: Maybe<DeletePayrollPeriodPayload>;
	/** Deletes a single `PerformanceReview` using its globally unique id. */
	deletePerformanceReview: Maybe<DeletePerformanceReviewPayload>;
	/** Deletes a single `PerformanceReview` using a unique key. */
	deletePerformanceReviewByEmployeeIdAndCycleId: Maybe<DeletePerformanceReviewPayload>;
	/** Deletes a single `PerformanceReview` using a unique key. */
	deletePerformanceReviewById: Maybe<DeletePerformanceReviewPayload>;
	/** Deletes a single `PrivacyImpactAssessment` using its globally unique id. */
	deletePrivacyImpactAssessment: Maybe<DeletePrivacyImpactAssessmentPayload>;
	/** Deletes a single `PrivacyImpactAssessment` using a unique key. */
	deletePrivacyImpactAssessmentByAssessmentReference: Maybe<DeletePrivacyImpactAssessmentPayload>;
	/** Deletes a single `PrivacyImpactAssessment` using a unique key. */
	deletePrivacyImpactAssessmentById: Maybe<DeletePrivacyImpactAssessmentPayload>;
	/** Deletes a single `PrivacyRequest` using its globally unique id. */
	deletePrivacyRequest: Maybe<DeletePrivacyRequestPayload>;
	/** Deletes a single `PrivacyRequest` using a unique key. */
	deletePrivacyRequestById: Maybe<DeletePrivacyRequestPayload>;
	/** Deletes a single `PrivacyRequest` using a unique key. */
	deletePrivacyRequestByRequestNumber: Maybe<DeletePrivacyRequestPayload>;
	/** Deletes a single `ProcessingActivity` using its globally unique id. */
	deleteProcessingActivity: Maybe<DeleteProcessingActivityPayload>;
	/** Deletes a single `ProcessingActivity` using a unique key. */
	deleteProcessingActivityById: Maybe<DeleteProcessingActivityPayload>;
	/** Deletes a single `ReviewCycle` using its globally unique id. */
	deleteReviewCycle: Maybe<DeleteReviewCyclePayload>;
	/** Deletes a single `ReviewCycle` using a unique key. */
	deleteReviewCycleById: Maybe<DeleteReviewCyclePayload>;
	/** Deletes a single `SecurityEvent` using its globally unique id. */
	deleteSecurityEvent: Maybe<DeleteSecurityEventPayload>;
	/** Deletes a single `SecurityEvent` using a unique key. */
	deleteSecurityEventById: Maybe<DeleteSecurityEventPayload>;
	/** Deletes a single `TimeOffBalance` using its globally unique id. */
	deleteTimeOffBalance: Maybe<DeleteTimeOffBalancePayload>;
	/** Deletes a single `TimeOffBalance` using a unique key. */
	deleteTimeOffBalanceById: Maybe<DeleteTimeOffBalancePayload>;
	/** Deletes a single `TimeOffBalance` using a unique key. */
	deleteTimeOffBalanceByUserIdAndPolicyIdAndYear: Maybe<DeleteTimeOffBalancePayload>;
	/** Deletes a single `TimeOffPolicy` using its globally unique id. */
	deleteTimeOffPolicy: Maybe<DeleteTimeOffPolicyPayload>;
	/** Deletes a single `TimeOffPolicy` using a unique key. */
	deleteTimeOffPolicyById: Maybe<DeleteTimeOffPolicyPayload>;
	/** Deletes a single `TimeOffRequest` using its globally unique id. */
	deleteTimeOffRequest: Maybe<DeleteTimeOffRequestPayload>;
	/** Deletes a single `TimeOffRequest` using a unique key. */
	deleteTimeOffRequestById: Maybe<DeleteTimeOffRequestPayload>;
	/** Deletes a single `User` using its globally unique id. */
	deleteUser: Maybe<DeleteUserPayload>;
	/** Deletes a single `User` using a unique key. */
	deleteUserByEmail: Maybe<DeleteUserPayload>;
	/** Deletes a single `User` using a unique key. */
	deleteUserById: Maybe<DeleteUserPayload>;
	/** Deletes a single `UserDevice` using its globally unique id. */
	deleteUserDevice: Maybe<DeleteUserDevicePayload>;
	/** Deletes a single `UserDevice` using a unique key. */
	deleteUserDeviceById: Maybe<DeleteUserDevicePayload>;
	/** Deletes a single `UserDevice` using a unique key. */
	deleteUserDeviceByUserIdAndDeviceId: Maybe<DeleteUserDevicePayload>;
	/** Deletes a single `UserMfaSetting` using its globally unique id. */
	deleteUserMfaSetting: Maybe<DeleteUserMfaSettingPayload>;
	/** Deletes a single `UserMfaSetting` using a unique key. */
	deleteUserMfaSettingById: Maybe<DeleteUserMfaSettingPayload>;
	/** Deletes a single `UserMfaSetting` using a unique key. */
	deleteUserMfaSettingByUserId: Maybe<DeleteUserMfaSettingPayload>;
	/** Deletes a single `UserPasswordHistory` using its globally unique id. */
	deleteUserPasswordHistory: Maybe<DeleteUserPasswordHistoryPayload>;
	/** Deletes a single `UserPasswordHistory` using a unique key. */
	deleteUserPasswordHistoryById: Maybe<DeleteUserPasswordHistoryPayload>;
	/** Deletes a single `UserRole` using its globally unique id. */
	deleteUserRole: Maybe<DeleteUserRolePayload>;
	/** Deletes a single `UserRoleAssignment` using its globally unique id. */
	deleteUserRoleAssignment: Maybe<DeleteUserRoleAssignmentPayload>;
	/** Deletes a single `UserRoleAssignment` using a unique key. */
	deleteUserRoleAssignmentById: Maybe<DeleteUserRoleAssignmentPayload>;
	/** Deletes a single `UserRoleAssignment` using a unique key. */
	deleteUserRoleAssignmentByUserIdAndRoleId: Maybe<DeleteUserRoleAssignmentPayload>;
	/** Deletes a single `UserRole` using a unique key. */
	deleteUserRoleById: Maybe<DeleteUserRolePayload>;
	/** Deletes a single `UserRole` using a unique key. */
	deleteUserRoleByName: Maybe<DeleteUserRolePayload>;
	/** Deletes a single `UserSession` using its globally unique id. */
	deleteUserSession: Maybe<DeleteUserSessionPayload>;
	/** Deletes a single `UserSession` using a unique key. */
	deleteUserSessionById: Maybe<DeleteUserSessionPayload>;
	/** Deletes a single `UserSession` using a unique key. */
	deleteUserSessionByRefreshToken: Maybe<DeleteUserSessionPayload>;
	/** Deletes a single `UserSession` using a unique key. */
	deleteUserSessionBySessionToken: Maybe<DeleteUserSessionPayload>;
	/** Deletes a single `WorkflowApproval` using its globally unique id. */
	deleteWorkflowApproval: Maybe<DeleteWorkflowApprovalPayload>;
	/** Deletes a single `WorkflowApproval` using a unique key. */
	deleteWorkflowApprovalById: Maybe<DeleteWorkflowApprovalPayload>;
	/** Deletes a single `WorkflowDefinition` using its globally unique id. */
	deleteWorkflowDefinition: Maybe<DeleteWorkflowDefinitionPayload>;
	/** Deletes a single `WorkflowDefinition` using a unique key. */
	deleteWorkflowDefinitionById: Maybe<DeleteWorkflowDefinitionPayload>;
	/** Deletes a single `WorkflowDefinition` using a unique key. */
	deleteWorkflowDefinitionByNameAndVersion: Maybe<DeleteWorkflowDefinitionPayload>;
	/** Deletes a single `WorkflowInstance` using its globally unique id. */
	deleteWorkflowInstance: Maybe<DeleteWorkflowInstancePayload>;
	/** Deletes a single `WorkflowInstance` using a unique key. */
	deleteWorkflowInstanceById: Maybe<DeleteWorkflowInstancePayload>;
	/** Deletes a single `WorkflowStepExecution` using its globally unique id. */
	deleteWorkflowStepExecution: Maybe<DeleteWorkflowStepExecutionPayload>;
	/** Deletes a single `WorkflowStepExecution` using a unique key. */
	deleteWorkflowStepExecutionById: Maybe<DeleteWorkflowStepExecutionPayload>;
	/** Deletes a single `WorkflowTask` using its globally unique id. */
	deleteWorkflowTask: Maybe<DeleteWorkflowTaskPayload>;
	/** Deletes a single `WorkflowTask` using a unique key. */
	deleteWorkflowTaskById: Maybe<DeleteWorkflowTaskPayload>;
	/** Get employee compensation data with access controls */
	getEmployeeCompensation: Maybe<GetEmployeeCompensationPayload>;
	/** Get goals and progress for current user */
	getMyEmployeeGoals: Maybe<GetMyEmployeeGoalsPayload>;
	/** Get comprehensive profile information for current user */
	getMyEmployeeProfile: Maybe<GetMyEmployeeProfilePayload>;
	/** Get recent activities and updates for current user */
	getMyRecentActivities: Maybe<GetMyRecentActivitiesPayload>;
	/** Get time-off balances and request summary for current user */
	getMyTimeOffSummary: Maybe<GetMyTimeOffSummaryPayload>;
	/** Get pending notifications for delivery processing */
	getPendingDeliveries: Maybe<GetPendingDeliveriesPayload>;
	/** Get user notification preferences for categories and templates */
	getUserNotificationPreferences: Maybe<GetUserNotificationPreferencesPayload>;
	/** Get status and progress of a workflow instance */
	getWorkflowStatus: Maybe<GetWorkflowStatusPayload>;
	/** Check if login is blocked due to failed attempts */
	isLoginBlocked: Maybe<IsLoginBlockedPayload>;
	/** Log comprehensive audit events for compliance and data governance */
	logAuditEvent: Maybe<LogAuditEventPayload>;
	/** Log security events for monitoring and compliance */
	logSecurityEvent: Maybe<LogSecurityEventPayload>;
	/** Mark notification as read and update delivery status */
	markNotificationRead: Maybe<MarkNotificationReadPayload>;
	/** Process GDPR Article 17 right to erasure request */
	processErasureRequest: Maybe<ProcessErasureRequestPayload>;
	/** Record GDPR consent with full compliance tracking */
	recordUserConsent: Maybe<RecordUserConsentPayload>;
	/** Refresh the dashboard metrics materialized view */
	refreshAnalyticsDashboard: Maybe<RefreshAnalyticsDashboardPayload>;
	/** Register a new user account */
	registerUser: Maybe<RegisterUserPayload>;
	/** Request access to a document (employee self-service) */
	requestDocumentAccess: Maybe<RequestDocumentAccessPayload>;
	/** Approve or reject a time-off request */
	reviewTimeOffRequest: Maybe<ReviewTimeOffRequestPayload>;
	/** Send notification using predefined template with variable interpolation */
	sendTemplatedNotification: Maybe<SendTemplatedNotificationPayload>;
	/** Submit manager assessment and rating for performance review */
	submitManagerAssessment: Maybe<SubmitManagerAssessmentPayload>;
	/** Submit employee self-assessment for performance review */
	submitSelfAssessment: Maybe<SubmitSelfAssessmentPayload>;
	/** Submit a new time-off request with validation */
	submitTimeOffRequest: Maybe<SubmitTimeOffRequestPayload>;
	subscribeToNotifications: Maybe<SubscribeToNotificationsPayload>;
	/** Terminate user session with reason logging */
	terminateSession: Maybe<TerminateSessionPayload>;
	/** Track data lineage for governance and compliance */
	trackDataLineage: Maybe<TrackDataLineagePayload>;
	/** Track failed login attempts and implement blocking logic */
	trackFailedLogin: Maybe<TrackFailedLoginPayload>;
	/** Trigger workflows based on events with optional data payload */
	triggerWorkflow: Maybe<TriggerWorkflowPayload>;
	/** Simplified workflow trigger for testing automation */
	triggerWorkflowSimple: Maybe<TriggerWorkflowSimplePayload>;
	/** Unsubscribe from notifications for specific resources */
	unsubscribeFromNotifications: Maybe<UnsubscribeFromNotificationsPayload>;
	/** Updates a single `AuditLog` using its globally unique id and a patch. */
	updateAuditLog: Maybe<UpdateAuditLogPayload>;
	/** Updates a single `AuditLog` using a unique key and a patch. */
	updateAuditLogById: Maybe<UpdateAuditLogPayload>;
	/** Updates a single `AuthSession` using its globally unique id and a patch. */
	updateAuthSession: Maybe<UpdateAuthSessionPayload>;
	/** Updates a single `AuthSession` using a unique key and a patch. */
	updateAuthSessionById: Maybe<UpdateAuthSessionPayload>;
	/** Updates a single `Competency` using its globally unique id and a patch. */
	updateCompetency: Maybe<UpdateCompetencyPayload>;
	/** Updates a single `Competency` using a unique key and a patch. */
	updateCompetencyById: Maybe<UpdateCompetencyPayload>;
	/** Updates a single `CompetencyRating` using its globally unique id and a patch. */
	updateCompetencyRating: Maybe<UpdateCompetencyRatingPayload>;
	/** Updates a single `CompetencyRating` using a unique key and a patch. */
	updateCompetencyRatingById: Maybe<UpdateCompetencyRatingPayload>;
	/** Updates a single `CompetencyRating` using a unique key and a patch. */
	updateCompetencyRatingByReviewIdAndCompetencyId: Maybe<UpdateCompetencyRatingPayload>;
	/** Updates a single `ConsentRecord` using its globally unique id and a patch. */
	updateConsentRecord: Maybe<UpdateConsentRecordPayload>;
	/** Updates a single `ConsentRecord` using a unique key and a patch. */
	updateConsentRecordById: Maybe<UpdateConsentRecordPayload>;
	/** Updates a single `ConsentRecord` using a unique key and a patch. */
	updateConsentRecordByUserIdAndConsentTypeAndConsentVersion: Maybe<UpdateConsentRecordPayload>;
	/** Updates a single `ContactInfo` using its globally unique id and a patch. */
	updateContactInfo: Maybe<UpdateContactInfoPayload>;
	/** Updates a single `ContactInfo` using a unique key and a patch. */
	updateContactInfoById: Maybe<UpdateContactInfoPayload>;
	/** Updates a single `DataBreachIncident` using its globally unique id and a patch. */
	updateDataBreachIncident: Maybe<UpdateDataBreachIncidentPayload>;
	/** Updates a single `DataBreachIncident` using a unique key and a patch. */
	updateDataBreachIncidentById: Maybe<UpdateDataBreachIncidentPayload>;
	/** Updates a single `DataBreachIncident` using a unique key and a patch. */
	updateDataBreachIncidentByIncidentNumber: Maybe<UpdateDataBreachIncidentPayload>;
	/** Updates a single `DataLineage` using its globally unique id and a patch. */
	updateDataLineage: Maybe<UpdateDataLineagePayload>;
	/** Updates a single `DataLineage` using a unique key and a patch. */
	updateDataLineageById: Maybe<UpdateDataLineagePayload>;
	/** Updates a single `DataProtectionMetadatum` using its globally unique id and a patch. */
	updateDataProtectionMetadatum: Maybe<UpdateDataProtectionMetadatumPayload>;
	/** Updates a single `DataProtectionMetadatum` using a unique key and a patch. */
	updateDataProtectionMetadatumById: Maybe<UpdateDataProtectionMetadatumPayload>;
	/** Updates a single `DataRetentionPolicy` using its globally unique id and a patch. */
	updateDataRetentionPolicy: Maybe<UpdateDataRetentionPolicyPayload>;
	/** Updates a single `DataRetentionPolicy` using a unique key and a patch. */
	updateDataRetentionPolicyById: Maybe<UpdateDataRetentionPolicyPayload>;
	/** Updates a single `DataRetentionPolicy` using a unique key and a patch. */
	updateDataRetentionPolicyByPolicyName: Maybe<UpdateDataRetentionPolicyPayload>;
	/** Update notification delivery status with tracking timestamps */
	updateDeliveryStatus: Maybe<UpdateDeliveryStatusPayload>;
	/** Updates a single `Department` using its globally unique id and a patch. */
	updateDepartment: Maybe<UpdateDepartmentPayload>;
	/** Updates a single `Department` using a unique key and a patch. */
	updateDepartmentById: Maybe<UpdateDepartmentPayload>;
	/** Updates a single `DocumentAccess` using its globally unique id and a patch. */
	updateDocumentAccess: Maybe<UpdateDocumentAccessPayload>;
	/** Updates a single `DocumentAccess` using a unique key and a patch. */
	updateDocumentAccessByDocumentIdAndUserIdAndAccessType: Maybe<UpdateDocumentAccessPayload>;
	/** Updates a single `DocumentAccess` using a unique key and a patch. */
	updateDocumentAccessById: Maybe<UpdateDocumentAccessPayload>;
	/** Updates a single `DocumentSignature` using its globally unique id and a patch. */
	updateDocumentSignature: Maybe<UpdateDocumentSignaturePayload>;
	/** Updates a single `DocumentSignature` using a unique key and a patch. */
	updateDocumentSignatureByDocumentIdAndSignerIdAndSignatureType: Maybe<UpdateDocumentSignaturePayload>;
	/** Updates a single `DocumentSignature` using a unique key and a patch. */
	updateDocumentSignatureById: Maybe<UpdateDocumentSignaturePayload>;
	/** Updates a single `DocumentTemplate` using its globally unique id and a patch. */
	updateDocumentTemplate: Maybe<UpdateDocumentTemplatePayload>;
	/** Updates a single `DocumentTemplate` using a unique key and a patch. */
	updateDocumentTemplateById: Maybe<UpdateDocumentTemplatePayload>;
	/** Updates a single `DocumentTemplate` using a unique key and a patch. */
	updateDocumentTemplateByTemplateNameAndVersion: Maybe<UpdateDocumentTemplatePayload>;
	/** Updates a single `EmployeeDocument` using its globally unique id and a patch. */
	updateEmployeeDocument: Maybe<UpdateEmployeeDocumentPayload>;
	/** Updates a single `EmployeeDocument` using a unique key and a patch. */
	updateEmployeeDocumentById: Maybe<UpdateEmployeeDocumentPayload>;
	/** Updates a single `EmployeeGoal` using its globally unique id and a patch. */
	updateEmployeeGoal: Maybe<UpdateEmployeeGoalPayload>;
	/** Updates a single `EmployeeGoal` using a unique key and a patch. */
	updateEmployeeGoalById: Maybe<UpdateEmployeeGoalPayload>;
	/** Updates a single `ErasureRequest` using its globally unique id and a patch. */
	updateErasureRequest: Maybe<UpdateErasureRequestPayload>;
	/** Updates a single `ErasureRequest` using a unique key and a patch. */
	updateErasureRequestById: Maybe<UpdateErasureRequestPayload>;
	/** Updates a single `FailedLoginAttempt` using its globally unique id and a patch. */
	updateFailedLoginAttempt: Maybe<UpdateFailedLoginAttemptPayload>;
	/** Updates a single `FailedLoginAttempt` using a unique key and a patch. */
	updateFailedLoginAttemptById: Maybe<UpdateFailedLoginAttemptPayload>;
	/** Update progress and status of an employee goal */
	updateGoalProgress: Maybe<UpdateGoalProgressPayload>;
	/** Updates a single `JobInfo` using its globally unique id and a patch. */
	updateJobInfo: Maybe<UpdateJobInfoPayload>;
	/** Updates a single `JobInfo` using a unique key and a patch. */
	updateJobInfoById: Maybe<UpdateJobInfoPayload>;
	/** Update own contact information (employee self-service) */
	updateMyContactInformation: Maybe<UpdateMyContactInformationPayload>;
	/** Updates a single `Notification` using its globally unique id and a patch. */
	updateNotification: Maybe<UpdateNotificationPayload>;
	/** Updates a single `Notification` using a unique key and a patch. */
	updateNotificationById: Maybe<UpdateNotificationPayload>;
	/** Updates a single `NotificationDelivery` using its globally unique id and a patch. */
	updateNotificationDelivery: Maybe<UpdateNotificationDeliveryPayload>;
	/** Updates a single `NotificationDelivery` using a unique key and a patch. */
	updateNotificationDeliveryById: Maybe<UpdateNotificationDeliveryPayload>;
	/** Updates a single `NotificationDigest` using its globally unique id and a patch. */
	updateNotificationDigest: Maybe<UpdateNotificationDigestPayload>;
	/** Updates a single `NotificationDigest` using a unique key and a patch. */
	updateNotificationDigestById: Maybe<UpdateNotificationDigestPayload>;
	/** Updates a single `NotificationPreference` using its globally unique id and a patch. */
	updateNotificationPreference: Maybe<UpdateNotificationPreferencePayload>;
	/** Updates a single `NotificationPreference` using a unique key and a patch. */
	updateNotificationPreferenceById: Maybe<UpdateNotificationPreferencePayload>;
	/** Updates a single `NotificationPreference` using a unique key and a patch. */
	updateNotificationPreferenceByUserIdAndCategoryAndTemplateKey: Maybe<UpdateNotificationPreferencePayload>;
	/** Updates a single `NotificationSubscription` using its globally unique id and a patch. */
	updateNotificationSubscription: Maybe<UpdateNotificationSubscriptionPayload>;
	/** Updates a single `NotificationSubscription` using a unique key and a patch. */
	updateNotificationSubscriptionById: Maybe<UpdateNotificationSubscriptionPayload>;
	/** Updates a single `NotificationSubscription` using a unique key and a patch. */
	updateNotificationSubscriptionByUserIdAndResourceTypeAndResourceId: Maybe<UpdateNotificationSubscriptionPayload>;
	/** Updates a single `NotificationTemplate` using its globally unique id and a patch. */
	updateNotificationTemplate: Maybe<UpdateNotificationTemplatePayload>;
	/** Updates a single `NotificationTemplate` using a unique key and a patch. */
	updateNotificationTemplateById: Maybe<UpdateNotificationTemplatePayload>;
	/** Updates a single `NotificationTemplate` using a unique key and a patch. */
	updateNotificationTemplateByTemplateKey: Maybe<UpdateNotificationTemplatePayload>;
	/** Updates a single `PasswordPolicy` using its globally unique id and a patch. */
	updatePasswordPolicy: Maybe<UpdatePasswordPolicyPayload>;
	/** Updates a single `PasswordPolicy` using a unique key and a patch. */
	updatePasswordPolicyById: Maybe<UpdatePasswordPolicyPayload>;
	/** Updates a single `PasswordPolicy` using a unique key and a patch. */
	updatePasswordPolicyByPolicyName: Maybe<UpdatePasswordPolicyPayload>;
	/** Updates a single `PayrollPeriod` using its globally unique id and a patch. */
	updatePayrollPeriod: Maybe<UpdatePayrollPeriodPayload>;
	/** Updates a single `PayrollPeriod` using a unique key and a patch. */
	updatePayrollPeriodById: Maybe<UpdatePayrollPeriodPayload>;
	/** Updates a single `PerformanceReview` using its globally unique id and a patch. */
	updatePerformanceReview: Maybe<UpdatePerformanceReviewPayload>;
	/** Updates a single `PerformanceReview` using a unique key and a patch. */
	updatePerformanceReviewByEmployeeIdAndCycleId: Maybe<UpdatePerformanceReviewPayload>;
	/** Updates a single `PerformanceReview` using a unique key and a patch. */
	updatePerformanceReviewById: Maybe<UpdatePerformanceReviewPayload>;
	/** Updates a single `PrivacyImpactAssessment` using its globally unique id and a patch. */
	updatePrivacyImpactAssessment: Maybe<UpdatePrivacyImpactAssessmentPayload>;
	/** Updates a single `PrivacyImpactAssessment` using a unique key and a patch. */
	updatePrivacyImpactAssessmentByAssessmentReference: Maybe<UpdatePrivacyImpactAssessmentPayload>;
	/** Updates a single `PrivacyImpactAssessment` using a unique key and a patch. */
	updatePrivacyImpactAssessmentById: Maybe<UpdatePrivacyImpactAssessmentPayload>;
	/** Updates a single `PrivacyRequest` using its globally unique id and a patch. */
	updatePrivacyRequest: Maybe<UpdatePrivacyRequestPayload>;
	/** Updates a single `PrivacyRequest` using a unique key and a patch. */
	updatePrivacyRequestById: Maybe<UpdatePrivacyRequestPayload>;
	/** Updates a single `PrivacyRequest` using a unique key and a patch. */
	updatePrivacyRequestByRequestNumber: Maybe<UpdatePrivacyRequestPayload>;
	/** Updates a single `ProcessingActivity` using its globally unique id and a patch. */
	updateProcessingActivity: Maybe<UpdateProcessingActivityPayload>;
	/** Updates a single `ProcessingActivity` using a unique key and a patch. */
	updateProcessingActivityById: Maybe<UpdateProcessingActivityPayload>;
	/** Updates a single `ReviewCycle` using its globally unique id and a patch. */
	updateReviewCycle: Maybe<UpdateReviewCyclePayload>;
	/** Updates a single `ReviewCycle` using a unique key and a patch. */
	updateReviewCycleById: Maybe<UpdateReviewCyclePayload>;
	/** Updates a single `SecurityEvent` using its globally unique id and a patch. */
	updateSecurityEvent: Maybe<UpdateSecurityEventPayload>;
	/** Updates a single `SecurityEvent` using a unique key and a patch. */
	updateSecurityEventById: Maybe<UpdateSecurityEventPayload>;
	/** Updates a single `TimeOffBalance` using its globally unique id and a patch. */
	updateTimeOffBalance: Maybe<UpdateTimeOffBalancePayload>;
	/** Updates a single `TimeOffBalance` using a unique key and a patch. */
	updateTimeOffBalanceById: Maybe<UpdateTimeOffBalancePayload>;
	/** Updates a single `TimeOffBalance` using a unique key and a patch. */
	updateTimeOffBalanceByUserIdAndPolicyIdAndYear: Maybe<UpdateTimeOffBalancePayload>;
	/** Updates a single `TimeOffPolicy` using its globally unique id and a patch. */
	updateTimeOffPolicy: Maybe<UpdateTimeOffPolicyPayload>;
	/** Updates a single `TimeOffPolicy` using a unique key and a patch. */
	updateTimeOffPolicyById: Maybe<UpdateTimeOffPolicyPayload>;
	/** Updates a single `TimeOffRequest` using its globally unique id and a patch. */
	updateTimeOffRequest: Maybe<UpdateTimeOffRequestPayload>;
	/** Updates a single `TimeOffRequest` using a unique key and a patch. */
	updateTimeOffRequestById: Maybe<UpdateTimeOffRequestPayload>;
	/** Updates a single `User` using its globally unique id and a patch. */
	updateUser: Maybe<UpdateUserPayload>;
	/** Updates a single `User` using a unique key and a patch. */
	updateUserByEmail: Maybe<UpdateUserPayload>;
	/** Updates a single `User` using a unique key and a patch. */
	updateUserById: Maybe<UpdateUserPayload>;
	/** Updates a single `UserDevice` using its globally unique id and a patch. */
	updateUserDevice: Maybe<UpdateUserDevicePayload>;
	/** Updates a single `UserDevice` using a unique key and a patch. */
	updateUserDeviceById: Maybe<UpdateUserDevicePayload>;
	/** Updates a single `UserDevice` using a unique key and a patch. */
	updateUserDeviceByUserIdAndDeviceId: Maybe<UpdateUserDevicePayload>;
	/** Updates a single `UserMfaSetting` using its globally unique id and a patch. */
	updateUserMfaSetting: Maybe<UpdateUserMfaSettingPayload>;
	/** Updates a single `UserMfaSetting` using a unique key and a patch. */
	updateUserMfaSettingById: Maybe<UpdateUserMfaSettingPayload>;
	/** Updates a single `UserMfaSetting` using a unique key and a patch. */
	updateUserMfaSettingByUserId: Maybe<UpdateUserMfaSettingPayload>;
	/** Updates a single `UserPasswordHistory` using its globally unique id and a patch. */
	updateUserPasswordHistory: Maybe<UpdateUserPasswordHistoryPayload>;
	/** Updates a single `UserPasswordHistory` using a unique key and a patch. */
	updateUserPasswordHistoryById: Maybe<UpdateUserPasswordHistoryPayload>;
	/** Updates a single `UserRole` using its globally unique id and a patch. */
	updateUserRole: Maybe<UpdateUserRolePayload>;
	/** Updates a single `UserRoleAssignment` using its globally unique id and a patch. */
	updateUserRoleAssignment: Maybe<UpdateUserRoleAssignmentPayload>;
	/** Updates a single `UserRoleAssignment` using a unique key and a patch. */
	updateUserRoleAssignmentById: Maybe<UpdateUserRoleAssignmentPayload>;
	/** Updates a single `UserRoleAssignment` using a unique key and a patch. */
	updateUserRoleAssignmentByUserIdAndRoleId: Maybe<UpdateUserRoleAssignmentPayload>;
	/** Updates a single `UserRole` using a unique key and a patch. */
	updateUserRoleById: Maybe<UpdateUserRolePayload>;
	/** Updates a single `UserRole` using a unique key and a patch. */
	updateUserRoleByName: Maybe<UpdateUserRolePayload>;
	/** Updates a single `UserSession` using its globally unique id and a patch. */
	updateUserSession: Maybe<UpdateUserSessionPayload>;
	/** Updates a single `UserSession` using a unique key and a patch. */
	updateUserSessionById: Maybe<UpdateUserSessionPayload>;
	/** Updates a single `UserSession` using a unique key and a patch. */
	updateUserSessionByRefreshToken: Maybe<UpdateUserSessionPayload>;
	/** Updates a single `UserSession` using a unique key and a patch. */
	updateUserSessionBySessionToken: Maybe<UpdateUserSessionPayload>;
	/** Updates a single `WorkflowApproval` using its globally unique id and a patch. */
	updateWorkflowApproval: Maybe<UpdateWorkflowApprovalPayload>;
	/** Updates a single `WorkflowApproval` using a unique key and a patch. */
	updateWorkflowApprovalById: Maybe<UpdateWorkflowApprovalPayload>;
	/** Updates a single `WorkflowDefinition` using its globally unique id and a patch. */
	updateWorkflowDefinition: Maybe<UpdateWorkflowDefinitionPayload>;
	/** Updates a single `WorkflowDefinition` using a unique key and a patch. */
	updateWorkflowDefinitionById: Maybe<UpdateWorkflowDefinitionPayload>;
	/** Updates a single `WorkflowDefinition` using a unique key and a patch. */
	updateWorkflowDefinitionByNameAndVersion: Maybe<UpdateWorkflowDefinitionPayload>;
	/** Updates a single `WorkflowInstance` using its globally unique id and a patch. */
	updateWorkflowInstance: Maybe<UpdateWorkflowInstancePayload>;
	/** Updates a single `WorkflowInstance` using a unique key and a patch. */
	updateWorkflowInstanceById: Maybe<UpdateWorkflowInstancePayload>;
	/** Updates a single `WorkflowStepExecution` using its globally unique id and a patch. */
	updateWorkflowStepExecution: Maybe<UpdateWorkflowStepExecutionPayload>;
	/** Updates a single `WorkflowStepExecution` using a unique key and a patch. */
	updateWorkflowStepExecutionById: Maybe<UpdateWorkflowStepExecutionPayload>;
	/** Updates a single `WorkflowTask` using its globally unique id and a patch. */
	updateWorkflowTask: Maybe<UpdateWorkflowTaskPayload>;
	/** Updates a single `WorkflowTask` using a unique key and a patch. */
	updateWorkflowTaskById: Maybe<UpdateWorkflowTaskPayload>;
	/** Validate session token and update activity tracking */
	validateSession: Maybe<ValidateSessionPayload>;
	/** Withdraw GDPR consent with audit trail */
	withdrawUserConsent: Maybe<WithdrawUserConsentPayload>;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationAnonymizeUserDataArgs = {
	input: AnonymizeUserDataInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationAuthenticateArgs = {
	input: AuthenticateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCheckPrivacyComplianceStatusArgs = {
	input: CheckPrivacyComplianceStatusInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCheckRetentionComplianceArgs = {
	input: CheckRetentionComplianceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCompleteWorkflowTaskArgs = {
	input: CompleteWorkflowTaskInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateAuditLogArgs = {
	input: CreateAuditLogInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateAuthSessionArgs = {
	input: CreateAuthSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateCompetencyArgs = {
	input: CreateCompetencyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateCompetencyRatingArgs = {
	input: CreateCompetencyRatingInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateConsentRecordArgs = {
	input: CreateConsentRecordInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateContactInfoArgs = {
	input: CreateContactInfoInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDataBreachIncidentArgs = {
	input: CreateDataBreachIncidentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDataLineageArgs = {
	input: CreateDataLineageInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDataProtectionMetadataArgs = {
	input: CreateDataProtectionMetadataInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDataProtectionMetadatumArgs = {
	input: CreateDataProtectionMetadatumInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDataRetentionPolicyArgs = {
	input: CreateDataRetentionPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDepartmentArgs = {
	input: CreateDepartmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDocumentAccessArgs = {
	input: CreateDocumentAccessInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDocumentSignatureArgs = {
	input: CreateDocumentSignatureInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateDocumentTemplateArgs = {
	input: CreateDocumentTemplateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateEmployeeDocumentArgs = {
	input: CreateEmployeeDocumentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateEmployeeGoalArgs = {
	input: CreateEmployeeGoalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateErasureRequestArgs = {
	input: CreateErasureRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateFailedLoginAttemptArgs = {
	input: CreateFailedLoginAttemptInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateGoalArgs = {
	input: CreateGoalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateJobInfoArgs = {
	input: CreateJobInfoInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNewEmployeeCompensationArgs = {
	input: CreateNewEmployeeCompensationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNewPayrollPeriodArgs = {
	input: CreateNewPayrollPeriodInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNotificationArgs = {
	input: CreateNotificationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNotificationDeliveryArgs = {
	input: CreateNotificationDeliveryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNotificationDigestArgs = {
	input: CreateNotificationDigestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNotificationPreferenceArgs = {
	input: CreateNotificationPreferenceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNotificationSubscriptionArgs = {
	input: CreateNotificationSubscriptionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateNotificationTemplateArgs = {
	input: CreateNotificationTemplateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePasswordPolicyArgs = {
	input: CreatePasswordPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePayrollPeriodArgs = {
	input: CreatePayrollPeriodInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePerformanceReviewArgs = {
	input: CreatePerformanceReviewInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePrivacyImpactAssessmentArgs = {
	input: CreatePrivacyImpactAssessmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePrivacyRequestArgs = {
	input: CreatePrivacyRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateProcessingActivityArgs = {
	input: CreateProcessingActivityInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateReviewCycleArgs = {
	input: CreateReviewCycleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateReviewsForCycleArgs = {
	input: CreateReviewsForCycleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateSecurityEventArgs = {
	input: CreateSecurityEventInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateTimeOffBalanceArgs = {
	input: CreateTimeOffBalanceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateTimeOffPolicyArgs = {
	input: CreateTimeOffPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateTimeOffRequestArgs = {
	input: CreateTimeOffRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserArgs = {
	input: CreateUserInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserDeviceArgs = {
	input: CreateUserDeviceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserMfaSettingArgs = {
	input: CreateUserMfaSettingInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserPasswordHistoryArgs = {
	input: CreateUserPasswordHistoryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserRoleArgs = {
	input: CreateUserRoleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserRoleAssignmentArgs = {
	input: CreateUserRoleAssignmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateUserSessionArgs = {
	input: CreateUserSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateWorkflowApprovalArgs = {
	input: CreateWorkflowApprovalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateWorkflowDefinitionArgs = {
	input: CreateWorkflowDefinitionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateWorkflowInstanceArgs = {
	input: CreateWorkflowInstanceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateWorkflowStepExecutionArgs = {
	input: CreateWorkflowStepExecutionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateWorkflowTaskArgs = {
	input: CreateWorkflowTaskInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteAuditLogArgs = {
	input: DeleteAuditLogInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteAuditLogByIdArgs = {
	input: DeleteAuditLogByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteAuthSessionArgs = {
	input: DeleteAuthSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteAuthSessionByIdArgs = {
	input: DeleteAuthSessionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteCompetencyArgs = {
	input: DeleteCompetencyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteCompetencyByIdArgs = {
	input: DeleteCompetencyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteCompetencyRatingArgs = {
	input: DeleteCompetencyRatingInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteCompetencyRatingByIdArgs = {
	input: DeleteCompetencyRatingByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteCompetencyRatingByReviewIdAndCompetencyIdArgs = {
	input: DeleteCompetencyRatingByReviewIdAndCompetencyIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteConsentRecordArgs = {
	input: DeleteConsentRecordInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteConsentRecordByIdArgs = {
	input: DeleteConsentRecordByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteConsentRecordByUserIdAndConsentTypeAndConsentVersionArgs = {
	input: DeleteConsentRecordByUserIdAndConsentTypeAndConsentVersionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteContactInfoArgs = {
	input: DeleteContactInfoInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteContactInfoByIdArgs = {
	input: DeleteContactInfoByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataBreachIncidentArgs = {
	input: DeleteDataBreachIncidentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataBreachIncidentByIdArgs = {
	input: DeleteDataBreachIncidentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataBreachIncidentByIncidentNumberArgs = {
	input: DeleteDataBreachIncidentByIncidentNumberInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataLineageArgs = {
	input: DeleteDataLineageInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataLineageByIdArgs = {
	input: DeleteDataLineageByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataProtectionMetadatumArgs = {
	input: DeleteDataProtectionMetadatumInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataProtectionMetadatumByIdArgs = {
	input: DeleteDataProtectionMetadatumByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataRetentionPolicyArgs = {
	input: DeleteDataRetentionPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataRetentionPolicyByIdArgs = {
	input: DeleteDataRetentionPolicyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDataRetentionPolicyByPolicyNameArgs = {
	input: DeleteDataRetentionPolicyByPolicyNameInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDepartmentArgs = {
	input: DeleteDepartmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDepartmentByIdArgs = {
	input: DeleteDepartmentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentAccessArgs = {
	input: DeleteDocumentAccessInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentAccessByDocumentIdAndUserIdAndAccessTypeArgs = {
	input: DeleteDocumentAccessByDocumentIdAndUserIdAndAccessTypeInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentAccessByIdArgs = {
	input: DeleteDocumentAccessByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentSignatureArgs = {
	input: DeleteDocumentSignatureInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeArgs = {
	input: DeleteDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentSignatureByIdArgs = {
	input: DeleteDocumentSignatureByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentTemplateArgs = {
	input: DeleteDocumentTemplateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentTemplateByIdArgs = {
	input: DeleteDocumentTemplateByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteDocumentTemplateByTemplateNameAndVersionArgs = {
	input: DeleteDocumentTemplateByTemplateNameAndVersionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteEmployeeDocumentArgs = {
	input: DeleteEmployeeDocumentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteEmployeeDocumentByIdArgs = {
	input: DeleteEmployeeDocumentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteEmployeeGoalArgs = {
	input: DeleteEmployeeGoalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteEmployeeGoalByIdArgs = {
	input: DeleteEmployeeGoalByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteErasureRequestArgs = {
	input: DeleteErasureRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteErasureRequestByIdArgs = {
	input: DeleteErasureRequestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteFailedLoginAttemptArgs = {
	input: DeleteFailedLoginAttemptInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteFailedLoginAttemptByIdArgs = {
	input: DeleteFailedLoginAttemptByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteJobInfoArgs = {
	input: DeleteJobInfoInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteJobInfoByIdArgs = {
	input: DeleteJobInfoByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationArgs = {
	input: DeleteNotificationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationByIdArgs = {
	input: DeleteNotificationByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationDeliveryArgs = {
	input: DeleteNotificationDeliveryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationDeliveryByIdArgs = {
	input: DeleteNotificationDeliveryByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationDigestArgs = {
	input: DeleteNotificationDigestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationDigestByIdArgs = {
	input: DeleteNotificationDigestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationPreferenceArgs = {
	input: DeleteNotificationPreferenceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationPreferenceByIdArgs = {
	input: DeleteNotificationPreferenceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationPreferenceByUserIdAndCategoryAndTemplateKeyArgs = {
	input: DeleteNotificationPreferenceByUserIdAndCategoryAndTemplateKeyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationSubscriptionArgs = {
	input: DeleteNotificationSubscriptionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationSubscriptionByIdArgs = {
	input: DeleteNotificationSubscriptionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdArgs = {
	input: DeleteNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationTemplateArgs = {
	input: DeleteNotificationTemplateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationTemplateByIdArgs = {
	input: DeleteNotificationTemplateByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteNotificationTemplateByTemplateKeyArgs = {
	input: DeleteNotificationTemplateByTemplateKeyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePasswordPolicyArgs = {
	input: DeletePasswordPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePasswordPolicyByIdArgs = {
	input: DeletePasswordPolicyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePasswordPolicyByPolicyNameArgs = {
	input: DeletePasswordPolicyByPolicyNameInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePayrollPeriodArgs = {
	input: DeletePayrollPeriodInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePayrollPeriodByIdArgs = {
	input: DeletePayrollPeriodByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePerformanceReviewArgs = {
	input: DeletePerformanceReviewInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePerformanceReviewByEmployeeIdAndCycleIdArgs = {
	input: DeletePerformanceReviewByEmployeeIdAndCycleIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePerformanceReviewByIdArgs = {
	input: DeletePerformanceReviewByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePrivacyImpactAssessmentArgs = {
	input: DeletePrivacyImpactAssessmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePrivacyImpactAssessmentByAssessmentReferenceArgs = {
	input: DeletePrivacyImpactAssessmentByAssessmentReferenceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePrivacyImpactAssessmentByIdArgs = {
	input: DeletePrivacyImpactAssessmentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePrivacyRequestArgs = {
	input: DeletePrivacyRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePrivacyRequestByIdArgs = {
	input: DeletePrivacyRequestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePrivacyRequestByRequestNumberArgs = {
	input: DeletePrivacyRequestByRequestNumberInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteProcessingActivityArgs = {
	input: DeleteProcessingActivityInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteProcessingActivityByIdArgs = {
	input: DeleteProcessingActivityByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteReviewCycleArgs = {
	input: DeleteReviewCycleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteReviewCycleByIdArgs = {
	input: DeleteReviewCycleByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSecurityEventArgs = {
	input: DeleteSecurityEventInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSecurityEventByIdArgs = {
	input: DeleteSecurityEventByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffBalanceArgs = {
	input: DeleteTimeOffBalanceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffBalanceByIdArgs = {
	input: DeleteTimeOffBalanceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffBalanceByUserIdAndPolicyIdAndYearArgs = {
	input: DeleteTimeOffBalanceByUserIdAndPolicyIdAndYearInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffPolicyArgs = {
	input: DeleteTimeOffPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffPolicyByIdArgs = {
	input: DeleteTimeOffPolicyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffRequestArgs = {
	input: DeleteTimeOffRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteTimeOffRequestByIdArgs = {
	input: DeleteTimeOffRequestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserArgs = {
	input: DeleteUserInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserByEmailArgs = {
	input: DeleteUserByEmailInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserByIdArgs = {
	input: DeleteUserByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserDeviceArgs = {
	input: DeleteUserDeviceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserDeviceByIdArgs = {
	input: DeleteUserDeviceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserDeviceByUserIdAndDeviceIdArgs = {
	input: DeleteUserDeviceByUserIdAndDeviceIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserMfaSettingArgs = {
	input: DeleteUserMfaSettingInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserMfaSettingByIdArgs = {
	input: DeleteUserMfaSettingByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserMfaSettingByUserIdArgs = {
	input: DeleteUserMfaSettingByUserIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserPasswordHistoryArgs = {
	input: DeleteUserPasswordHistoryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserPasswordHistoryByIdArgs = {
	input: DeleteUserPasswordHistoryByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserRoleArgs = {
	input: DeleteUserRoleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserRoleAssignmentArgs = {
	input: DeleteUserRoleAssignmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserRoleAssignmentByIdArgs = {
	input: DeleteUserRoleAssignmentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserRoleAssignmentByUserIdAndRoleIdArgs = {
	input: DeleteUserRoleAssignmentByUserIdAndRoleIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserRoleByIdArgs = {
	input: DeleteUserRoleByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserRoleByNameArgs = {
	input: DeleteUserRoleByNameInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserSessionArgs = {
	input: DeleteUserSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserSessionByIdArgs = {
	input: DeleteUserSessionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserSessionByRefreshTokenArgs = {
	input: DeleteUserSessionByRefreshTokenInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteUserSessionBySessionTokenArgs = {
	input: DeleteUserSessionBySessionTokenInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowApprovalArgs = {
	input: DeleteWorkflowApprovalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowApprovalByIdArgs = {
	input: DeleteWorkflowApprovalByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowDefinitionArgs = {
	input: DeleteWorkflowDefinitionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowDefinitionByIdArgs = {
	input: DeleteWorkflowDefinitionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowDefinitionByNameAndVersionArgs = {
	input: DeleteWorkflowDefinitionByNameAndVersionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowInstanceArgs = {
	input: DeleteWorkflowInstanceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowInstanceByIdArgs = {
	input: DeleteWorkflowInstanceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowStepExecutionArgs = {
	input: DeleteWorkflowStepExecutionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowStepExecutionByIdArgs = {
	input: DeleteWorkflowStepExecutionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowTaskArgs = {
	input: DeleteWorkflowTaskInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteWorkflowTaskByIdArgs = {
	input: DeleteWorkflowTaskByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetEmployeeCompensationArgs = {
	input: GetEmployeeCompensationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetMyEmployeeGoalsArgs = {
	input: GetMyEmployeeGoalsInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetMyEmployeeProfileArgs = {
	input: GetMyEmployeeProfileInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetMyRecentActivitiesArgs = {
	input: GetMyRecentActivitiesInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetMyTimeOffSummaryArgs = {
	input: GetMyTimeOffSummaryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetPendingDeliveriesArgs = {
	input: GetPendingDeliveriesInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetUserNotificationPreferencesArgs = {
	input: GetUserNotificationPreferencesInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationGetWorkflowStatusArgs = {
	input: GetWorkflowStatusInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationIsLoginBlockedArgs = {
	input: IsLoginBlockedInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationLogAuditEventArgs = {
	input: LogAuditEventInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationLogSecurityEventArgs = {
	input: LogSecurityEventInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationMarkNotificationReadArgs = {
	input: MarkNotificationReadInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationProcessErasureRequestArgs = {
	input: ProcessErasureRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationRecordUserConsentArgs = {
	input: RecordUserConsentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationRefreshAnalyticsDashboardArgs = {
	input: RefreshAnalyticsDashboardInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationRegisterUserArgs = {
	input: RegisterUserInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationRequestDocumentAccessArgs = {
	input: RequestDocumentAccessInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationReviewTimeOffRequestArgs = {
	input: ReviewTimeOffRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationSendTemplatedNotificationArgs = {
	input: SendTemplatedNotificationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationSubmitManagerAssessmentArgs = {
	input: SubmitManagerAssessmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationSubmitSelfAssessmentArgs = {
	input: SubmitSelfAssessmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationSubmitTimeOffRequestArgs = {
	input: SubmitTimeOffRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationSubscribeToNotificationsArgs = {
	input: SubscribeToNotificationsInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationTerminateSessionArgs = {
	input: TerminateSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationTrackDataLineageArgs = {
	input: TrackDataLineageInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationTrackFailedLoginArgs = {
	input: TrackFailedLoginInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationTriggerWorkflowArgs = {
	input: TriggerWorkflowInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationTriggerWorkflowSimpleArgs = {
	input: TriggerWorkflowSimpleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUnsubscribeFromNotificationsArgs = {
	input: UnsubscribeFromNotificationsInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateAuditLogArgs = {
	input: UpdateAuditLogInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateAuditLogByIdArgs = {
	input: UpdateAuditLogByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateAuthSessionArgs = {
	input: UpdateAuthSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateAuthSessionByIdArgs = {
	input: UpdateAuthSessionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateCompetencyArgs = {
	input: UpdateCompetencyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateCompetencyByIdArgs = {
	input: UpdateCompetencyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateCompetencyRatingArgs = {
	input: UpdateCompetencyRatingInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateCompetencyRatingByIdArgs = {
	input: UpdateCompetencyRatingByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateCompetencyRatingByReviewIdAndCompetencyIdArgs = {
	input: UpdateCompetencyRatingByReviewIdAndCompetencyIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateConsentRecordArgs = {
	input: UpdateConsentRecordInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateConsentRecordByIdArgs = {
	input: UpdateConsentRecordByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateConsentRecordByUserIdAndConsentTypeAndConsentVersionArgs = {
	input: UpdateConsentRecordByUserIdAndConsentTypeAndConsentVersionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateContactInfoArgs = {
	input: UpdateContactInfoInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateContactInfoByIdArgs = {
	input: UpdateContactInfoByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataBreachIncidentArgs = {
	input: UpdateDataBreachIncidentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataBreachIncidentByIdArgs = {
	input: UpdateDataBreachIncidentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataBreachIncidentByIncidentNumberArgs = {
	input: UpdateDataBreachIncidentByIncidentNumberInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataLineageArgs = {
	input: UpdateDataLineageInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataLineageByIdArgs = {
	input: UpdateDataLineageByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataProtectionMetadatumArgs = {
	input: UpdateDataProtectionMetadatumInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataProtectionMetadatumByIdArgs = {
	input: UpdateDataProtectionMetadatumByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataRetentionPolicyArgs = {
	input: UpdateDataRetentionPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataRetentionPolicyByIdArgs = {
	input: UpdateDataRetentionPolicyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDataRetentionPolicyByPolicyNameArgs = {
	input: UpdateDataRetentionPolicyByPolicyNameInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDeliveryStatusArgs = {
	input: UpdateDeliveryStatusInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDepartmentArgs = {
	input: UpdateDepartmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDepartmentByIdArgs = {
	input: UpdateDepartmentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentAccessArgs = {
	input: UpdateDocumentAccessInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentAccessByDocumentIdAndUserIdAndAccessTypeArgs = {
	input: UpdateDocumentAccessByDocumentIdAndUserIdAndAccessTypeInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentAccessByIdArgs = {
	input: UpdateDocumentAccessByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentSignatureArgs = {
	input: UpdateDocumentSignatureInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeArgs = {
	input: UpdateDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentSignatureByIdArgs = {
	input: UpdateDocumentSignatureByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentTemplateArgs = {
	input: UpdateDocumentTemplateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentTemplateByIdArgs = {
	input: UpdateDocumentTemplateByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateDocumentTemplateByTemplateNameAndVersionArgs = {
	input: UpdateDocumentTemplateByTemplateNameAndVersionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateEmployeeDocumentArgs = {
	input: UpdateEmployeeDocumentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateEmployeeDocumentByIdArgs = {
	input: UpdateEmployeeDocumentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateEmployeeGoalArgs = {
	input: UpdateEmployeeGoalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateEmployeeGoalByIdArgs = {
	input: UpdateEmployeeGoalByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateErasureRequestArgs = {
	input: UpdateErasureRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateErasureRequestByIdArgs = {
	input: UpdateErasureRequestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateFailedLoginAttemptArgs = {
	input: UpdateFailedLoginAttemptInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateFailedLoginAttemptByIdArgs = {
	input: UpdateFailedLoginAttemptByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateGoalProgressArgs = {
	input: UpdateGoalProgressInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateJobInfoArgs = {
	input: UpdateJobInfoInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateJobInfoByIdArgs = {
	input: UpdateJobInfoByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateMyContactInformationArgs = {
	input: UpdateMyContactInformationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationArgs = {
	input: UpdateNotificationInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationByIdArgs = {
	input: UpdateNotificationByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationDeliveryArgs = {
	input: UpdateNotificationDeliveryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationDeliveryByIdArgs = {
	input: UpdateNotificationDeliveryByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationDigestArgs = {
	input: UpdateNotificationDigestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationDigestByIdArgs = {
	input: UpdateNotificationDigestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationPreferenceArgs = {
	input: UpdateNotificationPreferenceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationPreferenceByIdArgs = {
	input: UpdateNotificationPreferenceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationPreferenceByUserIdAndCategoryAndTemplateKeyArgs = {
	input: UpdateNotificationPreferenceByUserIdAndCategoryAndTemplateKeyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationSubscriptionArgs = {
	input: UpdateNotificationSubscriptionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationSubscriptionByIdArgs = {
	input: UpdateNotificationSubscriptionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdArgs = {
	input: UpdateNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationTemplateArgs = {
	input: UpdateNotificationTemplateInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationTemplateByIdArgs = {
	input: UpdateNotificationTemplateByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateNotificationTemplateByTemplateKeyArgs = {
	input: UpdateNotificationTemplateByTemplateKeyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePasswordPolicyArgs = {
	input: UpdatePasswordPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePasswordPolicyByIdArgs = {
	input: UpdatePasswordPolicyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePasswordPolicyByPolicyNameArgs = {
	input: UpdatePasswordPolicyByPolicyNameInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePayrollPeriodArgs = {
	input: UpdatePayrollPeriodInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePayrollPeriodByIdArgs = {
	input: UpdatePayrollPeriodByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePerformanceReviewArgs = {
	input: UpdatePerformanceReviewInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePerformanceReviewByEmployeeIdAndCycleIdArgs = {
	input: UpdatePerformanceReviewByEmployeeIdAndCycleIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePerformanceReviewByIdArgs = {
	input: UpdatePerformanceReviewByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePrivacyImpactAssessmentArgs = {
	input: UpdatePrivacyImpactAssessmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePrivacyImpactAssessmentByAssessmentReferenceArgs = {
	input: UpdatePrivacyImpactAssessmentByAssessmentReferenceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePrivacyImpactAssessmentByIdArgs = {
	input: UpdatePrivacyImpactAssessmentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePrivacyRequestArgs = {
	input: UpdatePrivacyRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePrivacyRequestByIdArgs = {
	input: UpdatePrivacyRequestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePrivacyRequestByRequestNumberArgs = {
	input: UpdatePrivacyRequestByRequestNumberInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateProcessingActivityArgs = {
	input: UpdateProcessingActivityInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateProcessingActivityByIdArgs = {
	input: UpdateProcessingActivityByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateReviewCycleArgs = {
	input: UpdateReviewCycleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateReviewCycleByIdArgs = {
	input: UpdateReviewCycleByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSecurityEventArgs = {
	input: UpdateSecurityEventInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSecurityEventByIdArgs = {
	input: UpdateSecurityEventByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffBalanceArgs = {
	input: UpdateTimeOffBalanceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffBalanceByIdArgs = {
	input: UpdateTimeOffBalanceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffBalanceByUserIdAndPolicyIdAndYearArgs = {
	input: UpdateTimeOffBalanceByUserIdAndPolicyIdAndYearInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffPolicyArgs = {
	input: UpdateTimeOffPolicyInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffPolicyByIdArgs = {
	input: UpdateTimeOffPolicyByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffRequestArgs = {
	input: UpdateTimeOffRequestInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateTimeOffRequestByIdArgs = {
	input: UpdateTimeOffRequestByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserArgs = {
	input: UpdateUserInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserByEmailArgs = {
	input: UpdateUserByEmailInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserByIdArgs = {
	input: UpdateUserByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserDeviceArgs = {
	input: UpdateUserDeviceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserDeviceByIdArgs = {
	input: UpdateUserDeviceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserDeviceByUserIdAndDeviceIdArgs = {
	input: UpdateUserDeviceByUserIdAndDeviceIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserMfaSettingArgs = {
	input: UpdateUserMfaSettingInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserMfaSettingByIdArgs = {
	input: UpdateUserMfaSettingByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserMfaSettingByUserIdArgs = {
	input: UpdateUserMfaSettingByUserIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserPasswordHistoryArgs = {
	input: UpdateUserPasswordHistoryInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserPasswordHistoryByIdArgs = {
	input: UpdateUserPasswordHistoryByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserRoleArgs = {
	input: UpdateUserRoleInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserRoleAssignmentArgs = {
	input: UpdateUserRoleAssignmentInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserRoleAssignmentByIdArgs = {
	input: UpdateUserRoleAssignmentByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserRoleAssignmentByUserIdAndRoleIdArgs = {
	input: UpdateUserRoleAssignmentByUserIdAndRoleIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserRoleByIdArgs = {
	input: UpdateUserRoleByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserRoleByNameArgs = {
	input: UpdateUserRoleByNameInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserSessionArgs = {
	input: UpdateUserSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserSessionByIdArgs = {
	input: UpdateUserSessionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserSessionByRefreshTokenArgs = {
	input: UpdateUserSessionByRefreshTokenInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateUserSessionBySessionTokenArgs = {
	input: UpdateUserSessionBySessionTokenInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowApprovalArgs = {
	input: UpdateWorkflowApprovalInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowApprovalByIdArgs = {
	input: UpdateWorkflowApprovalByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowDefinitionArgs = {
	input: UpdateWorkflowDefinitionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowDefinitionByIdArgs = {
	input: UpdateWorkflowDefinitionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowDefinitionByNameAndVersionArgs = {
	input: UpdateWorkflowDefinitionByNameAndVersionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowInstanceArgs = {
	input: UpdateWorkflowInstanceInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowInstanceByIdArgs = {
	input: UpdateWorkflowInstanceByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowStepExecutionArgs = {
	input: UpdateWorkflowStepExecutionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowStepExecutionByIdArgs = {
	input: UpdateWorkflowStepExecutionByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowTaskArgs = {
	input: UpdateWorkflowTaskInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateWorkflowTaskByIdArgs = {
	input: UpdateWorkflowTaskByIdInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationValidateSessionArgs = {
	input: ValidateSessionInput;
};

/** The root mutation type which contains root level fields which mutate data. */
export type MutationWithdrawUserConsentArgs = {
	input: WithdrawUserConsentInput;
};

/** An object with a globally unique `ID`. */
export type Node = {
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
};

/** System notifications and alerts for users */
export type Notification = Node & {
	__typename: 'Notification';
	actionUrl: Maybe<Scalars['String']['output']>;
	category: Maybe<NotificationCategory>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	expiresAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	isRead: Maybe<Scalars['Boolean']['output']>;
	message: Scalars['String']['output'];
	metadata: Maybe<Scalars['JSON']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads a single `Notification` that is related to this `Notification`. */
	notificationByParentNotificationId: Maybe<Notification>;
	/** Reads and enables pagination through a set of `NotificationDelivery`. */
	notificationDeliveriesByNotificationId: NotificationDeliveriesConnection;
	/** Reads and enables pagination through a set of `Notification`. */
	notificationsByParentNotificationId: NotificationsConnection;
	parentNotificationId: Maybe<Scalars['UUID']['output']>;
	priority: Maybe<NotificationPriority>;
	readAt: Maybe<Scalars['Datetime']['output']>;
	sourceId: Maybe<Scalars['UUID']['output']>;
	sourceType: Maybe<Scalars['String']['output']>;
	templateData: Maybe<Scalars['JSON']['output']>;
	templateKey: Maybe<Scalars['String']['output']>;
	threadId: Maybe<Scalars['UUID']['output']>;
	title: Scalars['String']['output'];
	type: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `Notification`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/** System notifications and alerts for users */
export type NotificationNotificationDeliveriesByNotificationIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationDeliveryCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationDeliveriesOrderBy>>;
};

/** System notifications and alerts for users */
export type NotificationNotificationsByParentNotificationIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationsOrderBy>>;
};

export type NotificationCategory =
	| 'ALERT'
	| 'ANNOUNCEMENT'
	| 'APPROVAL'
	| 'DOCUMENT'
	| 'PAYROLL'
	| 'PERFORMANCE'
	| 'REMINDER'
	| 'SECURITY'
	| 'SYSTEM'
	| 'TIME_OFF'
	| 'WORKFLOW';

export type NotificationChannel =
	| 'EMAIL'
	| 'IN_APP'
	| 'PUSH'
	| 'SLACK'
	| 'SMS'
	| 'TEAMS'
	| 'WEBHOOK';

/**
 * A condition to be used against `Notification` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type NotificationCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `parentNotificationId` field. */
	parentNotificationId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `NotificationDelivery` values. */
export type NotificationDeliveriesConnection = {
	__typename: 'NotificationDeliveriesConnection';
	/** A list of edges which contains the `NotificationDelivery` and cursor to aid in pagination. */
	edges: Array<NotificationDeliveriesEdge>;
	/** A list of `NotificationDelivery` objects. */
	nodes: Array<NotificationDelivery>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `NotificationDelivery` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `NotificationDelivery` edge in the connection. */
export type NotificationDeliveriesEdge = {
	__typename: 'NotificationDeliveriesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `NotificationDelivery` at the end of the edge. */
	node: NotificationDelivery;
};

/** Methods to use when ordering `NotificationDelivery`. */
export type NotificationDeliveriesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'NOTIFICATION_ID_ASC'
	| 'NOTIFICATION_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

export type NotificationDelivery = Node & {
	__typename: 'NotificationDelivery';
	channel: NotificationChannel;
	channelAddress: Maybe<Scalars['String']['output']>;
	clickedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	deliveredAt: Maybe<Scalars['Datetime']['output']>;
	errorMessage: Maybe<Scalars['String']['output']>;
	externalId: Maybe<Scalars['String']['output']>;
	failedAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	maxRetries: Maybe<Scalars['Int']['output']>;
	nextRetryAt: Maybe<Scalars['Datetime']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads a single `Notification` that is related to this `NotificationDelivery`. */
	notificationByNotificationId: Maybe<Notification>;
	notificationId: Scalars['UUID']['output'];
	readAt: Maybe<Scalars['Datetime']['output']>;
	retryCount: Maybe<Scalars['Int']['output']>;
	sentAt: Maybe<Scalars['Datetime']['output']>;
	status: Maybe<DeliveryStatus>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `NotificationDelivery`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `NotificationDelivery` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type NotificationDeliveryCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `notificationId` field. */
	notificationId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `NotificationDelivery` */
export type NotificationDeliveryInput = {
	channel: NotificationChannel;
	channelAddress?: InputMaybe<Scalars['String']['input']>;
	clickedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	deliveredAt?: InputMaybe<Scalars['Datetime']['input']>;
	errorMessage?: InputMaybe<Scalars['String']['input']>;
	externalId?: InputMaybe<Scalars['String']['input']>;
	failedAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	maxRetries?: InputMaybe<Scalars['Int']['input']>;
	nextRetryAt?: InputMaybe<Scalars['Datetime']['input']>;
	notificationId: Scalars['UUID']['input'];
	readAt?: InputMaybe<Scalars['Datetime']['input']>;
	retryCount?: InputMaybe<Scalars['Int']['input']>;
	sentAt?: InputMaybe<Scalars['Datetime']['input']>;
	status?: InputMaybe<DeliveryStatus>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `NotificationDelivery`. Fields that are set will be updated. */
export type NotificationDeliveryPatch = {
	channel?: InputMaybe<NotificationChannel>;
	channelAddress?: InputMaybe<Scalars['String']['input']>;
	clickedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	deliveredAt?: InputMaybe<Scalars['Datetime']['input']>;
	errorMessage?: InputMaybe<Scalars['String']['input']>;
	externalId?: InputMaybe<Scalars['String']['input']>;
	failedAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	maxRetries?: InputMaybe<Scalars['Int']['input']>;
	nextRetryAt?: InputMaybe<Scalars['Datetime']['input']>;
	notificationId?: InputMaybe<Scalars['UUID']['input']>;
	readAt?: InputMaybe<Scalars['Datetime']['input']>;
	retryCount?: InputMaybe<Scalars['Int']['input']>;
	sentAt?: InputMaybe<Scalars['Datetime']['input']>;
	status?: InputMaybe<DeliveryStatus>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

export type NotificationDigest = Node & {
	__typename: 'NotificationDigest';
	categoriesSummary: Maybe<Scalars['JSON']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	digestContent: Maybe<Scalars['String']['output']>;
	frequency: DigestFrequency;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	notificationCount: Scalars['Int']['output'];
	openedAt: Maybe<Scalars['Datetime']['output']>;
	periodEnd: Scalars['Datetime']['output'];
	periodStart: Scalars['Datetime']['output'];
	prioritySummary: Maybe<Scalars['JSON']['output']>;
	sentAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `NotificationDigest`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `NotificationDigest` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type NotificationDigestCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `NotificationDigest` */
export type NotificationDigestInput = {
	categoriesSummary?: InputMaybe<Scalars['JSON']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	digestContent?: InputMaybe<Scalars['String']['input']>;
	frequency: DigestFrequency;
	id?: InputMaybe<Scalars['UUID']['input']>;
	notificationCount?: InputMaybe<Scalars['Int']['input']>;
	openedAt?: InputMaybe<Scalars['Datetime']['input']>;
	periodEnd: Scalars['Datetime']['input'];
	periodStart: Scalars['Datetime']['input'];
	prioritySummary?: InputMaybe<Scalars['JSON']['input']>;
	sentAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `NotificationDigest`. Fields that are set will be updated. */
export type NotificationDigestPatch = {
	categoriesSummary?: InputMaybe<Scalars['JSON']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	digestContent?: InputMaybe<Scalars['String']['input']>;
	frequency?: InputMaybe<DigestFrequency>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	notificationCount?: InputMaybe<Scalars['Int']['input']>;
	openedAt?: InputMaybe<Scalars['Datetime']['input']>;
	periodEnd?: InputMaybe<Scalars['Datetime']['input']>;
	periodStart?: InputMaybe<Scalars['Datetime']['input']>;
	prioritySummary?: InputMaybe<Scalars['JSON']['input']>;
	sentAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `NotificationDigest` values. */
export type NotificationDigestsConnection = {
	__typename: 'NotificationDigestsConnection';
	/** A list of edges which contains the `NotificationDigest` and cursor to aid in pagination. */
	edges: Array<NotificationDigestsEdge>;
	/** A list of `NotificationDigest` objects. */
	nodes: Array<NotificationDigest>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `NotificationDigest` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `NotificationDigest` edge in the connection. */
export type NotificationDigestsEdge = {
	__typename: 'NotificationDigestsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `NotificationDigest` at the end of the edge. */
	node: NotificationDigest;
};

/** Methods to use when ordering `NotificationDigest`. */
export type NotificationDigestsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** An input for mutations affecting `Notification` */
export type NotificationInput = {
	actionUrl?: InputMaybe<Scalars['String']['input']>;
	category?: InputMaybe<NotificationCategory>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isRead?: InputMaybe<Scalars['Boolean']['input']>;
	message: Scalars['String']['input'];
	metadata?: InputMaybe<Scalars['JSON']['input']>;
	parentNotificationId?: InputMaybe<Scalars['UUID']['input']>;
	priority?: InputMaybe<NotificationPriority>;
	readAt?: InputMaybe<Scalars['Datetime']['input']>;
	sourceId?: InputMaybe<Scalars['UUID']['input']>;
	sourceType?: InputMaybe<Scalars['String']['input']>;
	templateData?: InputMaybe<Scalars['JSON']['input']>;
	templateKey?: InputMaybe<Scalars['String']['input']>;
	threadId?: InputMaybe<Scalars['UUID']['input']>;
	title: Scalars['String']['input'];
	type?: InputMaybe<Scalars['String']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `Notification`. Fields that are set will be updated. */
export type NotificationPatch = {
	actionUrl?: InputMaybe<Scalars['String']['input']>;
	category?: InputMaybe<NotificationCategory>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isRead?: InputMaybe<Scalars['Boolean']['input']>;
	message?: InputMaybe<Scalars['String']['input']>;
	metadata?: InputMaybe<Scalars['JSON']['input']>;
	parentNotificationId?: InputMaybe<Scalars['UUID']['input']>;
	priority?: InputMaybe<NotificationPriority>;
	readAt?: InputMaybe<Scalars['Datetime']['input']>;
	sourceId?: InputMaybe<Scalars['UUID']['input']>;
	sourceType?: InputMaybe<Scalars['String']['input']>;
	templateData?: InputMaybe<Scalars['JSON']['input']>;
	templateKey?: InputMaybe<Scalars['String']['input']>;
	threadId?: InputMaybe<Scalars['UUID']['input']>;
	title?: InputMaybe<Scalars['String']['input']>;
	type?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

export type NotificationPreference = Node & {
	__typename: 'NotificationPreference';
	category: Maybe<NotificationCategory>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	digestFrequency: Maybe<DigestFrequency>;
	disabledChannels: Maybe<Array<Maybe<NotificationChannel>>>;
	enabledChannels: Maybe<Array<Maybe<NotificationChannel>>>;
	id: Scalars['UUID']['output'];
	keywordsExclude: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	keywordsInclude: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	minPriority: Maybe<NotificationPriority>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	quietHoursEnd: Maybe<Scalars['Time']['output']>;
	quietHoursStart: Maybe<Scalars['Time']['output']>;
	templateKey: Maybe<Scalars['String']['output']>;
	timezone: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `NotificationPreference`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `NotificationPreference` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type NotificationPreferenceCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `NotificationPreference` */
export type NotificationPreferenceInput = {
	category?: InputMaybe<NotificationCategory>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	digestFrequency?: InputMaybe<DigestFrequency>;
	disabledChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	enabledChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	keywordsExclude?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	keywordsInclude?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	minPriority?: InputMaybe<NotificationPriority>;
	quietHoursEnd?: InputMaybe<Scalars['Time']['input']>;
	quietHoursStart?: InputMaybe<Scalars['Time']['input']>;
	templateKey?: InputMaybe<Scalars['String']['input']>;
	timezone?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `NotificationPreference`. Fields that are set will be updated. */
export type NotificationPreferencePatch = {
	category?: InputMaybe<NotificationCategory>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	digestFrequency?: InputMaybe<DigestFrequency>;
	disabledChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	enabledChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	keywordsExclude?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	keywordsInclude?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	minPriority?: InputMaybe<NotificationPriority>;
	quietHoursEnd?: InputMaybe<Scalars['Time']['input']>;
	quietHoursStart?: InputMaybe<Scalars['Time']['input']>;
	templateKey?: InputMaybe<Scalars['String']['input']>;
	timezone?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `NotificationPreference` values. */
export type NotificationPreferencesConnection = {
	__typename: 'NotificationPreferencesConnection';
	/** A list of edges which contains the `NotificationPreference` and cursor to aid in pagination. */
	edges: Array<NotificationPreferencesEdge>;
	/** A list of `NotificationPreference` objects. */
	nodes: Array<NotificationPreference>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `NotificationPreference` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `NotificationPreference` edge in the connection. */
export type NotificationPreferencesEdge = {
	__typename: 'NotificationPreferencesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `NotificationPreference` at the end of the edge. */
	node: NotificationPreference;
};

/** Methods to use when ordering `NotificationPreference`. */
export type NotificationPreferencesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'LOW' | 'NORMAL' | 'URGENT';

export type NotificationSubscription = Node & {
	__typename: 'NotificationSubscription';
	categories: Maybe<Array<Maybe<NotificationCategory>>>;
	channels: Maybe<Array<Maybe<NotificationChannel>>>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	resourceId: Scalars['UUID']['output'];
	resourceType: Scalars['String']['output'];
	subscribedAt: Maybe<Scalars['Datetime']['output']>;
	unsubscribedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `NotificationSubscription`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `NotificationSubscription` object types. All
 * fields are tested for equality and combined with a logical ‘and.’
 */
export type NotificationSubscriptionCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `NotificationSubscription` */
export type NotificationSubscriptionInput = {
	categories?: InputMaybe<Array<InputMaybe<NotificationCategory>>>;
	channels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	resourceId: Scalars['UUID']['input'];
	resourceType: Scalars['String']['input'];
	subscribedAt?: InputMaybe<Scalars['Datetime']['input']>;
	unsubscribedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `NotificationSubscription`. Fields that are set will be updated. */
export type NotificationSubscriptionPatch = {
	categories?: InputMaybe<Array<InputMaybe<NotificationCategory>>>;
	channels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	resourceId?: InputMaybe<Scalars['UUID']['input']>;
	resourceType?: InputMaybe<Scalars['String']['input']>;
	subscribedAt?: InputMaybe<Scalars['Datetime']['input']>;
	unsubscribedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `NotificationSubscription` values. */
export type NotificationSubscriptionsConnection = {
	__typename: 'NotificationSubscriptionsConnection';
	/** A list of edges which contains the `NotificationSubscription` and cursor to aid in pagination. */
	edges: Array<NotificationSubscriptionsEdge>;
	/** A list of `NotificationSubscription` objects. */
	nodes: Array<NotificationSubscription>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `NotificationSubscription` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `NotificationSubscription` edge in the connection. */
export type NotificationSubscriptionsEdge = {
	__typename: 'NotificationSubscriptionsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `NotificationSubscription` at the end of the edge. */
	node: NotificationSubscription;
};

/** Methods to use when ordering `NotificationSubscription`. */
export type NotificationSubscriptionsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

export type NotificationTemplate = Node & {
	__typename: 'NotificationTemplate';
	actionUrlTemplate: Maybe<Scalars['String']['output']>;
	bodyTemplate: Scalars['String']['output'];
	category: NotificationCategory;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	defaultChannels: Maybe<Array<Maybe<NotificationChannel>>>;
	defaultPriority: Maybe<NotificationPriority>;
	description: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	name: Scalars['String']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads a single `NotificationTemplate` that is related to this `NotificationTemplate`. */
	notificationTemplateByPreviousVersionId: Maybe<NotificationTemplate>;
	/** Reads and enables pagination through a set of `NotificationTemplate`. */
	notificationTemplatesByPreviousVersionId: NotificationTemplatesConnection;
	previousVersionId: Maybe<Scalars['UUID']['output']>;
	subjectTemplate: Scalars['String']['output'];
	templateKey: Scalars['String']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `NotificationTemplate`. */
	userByCreatedBy: Maybe<User>;
	version: Maybe<Scalars['Int']['output']>;
};

export type NotificationTemplateNotificationTemplatesByPreviousVersionIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationTemplateCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationTemplatesOrderBy>>;
};

/**
 * A condition to be used against `NotificationTemplate` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type NotificationTemplateCondition = {
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `previousVersionId` field. */
	previousVersionId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `templateKey` field. */
	templateKey?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `NotificationTemplate` */
export type NotificationTemplateInput = {
	actionUrlTemplate?: InputMaybe<Scalars['String']['input']>;
	bodyTemplate: Scalars['String']['input'];
	category: NotificationCategory;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	defaultChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	defaultPriority?: InputMaybe<NotificationPriority>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	name: Scalars['String']['input'];
	previousVersionId?: InputMaybe<Scalars['UUID']['input']>;
	subjectTemplate: Scalars['String']['input'];
	templateKey: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	version?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents an update to a `NotificationTemplate`. Fields that are set will be updated. */
export type NotificationTemplatePatch = {
	actionUrlTemplate?: InputMaybe<Scalars['String']['input']>;
	bodyTemplate?: InputMaybe<Scalars['String']['input']>;
	category?: InputMaybe<NotificationCategory>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	defaultChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	defaultPriority?: InputMaybe<NotificationPriority>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	name?: InputMaybe<Scalars['String']['input']>;
	previousVersionId?: InputMaybe<Scalars['UUID']['input']>;
	subjectTemplate?: InputMaybe<Scalars['String']['input']>;
	templateKey?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	version?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of `NotificationTemplate` values. */
export type NotificationTemplatesConnection = {
	__typename: 'NotificationTemplatesConnection';
	/** A list of edges which contains the `NotificationTemplate` and cursor to aid in pagination. */
	edges: Array<NotificationTemplatesEdge>;
	/** A list of `NotificationTemplate` objects. */
	nodes: Array<NotificationTemplate>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `NotificationTemplate` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `NotificationTemplate` edge in the connection. */
export type NotificationTemplatesEdge = {
	__typename: 'NotificationTemplatesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `NotificationTemplate` at the end of the edge. */
	node: NotificationTemplate;
};

/** Methods to use when ordering `NotificationTemplate`. */
export type NotificationTemplatesOrderBy =
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PREVIOUS_VERSION_ID_ASC'
	| 'PREVIOUS_VERSION_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'TEMPLATE_KEY_ASC'
	| 'TEMPLATE_KEY_DESC';

/** A connection to a list of `Notification` values. */
export type NotificationsConnection = {
	__typename: 'NotificationsConnection';
	/** A list of edges which contains the `Notification` and cursor to aid in pagination. */
	edges: Array<NotificationsEdge>;
	/** A list of `Notification` objects. */
	nodes: Array<Notification>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `Notification` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `Notification` edge in the connection. */
export type NotificationsEdge = {
	__typename: 'NotificationsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `Notification` at the end of the edge. */
	node: Notification;
};

/** Methods to use when ordering `Notification`. */
export type NotificationsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PARENT_NOTIFICATION_ID_ASC'
	| 'PARENT_NOTIFICATION_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** Information about pagination in a connection. */
export type PageInfo = {
	__typename: 'PageInfo';
	/** When paginating forwards, the cursor to continue. */
	endCursor: Maybe<Scalars['Cursor']['output']>;
	/** When paginating forwards, are there more items? */
	hasNextPage: Scalars['Boolean']['output'];
	/** When paginating backwards, are there more items? */
	hasPreviousPage: Scalars['Boolean']['output'];
	/** When paginating backwards, the cursor to continue. */
	startCursor: Maybe<Scalars['Cursor']['output']>;
};

/** A connection to a list of `PasswordPolicy` values. */
export type PasswordPoliciesConnection = {
	__typename: 'PasswordPoliciesConnection';
	/** A list of edges which contains the `PasswordPolicy` and cursor to aid in pagination. */
	edges: Array<PasswordPoliciesEdge>;
	/** A list of `PasswordPolicy` objects. */
	nodes: Array<PasswordPolicy>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `PasswordPolicy` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `PasswordPolicy` edge in the connection. */
export type PasswordPoliciesEdge = {
	__typename: 'PasswordPoliciesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `PasswordPolicy` at the end of the edge. */
	node: PasswordPolicy;
};

/** Methods to use when ordering `PasswordPolicy`. */
export type PasswordPoliciesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'POLICY_NAME_ASC'
	| 'POLICY_NAME_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** Password security policies and requirements */
export type PasswordPolicy = Node & {
	__typename: 'PasswordPolicy';
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	description: Maybe<Scalars['String']['output']>;
	dictionaryCheck: Maybe<Scalars['Boolean']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	lockoutDurationMinutes: Maybe<Scalars['Int']['output']>;
	maxAgeDays: Maybe<Scalars['Int']['output']>;
	maxFailedAttempts: Maybe<Scalars['Int']['output']>;
	maxLength: Maybe<Scalars['Int']['output']>;
	minAgeHours: Maybe<Scalars['Int']['output']>;
	minComplexityScore: Maybe<Scalars['Int']['output']>;
	minLength: Maybe<Scalars['Int']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	passwordHistoryCount: Maybe<Scalars['Int']['output']>;
	personalInfoCheck: Maybe<Scalars['Boolean']['output']>;
	policyName: Scalars['String']['output'];
	progressiveLockout: Maybe<Scalars['Boolean']['output']>;
	requireLowercase: Maybe<Scalars['Boolean']['output']>;
	requireNumbers: Maybe<Scalars['Boolean']['output']>;
	requireSpecialChars: Maybe<Scalars['Boolean']['output']>;
	requireUppercase: Maybe<Scalars['Boolean']['output']>;
	specialCharsAllowed: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `PasswordPolicy` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type PasswordPolicyCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `policyName` field. */
	policyName?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `PasswordPolicy` */
export type PasswordPolicyInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	description?: InputMaybe<Scalars['String']['input']>;
	dictionaryCheck?: InputMaybe<Scalars['Boolean']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	lockoutDurationMinutes?: InputMaybe<Scalars['Int']['input']>;
	maxAgeDays?: InputMaybe<Scalars['Int']['input']>;
	maxFailedAttempts?: InputMaybe<Scalars['Int']['input']>;
	maxLength?: InputMaybe<Scalars['Int']['input']>;
	minAgeHours?: InputMaybe<Scalars['Int']['input']>;
	minComplexityScore?: InputMaybe<Scalars['Int']['input']>;
	minLength?: InputMaybe<Scalars['Int']['input']>;
	passwordHistoryCount?: InputMaybe<Scalars['Int']['input']>;
	personalInfoCheck?: InputMaybe<Scalars['Boolean']['input']>;
	policyName: Scalars['String']['input'];
	progressiveLockout?: InputMaybe<Scalars['Boolean']['input']>;
	requireLowercase?: InputMaybe<Scalars['Boolean']['input']>;
	requireNumbers?: InputMaybe<Scalars['Boolean']['input']>;
	requireSpecialChars?: InputMaybe<Scalars['Boolean']['input']>;
	requireUppercase?: InputMaybe<Scalars['Boolean']['input']>;
	specialCharsAllowed?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `PasswordPolicy`. Fields that are set will be updated. */
export type PasswordPolicyPatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	dictionaryCheck?: InputMaybe<Scalars['Boolean']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	lockoutDurationMinutes?: InputMaybe<Scalars['Int']['input']>;
	maxAgeDays?: InputMaybe<Scalars['Int']['input']>;
	maxFailedAttempts?: InputMaybe<Scalars['Int']['input']>;
	maxLength?: InputMaybe<Scalars['Int']['input']>;
	minAgeHours?: InputMaybe<Scalars['Int']['input']>;
	minComplexityScore?: InputMaybe<Scalars['Int']['input']>;
	minLength?: InputMaybe<Scalars['Int']['input']>;
	passwordHistoryCount?: InputMaybe<Scalars['Int']['input']>;
	personalInfoCheck?: InputMaybe<Scalars['Boolean']['input']>;
	policyName?: InputMaybe<Scalars['String']['input']>;
	progressiveLockout?: InputMaybe<Scalars['Boolean']['input']>;
	requireLowercase?: InputMaybe<Scalars['Boolean']['input']>;
	requireNumbers?: InputMaybe<Scalars['Boolean']['input']>;
	requireSpecialChars?: InputMaybe<Scalars['Boolean']['input']>;
	requireUppercase?: InputMaybe<Scalars['Boolean']['input']>;
	specialCharsAllowed?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

export type PayFrequency =
	| 'ANNUALLY'
	| 'BI_WEEKLY'
	| 'MONTHLY'
	| 'QUARTERLY'
	| 'SEMI_MONTHLY'
	| 'WEEKLY';

/** Payroll processing periods with status and totals */
export type PayrollPeriod = Node & {
	__typename: 'PayrollPeriod';
	approvedAt: Maybe<Scalars['Datetime']['output']>;
	approvedBy: Maybe<Scalars['UUID']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	/** Number of employees included in this payroll run */
	employeeCount: Maybe<Scalars['Int']['output']>;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	payDate: Scalars['Date']['output'];
	payFrequency: PayFrequency;
	periodEndDate: Scalars['Date']['output'];
	periodName: Scalars['String']['output'];
	periodStartDate: Scalars['Date']['output'];
	processedAt: Maybe<Scalars['Datetime']['output']>;
	processedBy: Maybe<Scalars['UUID']['output']>;
	status: Maybe<PayrollStatus>;
	/** Total gross amount for all employees in this payroll period */
	totalGrossAmount: Maybe<Scalars['BigFloat']['output']>;
	totalNetAmount: Maybe<Scalars['BigFloat']['output']>;
	totalTaxAmount: Maybe<Scalars['BigFloat']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByApprovedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByProcessedBy: Maybe<User>;
};

/**
 * A condition to be used against `PayrollPeriod` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type PayrollPeriodCondition = {
	/** Checks for equality with the object’s `approvedBy` field. */
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `payDate` field. */
	payDate?: InputMaybe<Scalars['Date']['input']>;
	/** Checks for equality with the object’s `payFrequency` field. */
	payFrequency?: InputMaybe<PayFrequency>;
	/** Checks for equality with the object’s `processedBy` field. */
	processedBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<PayrollStatus>;
};

/** An input for mutations affecting `PayrollPeriod` */
export type PayrollPeriodInput = {
	approvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	/** Number of employees included in this payroll run */
	employeeCount?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	payDate: Scalars['Date']['input'];
	payFrequency: PayFrequency;
	periodEndDate: Scalars['Date']['input'];
	periodName: Scalars['String']['input'];
	periodStartDate: Scalars['Date']['input'];
	processedAt?: InputMaybe<Scalars['Datetime']['input']>;
	processedBy?: InputMaybe<Scalars['UUID']['input']>;
	status?: InputMaybe<PayrollStatus>;
	/** Total gross amount for all employees in this payroll period */
	totalGrossAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	totalNetAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	totalTaxAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `PayrollPeriod`. Fields that are set will be updated. */
export type PayrollPeriodPatch = {
	approvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Number of employees included in this payroll run */
	employeeCount?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	payDate?: InputMaybe<Scalars['Date']['input']>;
	payFrequency?: InputMaybe<PayFrequency>;
	periodEndDate?: InputMaybe<Scalars['Date']['input']>;
	periodName?: InputMaybe<Scalars['String']['input']>;
	periodStartDate?: InputMaybe<Scalars['Date']['input']>;
	processedAt?: InputMaybe<Scalars['Datetime']['input']>;
	processedBy?: InputMaybe<Scalars['UUID']['input']>;
	status?: InputMaybe<PayrollStatus>;
	/** Total gross amount for all employees in this payroll period */
	totalGrossAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	totalNetAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	totalTaxAmount?: InputMaybe<Scalars['BigFloat']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `PayrollPeriod` values. */
export type PayrollPeriodsConnection = {
	__typename: 'PayrollPeriodsConnection';
	/** A list of edges which contains the `PayrollPeriod` and cursor to aid in pagination. */
	edges: Array<PayrollPeriodsEdge>;
	/** A list of `PayrollPeriod` objects. */
	nodes: Array<PayrollPeriod>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `PayrollPeriod` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `PayrollPeriod` edge in the connection. */
export type PayrollPeriodsEdge = {
	__typename: 'PayrollPeriodsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `PayrollPeriod` at the end of the edge. */
	node: PayrollPeriod;
};

/** Methods to use when ordering `PayrollPeriod`. */
export type PayrollPeriodsOrderBy =
	| 'APPROVED_BY_ASC'
	| 'APPROVED_BY_DESC'
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PAY_DATE_ASC'
	| 'PAY_DATE_DESC'
	| 'PAY_FREQUENCY_ASC'
	| 'PAY_FREQUENCY_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'PROCESSED_BY_ASC'
	| 'PROCESSED_BY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC';

export type PayrollStatus = 'APPROVED' | 'CANCELLED' | 'DRAFT' | 'ERROR' | 'PAID' | 'PROCESSING';

/** Employee performance reviews with ratings and feedback */
export type PerformanceReview = Node & {
	__typename: 'PerformanceReview';
	/** Reads and enables pagination through a set of `CompetencyRating`. */
	competencyRatingsByReviewId: CompetencyRatingsConnection;
	completedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	cycleId: Scalars['UUID']['output'];
	employeeAchievements: Maybe<Scalars['String']['output']>;
	employeeAcknowledgmentDate: Maybe<Scalars['Date']['output']>;
	employeeChallenges: Maybe<Scalars['String']['output']>;
	/** Reads and enables pagination through a set of `EmployeeGoal`. */
	employeeGoalsByReviewId: EmployeeGoalsConnection;
	employeeGoalsNextPeriod: Maybe<Scalars['String']['output']>;
	employeeId: Scalars['UUID']['output'];
	employeeSelfAssessment: Maybe<Scalars['String']['output']>;
	employeeSubmittedAt: Maybe<Scalars['Datetime']['output']>;
	hrApprovedAt: Maybe<Scalars['Datetime']['output']>;
	hrNotes: Maybe<Scalars['String']['output']>;
	hrReviewerId: Maybe<Scalars['UUID']['output']>;
	id: Scalars['UUID']['output'];
	managerAssessment: Maybe<Scalars['String']['output']>;
	managerDevelopmentAreas: Maybe<Scalars['String']['output']>;
	managerFeedback: Maybe<Scalars['String']['output']>;
	managerId: Scalars['UUID']['output'];
	managerRecommendations: Maybe<Scalars['String']['output']>;
	managerSubmittedAt: Maybe<Scalars['Datetime']['output']>;
	meetingDate: Maybe<Scalars['Date']['output']>;
	meetingNotes: Maybe<Scalars['String']['output']>;
	nextReviewDate: Maybe<Scalars['Date']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Overall performance rating on 1.0-5.0 scale */
	overallRating: Maybe<Scalars['BigFloat']['output']>;
	/** Reads a single `ReviewCycle` that is related to this `PerformanceReview`. */
	reviewCycleByCycleId: Maybe<ReviewCycle>;
	status: Maybe<ReviewStatus>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByHrReviewerId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByManagerId: Maybe<User>;
};

/** Employee performance reviews with ratings and feedback */
export type PerformanceReviewCompetencyRatingsByReviewIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<CompetencyRatingCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<CompetencyRatingsOrderBy>>;
};

/** Employee performance reviews with ratings and feedback */
export type PerformanceReviewEmployeeGoalsByReviewIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeGoalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** Performance review cycle statistics and ratings */
export type PerformanceReviewAnalytic = {
	__typename: 'PerformanceReviewAnalytic';
	avgCompletionDays: Maybe<Scalars['BigFloat']['output']>;
	avgOverallRating: Maybe<Scalars['BigFloat']['output']>;
	belowExpectationsCount: Maybe<Scalars['BigInt']['output']>;
	completedReviews: Maybe<Scalars['BigInt']['output']>;
	completionRatePercent: Maybe<Scalars['BigFloat']['output']>;
	cycleId: Maybe<Scalars['UUID']['output']>;
	cycleName: Maybe<Scalars['String']['output']>;
	cycleType: Maybe<Scalars['String']['output']>;
	employeeSubmittedReviews: Maybe<Scalars['BigInt']['output']>;
	endDate: Maybe<Scalars['Date']['output']>;
	exceedsExpectationsCount: Maybe<Scalars['BigInt']['output']>;
	inProgressReviews: Maybe<Scalars['BigInt']['output']>;
	isActive: Maybe<Scalars['Boolean']['output']>;
	managerReviewReviews: Maybe<Scalars['BigInt']['output']>;
	maxOverallRating: Maybe<Scalars['BigFloat']['output']>;
	meetsExpectationsCount: Maybe<Scalars['BigInt']['output']>;
	minOverallRating: Maybe<Scalars['BigFloat']['output']>;
	notStartedReviews: Maybe<Scalars['BigInt']['output']>;
	outstandingCount: Maybe<Scalars['BigInt']['output']>;
	reviewDueDate: Maybe<Scalars['Date']['output']>;
	startDate: Maybe<Scalars['Date']['output']>;
	totalReviews: Maybe<Scalars['BigInt']['output']>;
};

/** A connection to a list of `PerformanceReviewAnalytic` values. */
export type PerformanceReviewAnalyticsConnection = {
	__typename: 'PerformanceReviewAnalyticsConnection';
	/** A list of edges which contains the `PerformanceReviewAnalytic` and cursor to aid in pagination. */
	edges: Array<PerformanceReviewAnalyticsEdge>;
	/** A list of `PerformanceReviewAnalytic` objects. */
	nodes: Array<PerformanceReviewAnalytic>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `PerformanceReviewAnalytic` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `PerformanceReviewAnalytic` edge in the connection. */
export type PerformanceReviewAnalyticsEdge = {
	__typename: 'PerformanceReviewAnalyticsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `PerformanceReviewAnalytic` at the end of the edge. */
	node: PerformanceReviewAnalytic;
};

/** Methods to use when ordering `PerformanceReviewAnalytic`. */
export type PerformanceReviewAnalyticsOrderBy = 'NATURAL';

/**
 * A condition to be used against `PerformanceReview` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type PerformanceReviewCondition = {
	/** Checks for equality with the object’s `cycleId` field. */
	cycleId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `employeeId` field. */
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `hrReviewerId` field. */
	hrReviewerId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `managerId` field. */
	managerId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `PerformanceReview` */
export type PerformanceReviewInput = {
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	cycleId: Scalars['UUID']['input'];
	employeeAchievements?: InputMaybe<Scalars['String']['input']>;
	employeeAcknowledgmentDate?: InputMaybe<Scalars['Date']['input']>;
	employeeChallenges?: InputMaybe<Scalars['String']['input']>;
	employeeGoalsNextPeriod?: InputMaybe<Scalars['String']['input']>;
	employeeId: Scalars['UUID']['input'];
	employeeSelfAssessment?: InputMaybe<Scalars['String']['input']>;
	employeeSubmittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	hrApprovedAt?: InputMaybe<Scalars['Datetime']['input']>;
	hrNotes?: InputMaybe<Scalars['String']['input']>;
	hrReviewerId?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	managerAssessment?: InputMaybe<Scalars['String']['input']>;
	managerDevelopmentAreas?: InputMaybe<Scalars['String']['input']>;
	managerFeedback?: InputMaybe<Scalars['String']['input']>;
	managerId: Scalars['UUID']['input'];
	managerRecommendations?: InputMaybe<Scalars['String']['input']>;
	managerSubmittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	meetingDate?: InputMaybe<Scalars['Date']['input']>;
	meetingNotes?: InputMaybe<Scalars['String']['input']>;
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	/** Overall performance rating on 1.0-5.0 scale */
	overallRating?: InputMaybe<Scalars['BigFloat']['input']>;
	status?: InputMaybe<ReviewStatus>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `PerformanceReview`. Fields that are set will be updated. */
export type PerformanceReviewPatch = {
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	cycleId?: InputMaybe<Scalars['UUID']['input']>;
	employeeAchievements?: InputMaybe<Scalars['String']['input']>;
	employeeAcknowledgmentDate?: InputMaybe<Scalars['Date']['input']>;
	employeeChallenges?: InputMaybe<Scalars['String']['input']>;
	employeeGoalsNextPeriod?: InputMaybe<Scalars['String']['input']>;
	employeeId?: InputMaybe<Scalars['UUID']['input']>;
	employeeSelfAssessment?: InputMaybe<Scalars['String']['input']>;
	employeeSubmittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	hrApprovedAt?: InputMaybe<Scalars['Datetime']['input']>;
	hrNotes?: InputMaybe<Scalars['String']['input']>;
	hrReviewerId?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	managerAssessment?: InputMaybe<Scalars['String']['input']>;
	managerDevelopmentAreas?: InputMaybe<Scalars['String']['input']>;
	managerFeedback?: InputMaybe<Scalars['String']['input']>;
	managerId?: InputMaybe<Scalars['UUID']['input']>;
	managerRecommendations?: InputMaybe<Scalars['String']['input']>;
	managerSubmittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	meetingDate?: InputMaybe<Scalars['Date']['input']>;
	meetingNotes?: InputMaybe<Scalars['String']['input']>;
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	/** Overall performance rating on 1.0-5.0 scale */
	overallRating?: InputMaybe<Scalars['BigFloat']['input']>;
	status?: InputMaybe<ReviewStatus>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `PerformanceReview` values. */
export type PerformanceReviewsConnection = {
	__typename: 'PerformanceReviewsConnection';
	/** A list of edges which contains the `PerformanceReview` and cursor to aid in pagination. */
	edges: Array<PerformanceReviewsEdge>;
	/** A list of `PerformanceReview` objects. */
	nodes: Array<PerformanceReview>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `PerformanceReview` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `PerformanceReview` edge in the connection. */
export type PerformanceReviewsEdge = {
	__typename: 'PerformanceReviewsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `PerformanceReview` at the end of the edge. */
	node: PerformanceReview;
};

/** Methods to use when ordering `PerformanceReview`. */
export type PerformanceReviewsOrderBy =
	| 'CYCLE_ID_ASC'
	| 'CYCLE_ID_DESC'
	| 'EMPLOYEE_ID_ASC'
	| 'EMPLOYEE_ID_DESC'
	| 'HR_REVIEWER_ID_ASC'
	| 'HR_REVIEWER_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'MANAGER_ID_ASC'
	| 'MANAGER_ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** GDPR Article 35 Data Protection Impact Assessments (DPIA) */
export type PrivacyImpactAssessment = Node & {
	__typename: 'PrivacyImpactAssessment';
	actionPlan: Maybe<Scalars['String']['output']>;
	approvedBy: Maybe<Scalars['UUID']['output']>;
	assessmentDate: Scalars['Date']['output'];
	assessmentOutcome: Maybe<Scalars['String']['output']>;
	assessmentReference: Scalars['String']['output'];
	assessmentReportPath: Maybe<Scalars['String']['output']>;
	assessmentTitle: Scalars['String']['output'];
	assessmentType: Maybe<Scalars['String']['output']>;
	conductedBy: Scalars['UUID']['output'];
	consultationMethods: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	dataController: Maybe<Scalars['String']['output']>;
	dataProcessor: Maybe<Scalars['String']['output']>;
	dataSubjectsCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	dataSubjectsConsulted: Maybe<Scalars['Boolean']['output']>;
	feedbackReceived: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	legalBasis: Maybe<Scalars['String']['output']>;
	monitoringRequirements: Maybe<Scalars['String']['output']>;
	nextReviewDue: Maybe<Scalars['Date']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	organizationalMeasures: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	overallRiskLevel: Maybe<Scalars['String']['output']>;
	personalDataCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	privacyRisksIdentified: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	processDescription: Maybe<Scalars['String']['output']>;
	processingPurposes: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	projectName: Maybe<Scalars['String']['output']>;
	recommendations: Maybe<Scalars['String']['output']>;
	reviewDate: Maybe<Scalars['Date']['output']>;
	reviewedBy: Maybe<Scalars['UUID']['output']>;
	riskImpact: Maybe<Scalars['String']['output']>;
	riskLikelihood: Maybe<Scalars['String']['output']>;
	safeguardsImplemented: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	specialCategoryData: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	stakeholdersConsulted: Maybe<Scalars['JSON']['output']>;
	status: Maybe<Scalars['String']['output']>;
	supportingDocuments: Maybe<Scalars['JSON']['output']>;
	technicalMeasures: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `PrivacyImpactAssessment` object types. All
 * fields are tested for equality and combined with a logical ‘and.’
 */
export type PrivacyImpactAssessmentCondition = {
	/** Checks for equality with the object’s `assessmentReference` field. */
	assessmentReference?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `overallRiskLevel` field. */
	overallRiskLevel?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `PrivacyImpactAssessment` */
export type PrivacyImpactAssessmentInput = {
	actionPlan?: InputMaybe<Scalars['String']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	assessmentDate: Scalars['Date']['input'];
	assessmentOutcome?: InputMaybe<Scalars['String']['input']>;
	assessmentReference: Scalars['String']['input'];
	assessmentReportPath?: InputMaybe<Scalars['String']['input']>;
	assessmentTitle: Scalars['String']['input'];
	assessmentType?: InputMaybe<Scalars['String']['input']>;
	conductedBy: Scalars['UUID']['input'];
	consultationMethods?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataController?: InputMaybe<Scalars['String']['input']>;
	dataProcessor?: InputMaybe<Scalars['String']['input']>;
	dataSubjectsCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	dataSubjectsConsulted?: InputMaybe<Scalars['Boolean']['input']>;
	feedbackReceived?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	monitoringRequirements?: InputMaybe<Scalars['String']['input']>;
	nextReviewDue?: InputMaybe<Scalars['Date']['input']>;
	organizationalMeasures?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	overallRiskLevel?: InputMaybe<Scalars['String']['input']>;
	personalDataCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	privacyRisksIdentified?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	processDescription?: InputMaybe<Scalars['String']['input']>;
	processingPurposes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	projectName?: InputMaybe<Scalars['String']['input']>;
	recommendations?: InputMaybe<Scalars['String']['input']>;
	reviewDate?: InputMaybe<Scalars['Date']['input']>;
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	riskImpact?: InputMaybe<Scalars['String']['input']>;
	riskLikelihood?: InputMaybe<Scalars['String']['input']>;
	safeguardsImplemented?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	specialCategoryData?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	stakeholdersConsulted?: InputMaybe<Scalars['JSON']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	supportingDocuments?: InputMaybe<Scalars['JSON']['input']>;
	technicalMeasures?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `PrivacyImpactAssessment`. Fields that are set will be updated. */
export type PrivacyImpactAssessmentPatch = {
	actionPlan?: InputMaybe<Scalars['String']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	assessmentDate?: InputMaybe<Scalars['Date']['input']>;
	assessmentOutcome?: InputMaybe<Scalars['String']['input']>;
	assessmentReference?: InputMaybe<Scalars['String']['input']>;
	assessmentReportPath?: InputMaybe<Scalars['String']['input']>;
	assessmentTitle?: InputMaybe<Scalars['String']['input']>;
	assessmentType?: InputMaybe<Scalars['String']['input']>;
	conductedBy?: InputMaybe<Scalars['UUID']['input']>;
	consultationMethods?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataController?: InputMaybe<Scalars['String']['input']>;
	dataProcessor?: InputMaybe<Scalars['String']['input']>;
	dataSubjectsCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	dataSubjectsConsulted?: InputMaybe<Scalars['Boolean']['input']>;
	feedbackReceived?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	monitoringRequirements?: InputMaybe<Scalars['String']['input']>;
	nextReviewDue?: InputMaybe<Scalars['Date']['input']>;
	organizationalMeasures?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	overallRiskLevel?: InputMaybe<Scalars['String']['input']>;
	personalDataCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	privacyRisksIdentified?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	processDescription?: InputMaybe<Scalars['String']['input']>;
	processingPurposes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	projectName?: InputMaybe<Scalars['String']['input']>;
	recommendations?: InputMaybe<Scalars['String']['input']>;
	reviewDate?: InputMaybe<Scalars['Date']['input']>;
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	riskImpact?: InputMaybe<Scalars['String']['input']>;
	riskLikelihood?: InputMaybe<Scalars['String']['input']>;
	safeguardsImplemented?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	specialCategoryData?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	stakeholdersConsulted?: InputMaybe<Scalars['JSON']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	supportingDocuments?: InputMaybe<Scalars['JSON']['input']>;
	technicalMeasures?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `PrivacyImpactAssessment` values. */
export type PrivacyImpactAssessmentsConnection = {
	__typename: 'PrivacyImpactAssessmentsConnection';
	/** A list of edges which contains the `PrivacyImpactAssessment` and cursor to aid in pagination. */
	edges: Array<PrivacyImpactAssessmentsEdge>;
	/** A list of `PrivacyImpactAssessment` objects. */
	nodes: Array<PrivacyImpactAssessment>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `PrivacyImpactAssessment` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `PrivacyImpactAssessment` edge in the connection. */
export type PrivacyImpactAssessmentsEdge = {
	__typename: 'PrivacyImpactAssessmentsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `PrivacyImpactAssessment` at the end of the edge. */
	node: PrivacyImpactAssessment;
};

/** Methods to use when ordering `PrivacyImpactAssessment`. */
export type PrivacyImpactAssessmentsOrderBy =
	| 'ASSESSMENT_REFERENCE_ASC'
	| 'ASSESSMENT_REFERENCE_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'OVERALL_RISK_LEVEL_ASC'
	| 'OVERALL_RISK_LEVEL_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC';

/** GDPR/CCPA privacy request management and processing */
export type PrivacyRequest = Node & {
	__typename: 'PrivacyRequest';
	assignedTo: Maybe<Scalars['UUID']['output']>;
	communicationLog: Maybe<Scalars['JSON']['output']>;
	completedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	escalationRequired: Maybe<Scalars['Boolean']['output']>;
	exemptionsClaimed: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	externalLegalReview: Maybe<Scalars['Boolean']['output']>;
	id: Scalars['UUID']['output'];
	identityVerificationMethod: Maybe<Scalars['String']['output']>;
	identityVerified: Maybe<Scalars['Boolean']['output']>;
	legalBasisForProcessing: Maybe<Scalars['String']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	notes: Maybe<Scalars['String']['output']>;
	priority: Maybe<Scalars['String']['output']>;
	reasonForRequest: Maybe<Scalars['String']['output']>;
	requestNumber: Scalars['String']['output'];
	requestType: PrivacyRequestType;
	requesterEmail: Scalars['String']['output'];
	requesterName: Maybe<Scalars['String']['output']>;
	responseData: Maybe<Scalars['JSON']['output']>;
	responseDueDate: Scalars['Date']['output'];
	responseFormat: Maybe<Scalars['String']['output']>;
	specificDataRequested: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	status: Maybe<Scalars['String']['output']>;
	subjectMatter: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByAssignedTo: Maybe<User>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByUserId: Maybe<User>;
	userId: Maybe<Scalars['UUID']['output']>;
	verificationDocuments: Maybe<Scalars['JSON']['output']>;
	verifiedAt: Maybe<Scalars['Datetime']['output']>;
	verifiedBy: Maybe<Scalars['UUID']['output']>;
};

/**
 * A condition to be used against `PrivacyRequest` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type PrivacyRequestCondition = {
	/** Checks for equality with the object’s `assignedTo` field. */
	assignedTo?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `requestNumber` field. */
	requestNumber?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `PrivacyRequest` */
export type PrivacyRequestInput = {
	assignedTo?: InputMaybe<Scalars['UUID']['input']>;
	communicationLog?: InputMaybe<Scalars['JSON']['input']>;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	escalationRequired?: InputMaybe<Scalars['Boolean']['input']>;
	exemptionsClaimed?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	externalLegalReview?: InputMaybe<Scalars['Boolean']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	identityVerificationMethod?: InputMaybe<Scalars['String']['input']>;
	identityVerified?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasisForProcessing?: InputMaybe<Scalars['String']['input']>;
	notes?: InputMaybe<Scalars['String']['input']>;
	priority?: InputMaybe<Scalars['String']['input']>;
	reasonForRequest?: InputMaybe<Scalars['String']['input']>;
	requestNumber: Scalars['String']['input'];
	requestType: PrivacyRequestType;
	requesterEmail: Scalars['String']['input'];
	requesterName?: InputMaybe<Scalars['String']['input']>;
	responseData?: InputMaybe<Scalars['JSON']['input']>;
	responseDueDate: Scalars['Date']['input'];
	responseFormat?: InputMaybe<Scalars['String']['input']>;
	specificDataRequested?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	status?: InputMaybe<Scalars['String']['input']>;
	subjectMatter?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	verificationDocuments?: InputMaybe<Scalars['JSON']['input']>;
	verifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	verifiedBy?: InputMaybe<Scalars['UUID']['input']>;
};

/** Represents an update to a `PrivacyRequest`. Fields that are set will be updated. */
export type PrivacyRequestPatch = {
	assignedTo?: InputMaybe<Scalars['UUID']['input']>;
	communicationLog?: InputMaybe<Scalars['JSON']['input']>;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	escalationRequired?: InputMaybe<Scalars['Boolean']['input']>;
	exemptionsClaimed?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	externalLegalReview?: InputMaybe<Scalars['Boolean']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	identityVerificationMethod?: InputMaybe<Scalars['String']['input']>;
	identityVerified?: InputMaybe<Scalars['Boolean']['input']>;
	legalBasisForProcessing?: InputMaybe<Scalars['String']['input']>;
	notes?: InputMaybe<Scalars['String']['input']>;
	priority?: InputMaybe<Scalars['String']['input']>;
	reasonForRequest?: InputMaybe<Scalars['String']['input']>;
	requestNumber?: InputMaybe<Scalars['String']['input']>;
	requestType?: InputMaybe<PrivacyRequestType>;
	requesterEmail?: InputMaybe<Scalars['String']['input']>;
	requesterName?: InputMaybe<Scalars['String']['input']>;
	responseData?: InputMaybe<Scalars['JSON']['input']>;
	responseDueDate?: InputMaybe<Scalars['Date']['input']>;
	responseFormat?: InputMaybe<Scalars['String']['input']>;
	specificDataRequested?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	status?: InputMaybe<Scalars['String']['input']>;
	subjectMatter?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	verificationDocuments?: InputMaybe<Scalars['JSON']['input']>;
	verifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	verifiedBy?: InputMaybe<Scalars['UUID']['input']>;
};

export type PrivacyRequestType =
	| 'ACCESS'
	| 'AUTOMATED_DECISION_OPT_OUT'
	| 'ERASURE'
	| 'OBJECTION'
	| 'PORTABILITY'
	| 'RECTIFICATION'
	| 'RESTRICTION';

/** A connection to a list of `PrivacyRequest` values. */
export type PrivacyRequestsConnection = {
	__typename: 'PrivacyRequestsConnection';
	/** A list of edges which contains the `PrivacyRequest` and cursor to aid in pagination. */
	edges: Array<PrivacyRequestsEdge>;
	/** A list of `PrivacyRequest` objects. */
	nodes: Array<PrivacyRequest>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `PrivacyRequest` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `PrivacyRequest` edge in the connection. */
export type PrivacyRequestsEdge = {
	__typename: 'PrivacyRequestsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `PrivacyRequest` at the end of the edge. */
	node: PrivacyRequest;
};

/** Methods to use when ordering `PrivacyRequest`. */
export type PrivacyRequestsOrderBy =
	| 'ASSIGNED_TO_ASC'
	| 'ASSIGNED_TO_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'REQUEST_NUMBER_ASC'
	| 'REQUEST_NUMBER_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** All input for the `processErasureRequest` mutation. */
export type ProcessErasureRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pErasureScope?: InputMaybe<Scalars['JSON']['input']>;
	pLegalExemptions?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	pPartialErasure?: InputMaybe<Scalars['Boolean']['input']>;
	pRetainAggregatedData?: InputMaybe<Scalars['Boolean']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `processErasureRequest` mutation. */
export type ProcessErasureRequestPayload = {
	__typename: 'ProcessErasureRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	erasureRequestId: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** A connection to a list of `ProcessingActivity` values. */
export type ProcessingActivitiesConnection = {
	__typename: 'ProcessingActivitiesConnection';
	/** A list of edges which contains the `ProcessingActivity` and cursor to aid in pagination. */
	edges: Array<ProcessingActivitiesEdge>;
	/** A list of `ProcessingActivity` objects. */
	nodes: Array<ProcessingActivity>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `ProcessingActivity` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `ProcessingActivity` edge in the connection. */
export type ProcessingActivitiesEdge = {
	__typename: 'ProcessingActivitiesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `ProcessingActivity` at the end of the edge. */
	node: ProcessingActivity;
};

/** Methods to use when ordering `ProcessingActivity`. */
export type ProcessingActivitiesOrderBy =
	| 'ACTIVITY_CATEGORY_ASC'
	| 'ACTIVITY_CATEGORY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'NEXT_REVIEW_DATE_ASC'
	| 'NEXT_REVIEW_DATE_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** GDPR Article 30 data processing activities register */
export type ProcessingActivity = Node & {
	__typename: 'ProcessingActivity';
	activityCategory: Maybe<Scalars['String']['output']>;
	activityDescription: Maybe<Scalars['String']['output']>;
	activityName: Scalars['String']['output'];
	approvedAt: Maybe<Scalars['Datetime']['output']>;
	approvedBy: Maybe<Scalars['UUID']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	dataController: Scalars['String']['output'];
	dataProcessor: Maybe<Scalars['String']['output']>;
	dataSubjectCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	dataSubjectRights: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	deletionProcedures: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	jointControllers: Maybe<Scalars['JSON']['output']>;
	legalBasis: Scalars['String']['output'];
	legitimateInterests: Maybe<Scalars['String']['output']>;
	nextReviewDate: Maybe<Scalars['Date']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	organizationalMeasures: Maybe<Scalars['String']['output']>;
	personalDataCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	purposeOfProcessing: Scalars['String']['output'];
	recipientCategories: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	retentionPeriod: Maybe<Scalars['String']['output']>;
	reviewedAt: Maybe<Scalars['Datetime']['output']>;
	reviewedBy: Maybe<Scalars['UUID']['output']>;
	specialCategoryData: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	technicalMeasures: Maybe<Scalars['String']['output']>;
	thirdCountryTransfers: Maybe<Scalars['Boolean']['output']>;
	transferCountries: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	transferSafeguards: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `ProcessingActivity` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type ProcessingActivityCondition = {
	/** Checks for equality with the object’s `activityCategory` field. */
	activityCategory?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `nextReviewDate` field. */
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
};

/** An input for mutations affecting `ProcessingActivity` */
export type ProcessingActivityInput = {
	activityCategory?: InputMaybe<Scalars['String']['input']>;
	activityDescription?: InputMaybe<Scalars['String']['input']>;
	activityName: Scalars['String']['input'];
	approvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataController: Scalars['String']['input'];
	dataProcessor?: InputMaybe<Scalars['String']['input']>;
	dataSubjectCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	dataSubjectRights?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	deletionProcedures?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	jointControllers?: InputMaybe<Scalars['JSON']['input']>;
	legalBasis: Scalars['String']['input'];
	legitimateInterests?: InputMaybe<Scalars['String']['input']>;
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	organizationalMeasures?: InputMaybe<Scalars['String']['input']>;
	personalDataCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	purposeOfProcessing: Scalars['String']['input'];
	recipientCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	retentionPeriod?: InputMaybe<Scalars['String']['input']>;
	reviewedAt?: InputMaybe<Scalars['Datetime']['input']>;
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	specialCategoryData?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	technicalMeasures?: InputMaybe<Scalars['String']['input']>;
	thirdCountryTransfers?: InputMaybe<Scalars['Boolean']['input']>;
	transferCountries?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	transferSafeguards?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `ProcessingActivity`. Fields that are set will be updated. */
export type ProcessingActivityPatch = {
	activityCategory?: InputMaybe<Scalars['String']['input']>;
	activityDescription?: InputMaybe<Scalars['String']['input']>;
	activityName?: InputMaybe<Scalars['String']['input']>;
	approvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	approvedBy?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	dataController?: InputMaybe<Scalars['String']['input']>;
	dataProcessor?: InputMaybe<Scalars['String']['input']>;
	dataSubjectCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	dataSubjectRights?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	deletionProcedures?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	jointControllers?: InputMaybe<Scalars['JSON']['input']>;
	legalBasis?: InputMaybe<Scalars['String']['input']>;
	legitimateInterests?: InputMaybe<Scalars['String']['input']>;
	nextReviewDate?: InputMaybe<Scalars['Date']['input']>;
	organizationalMeasures?: InputMaybe<Scalars['String']['input']>;
	personalDataCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	purposeOfProcessing?: InputMaybe<Scalars['String']['input']>;
	recipientCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	retentionPeriod?: InputMaybe<Scalars['String']['input']>;
	reviewedAt?: InputMaybe<Scalars['Datetime']['input']>;
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	specialCategoryData?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	technicalMeasures?: InputMaybe<Scalars['String']['input']>;
	thirdCountryTransfers?: InputMaybe<Scalars['Boolean']['input']>;
	transferCountries?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	transferSafeguards?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type Query = Node & {
	__typename: 'Query';
	/** Reads and enables pagination through a set of `AuditLog`. */
	allAuditLogs: Maybe<AuditLogsConnection>;
	/** Reads and enables pagination through a set of `AuthSession`. */
	allAuthSessions: Maybe<AuthSessionsConnection>;
	/** Reads and enables pagination through a set of `Competency`. */
	allCompetencies: Maybe<CompetenciesConnection>;
	/** Reads and enables pagination through a set of `CompetencyRating`. */
	allCompetencyRatings: Maybe<CompetencyRatingsConnection>;
	/** Reads and enables pagination through a set of `ConsentRecord`. */
	allConsentRecords: Maybe<ConsentRecordsConnection>;
	/** Reads and enables pagination through a set of `ContactInfo`. */
	allContactInfos: Maybe<ContactInfosConnection>;
	/** Reads and enables pagination through a set of `DashboardMetric`. */
	allDashboardMetrics: Maybe<DashboardMetricsConnection>;
	/** Reads and enables pagination through a set of `DataBreachIncident`. */
	allDataBreachIncidents: Maybe<DataBreachIncidentsConnection>;
	/** Reads and enables pagination through a set of `DataLineage`. */
	allDataLineages: Maybe<DataLineagesConnection>;
	/** Reads and enables pagination through a set of `DataProtectionMetadatum`. */
	allDataProtectionMetadata: Maybe<DataProtectionMetadataConnection>;
	/** Reads and enables pagination through a set of `DataRetentionPolicy`. */
	allDataRetentionPolicyS: Maybe<DataRetentionPoliciesConnection>;
	/** Reads and enables pagination through a set of `DepartmentAnalytics`. */
	allDepartmentAnalyticsS: Maybe<DepartmentAnalyticsConnection>;
	/** Reads and enables pagination through a set of `Department`. */
	allDepartments: Maybe<DepartmentsConnection>;
	/** Reads and enables pagination through a set of `DocumentAccess`. */
	allDocumentAccesses: Maybe<DocumentAccessesConnection>;
	/** Reads and enables pagination through a set of `DocumentSignature`. */
	allDocumentSignatures: Maybe<DocumentSignaturesConnection>;
	/** Reads and enables pagination through a set of `DocumentTemplate`. */
	allDocumentTemplates: Maybe<DocumentTemplatesConnection>;
	/** Reads and enables pagination through a set of `EmployeeDocument`. */
	allEmployeeDocuments: Maybe<EmployeeDocumentsConnection>;
	/** Reads and enables pagination through a set of `EmployeeGoal`. */
	allEmployeeGoals: Maybe<EmployeeGoalsConnection>;
	/** Reads and enables pagination through a set of `EmployeeOverview`. */
	allEmployeeOverviews: Maybe<EmployeeOverviewsConnection>;
	/** Reads and enables pagination through a set of `ErasureRequest`. */
	allErasureRequests: Maybe<ErasureRequestsConnection>;
	/** Reads and enables pagination through a set of `FailedLoginAttempt`. */
	allFailedLoginAttempts: Maybe<FailedLoginAttemptsConnection>;
	/** Reads and enables pagination through a set of `JobInfo`. */
	allJobInfos: Maybe<JobInfosConnection>;
	/** Reads and enables pagination through a set of `NotificationDelivery`. */
	allNotificationDeliveries: Maybe<NotificationDeliveriesConnection>;
	/** Reads and enables pagination through a set of `NotificationDigest`. */
	allNotificationDigests: Maybe<NotificationDigestsConnection>;
	/** Reads and enables pagination through a set of `NotificationPreference`. */
	allNotificationPreferences: Maybe<NotificationPreferencesConnection>;
	/** Reads and enables pagination through a set of `NotificationSubscription`. */
	allNotificationSubscriptions: Maybe<NotificationSubscriptionsConnection>;
	/** Reads and enables pagination through a set of `NotificationTemplate`. */
	allNotificationTemplates: Maybe<NotificationTemplatesConnection>;
	/** Reads and enables pagination through a set of `Notification`. */
	allNotifications: Maybe<NotificationsConnection>;
	/** Reads and enables pagination through a set of `PasswordPolicy`. */
	allPasswordPolicies: Maybe<PasswordPoliciesConnection>;
	/** Reads and enables pagination through a set of `PayrollPeriod`. */
	allPayrollPeriods: Maybe<PayrollPeriodsConnection>;
	/** Reads and enables pagination through a set of `PerformanceReviewAnalytic`. */
	allPerformanceReviewAnalytics: Maybe<PerformanceReviewAnalyticsConnection>;
	/** Reads and enables pagination through a set of `PerformanceReview`. */
	allPerformanceReviews: Maybe<PerformanceReviewsConnection>;
	/** Reads and enables pagination through a set of `PrivacyImpactAssessment`. */
	allPrivacyImpactAssessments: Maybe<PrivacyImpactAssessmentsConnection>;
	/** Reads and enables pagination through a set of `PrivacyRequest`. */
	allPrivacyRequests: Maybe<PrivacyRequestsConnection>;
	/** Reads and enables pagination through a set of `ProcessingActivity`. */
	allProcessingActivities: Maybe<ProcessingActivitiesConnection>;
	/** Reads and enables pagination through a set of `ReviewCycle`. */
	allReviewCycles: Maybe<ReviewCyclesConnection>;
	/** Reads and enables pagination through a set of `SecurityEvent`. */
	allSecurityEvents: Maybe<SecurityEventsConnection>;
	/** Reads and enables pagination through a set of `TimeOffAnalytic`. */
	allTimeOffAnalytics: Maybe<TimeOffAnalyticsConnection>;
	/** Reads and enables pagination through a set of `TimeOffBalance`. */
	allTimeOffBalanceS: Maybe<TimeOffBalancesConnection>;
	/** Reads and enables pagination through a set of `TimeOffPolicy`. */
	allTimeOffPolicies: Maybe<TimeOffPoliciesConnection>;
	/** Reads and enables pagination through a set of `TimeOffRequest`. */
	allTimeOffRequestS: Maybe<TimeOffRequestsConnection>;
	/** Reads and enables pagination through a set of `UserDevice`. */
	allUserDevices: Maybe<UserDevicesConnection>;
	/** Reads and enables pagination through a set of `UserMfaSetting`. */
	allUserMfaSettings: Maybe<UserMfaSettingsConnection>;
	/** Reads and enables pagination through a set of `UserPasswordHistory`. */
	allUserPasswordHistories: Maybe<UserPasswordHistoriesConnection>;
	/** Reads and enables pagination through a set of `UserRoleAssignment`. */
	allUserRoleAssignments: Maybe<UserRoleAssignmentsConnection>;
	/** Reads and enables pagination through a set of `UserRole`. */
	allUserRoles: Maybe<UserRolesConnection>;
	/** Reads and enables pagination through a set of `UserSession`. */
	allUserSessionS: Maybe<UserSessionsConnection>;
	/** Reads and enables pagination through a set of `User`. */
	allUsers: Maybe<UsersConnection>;
	/** Reads and enables pagination through a set of `WorkflowApproval`. */
	allWorkflowApprovals: Maybe<WorkflowApprovalsConnection>;
	/** Reads and enables pagination through a set of `WorkflowDefinition`. */
	allWorkflowDefinitions: Maybe<WorkflowDefinitionsConnection>;
	/** Reads and enables pagination through a set of `WorkflowInstance`. */
	allWorkflowInstances: Maybe<WorkflowInstancesConnection>;
	/** Reads and enables pagination through a set of `WorkflowStepExecution`. */
	allWorkflowStepExecutions: Maybe<WorkflowStepExecutionsConnection>;
	/** Reads and enables pagination through a set of `WorkflowTask`. */
	allWorkflowTasks: Maybe<WorkflowTasksConnection>;
	/** Reads a single `AuditLog` using its globally unique `ID`. */
	auditLog: Maybe<AuditLog>;
	auditLogById: Maybe<AuditLog>;
	/** Reads a single `AuthSession` using its globally unique `ID`. */
	authSession: Maybe<AuthSession>;
	authSessionById: Maybe<AuthSession>;
	/** Calculate overall performance rating from weighted competency ratings */
	calculateOverallRating: Maybe<Scalars['BigFloat']['output']>;
	/** Calculate employee turnover rate for a given period */
	calculateTurnoverRate: Maybe<CalculateTurnoverRateConnection>;
	/** Reads a single `Competency` using its globally unique `ID`. */
	competency: Maybe<Competency>;
	competencyById: Maybe<Competency>;
	/** Reads a single `CompetencyRating` using its globally unique `ID`. */
	competencyRating: Maybe<CompetencyRating>;
	competencyRatingById: Maybe<CompetencyRating>;
	competencyRatingByReviewIdAndCompetencyId: Maybe<CompetencyRating>;
	/** Reads a single `ConsentRecord` using its globally unique `ID`. */
	consentRecord: Maybe<ConsentRecord>;
	consentRecordById: Maybe<ConsentRecord>;
	consentRecordByUserIdAndConsentTypeAndConsentVersion: Maybe<ConsentRecord>;
	/** Reads a single `ContactInfo` using its globally unique `ID`. */
	contactInfo: Maybe<ContactInfo>;
	contactInfoById: Maybe<ContactInfo>;
	/** Get the current authenticated user ID from JWT claims */
	currentUserId: Maybe<Scalars['UUID']['output']>;
	/** Reads a single `DataBreachIncident` using its globally unique `ID`. */
	dataBreachIncident: Maybe<DataBreachIncident>;
	dataBreachIncidentById: Maybe<DataBreachIncident>;
	dataBreachIncidentByIncidentNumber: Maybe<DataBreachIncident>;
	/** Reads a single `DataLineage` using its globally unique `ID`. */
	dataLineage: Maybe<DataLineage>;
	dataLineageById: Maybe<DataLineage>;
	/** Reads a single `DataProtectionMetadatum` using its globally unique `ID`. */
	dataProtectionMetadatum: Maybe<DataProtectionMetadatum>;
	dataProtectionMetadatumById: Maybe<DataProtectionMetadatum>;
	/** Reads a single `DataRetentionPolicy` using its globally unique `ID`. */
	dataRetentionPolicy: Maybe<DataRetentionPolicy>;
	dataRetentionPolicyById: Maybe<DataRetentionPolicy>;
	dataRetentionPolicyByPolicyName: Maybe<DataRetentionPolicy>;
	/** Reads a single `Department` using its globally unique `ID`. */
	department: Maybe<Department>;
	departmentById: Maybe<Department>;
	/** Reads a single `DocumentAccess` using its globally unique `ID`. */
	documentAccess: Maybe<DocumentAccess>;
	documentAccessByDocumentIdAndUserIdAndAccessType: Maybe<DocumentAccess>;
	documentAccessById: Maybe<DocumentAccess>;
	/** Reads a single `DocumentSignature` using its globally unique `ID`. */
	documentSignature: Maybe<DocumentSignature>;
	documentSignatureByDocumentIdAndSignerIdAndSignatureType: Maybe<DocumentSignature>;
	documentSignatureById: Maybe<DocumentSignature>;
	/** Reads a single `DocumentTemplate` using its globally unique `ID`. */
	documentTemplate: Maybe<DocumentTemplate>;
	documentTemplateById: Maybe<DocumentTemplate>;
	documentTemplateByTemplateNameAndVersion: Maybe<DocumentTemplate>;
	/** Reads a single `EmployeeDocument` using its globally unique `ID`. */
	employeeDocument: Maybe<EmployeeDocument>;
	employeeDocumentById: Maybe<EmployeeDocument>;
	/** Reads a single `EmployeeGoal` using its globally unique `ID`. */
	employeeGoal: Maybe<EmployeeGoal>;
	employeeGoalById: Maybe<EmployeeGoal>;
	/** Reads a single `ErasureRequest` using its globally unique `ID`. */
	erasureRequest: Maybe<ErasureRequest>;
	erasureRequestById: Maybe<ErasureRequest>;
	/** Reads a single `FailedLoginAttempt` using its globally unique `ID`. */
	failedLoginAttempt: Maybe<FailedLoginAttempt>;
	failedLoginAttemptById: Maybe<FailedLoginAttempt>;
	/** Get available time-off balance for user and policy */
	getTimeOffBalance: Maybe<Scalars['BigFloat']['output']>;
	/** Reads a single `JobInfo` using its globally unique `ID`. */
	jobInfo: Maybe<JobInfo>;
	jobInfoById: Maybe<JobInfo>;
	/** Fetches an object given its globally unique `ID`. */
	node: Maybe<Node>;
	/** The root query type must be a `Node` to work well with Relay 1 mutations. This just resolves to `query`. */
	nodeId: Scalars['ID']['output'];
	/** Reads a single `Notification` using its globally unique `ID`. */
	notification: Maybe<Notification>;
	notificationById: Maybe<Notification>;
	/** Reads a single `NotificationDelivery` using its globally unique `ID`. */
	notificationDelivery: Maybe<NotificationDelivery>;
	notificationDeliveryById: Maybe<NotificationDelivery>;
	/** Reads a single `NotificationDigest` using its globally unique `ID`. */
	notificationDigest: Maybe<NotificationDigest>;
	notificationDigestById: Maybe<NotificationDigest>;
	/** Reads a single `NotificationPreference` using its globally unique `ID`. */
	notificationPreference: Maybe<NotificationPreference>;
	notificationPreferenceById: Maybe<NotificationPreference>;
	notificationPreferenceByUserIdAndCategoryAndTemplateKey: Maybe<NotificationPreference>;
	/** Reads a single `NotificationSubscription` using its globally unique `ID`. */
	notificationSubscription: Maybe<NotificationSubscription>;
	notificationSubscriptionById: Maybe<NotificationSubscription>;
	notificationSubscriptionByUserIdAndResourceTypeAndResourceId: Maybe<NotificationSubscription>;
	/** Reads a single `NotificationTemplate` using its globally unique `ID`. */
	notificationTemplate: Maybe<NotificationTemplate>;
	notificationTemplateById: Maybe<NotificationTemplate>;
	notificationTemplateByTemplateKey: Maybe<NotificationTemplate>;
	/** Reads a single `PasswordPolicy` using its globally unique `ID`. */
	passwordPolicy: Maybe<PasswordPolicy>;
	passwordPolicyById: Maybe<PasswordPolicy>;
	passwordPolicyByPolicyName: Maybe<PasswordPolicy>;
	/** Reads a single `PayrollPeriod` using its globally unique `ID`. */
	payrollPeriod: Maybe<PayrollPeriod>;
	payrollPeriodById: Maybe<PayrollPeriod>;
	/** Reads a single `PerformanceReview` using its globally unique `ID`. */
	performanceReview: Maybe<PerformanceReview>;
	performanceReviewByEmployeeIdAndCycleId: Maybe<PerformanceReview>;
	performanceReviewById: Maybe<PerformanceReview>;
	/** Reads a single `PrivacyImpactAssessment` using its globally unique `ID`. */
	privacyImpactAssessment: Maybe<PrivacyImpactAssessment>;
	privacyImpactAssessmentByAssessmentReference: Maybe<PrivacyImpactAssessment>;
	privacyImpactAssessmentById: Maybe<PrivacyImpactAssessment>;
	/** Reads a single `PrivacyRequest` using its globally unique `ID`. */
	privacyRequest: Maybe<PrivacyRequest>;
	privacyRequestById: Maybe<PrivacyRequest>;
	privacyRequestByRequestNumber: Maybe<PrivacyRequest>;
	/** Reads a single `ProcessingActivity` using its globally unique `ID`. */
	processingActivity: Maybe<ProcessingActivity>;
	processingActivityById: Maybe<ProcessingActivity>;
	/**
	 * Exposes the root query type nested one level down. This is helpful for Relay 1
	 * which can only query top level fields if they are in a particular form.
	 */
	query: Query;
	/** Reads a single `ReviewCycle` using its globally unique `ID`. */
	reviewCycle: Maybe<ReviewCycle>;
	reviewCycleById: Maybe<ReviewCycle>;
	/** Reads a single `SecurityEvent` using its globally unique `ID`. */
	securityEvent: Maybe<SecurityEvent>;
	securityEventById: Maybe<SecurityEvent>;
	/** Reads a single `TimeOffBalance` using its globally unique `ID`. */
	timeOffBalance: Maybe<TimeOffBalance>;
	timeOffBalanceById: Maybe<TimeOffBalance>;
	timeOffBalanceByUserIdAndPolicyIdAndYear: Maybe<TimeOffBalance>;
	/** Reads a single `TimeOffPolicy` using its globally unique `ID`. */
	timeOffPolicy: Maybe<TimeOffPolicy>;
	timeOffPolicyById: Maybe<TimeOffPolicy>;
	/** Reads a single `TimeOffRequest` using its globally unique `ID`. */
	timeOffRequest: Maybe<TimeOffRequest>;
	timeOffRequestById: Maybe<TimeOffRequest>;
	/** Reads a single `User` using its globally unique `ID`. */
	user: Maybe<User>;
	userByEmail: Maybe<User>;
	userById: Maybe<User>;
	/** Reads a single `UserDevice` using its globally unique `ID`. */
	userDevice: Maybe<UserDevice>;
	userDeviceById: Maybe<UserDevice>;
	userDeviceByUserIdAndDeviceId: Maybe<UserDevice>;
	/** Reads a single `UserMfaSetting` using its globally unique `ID`. */
	userMfaSetting: Maybe<UserMfaSetting>;
	userMfaSettingById: Maybe<UserMfaSetting>;
	userMfaSettingByUserId: Maybe<UserMfaSetting>;
	/** Reads a single `UserPasswordHistory` using its globally unique `ID`. */
	userPasswordHistory: Maybe<UserPasswordHistory>;
	userPasswordHistoryById: Maybe<UserPasswordHistory>;
	/** Reads a single `UserRole` using its globally unique `ID`. */
	userRole: Maybe<UserRole>;
	/** Reads a single `UserRoleAssignment` using its globally unique `ID`. */
	userRoleAssignment: Maybe<UserRoleAssignment>;
	userRoleAssignmentById: Maybe<UserRoleAssignment>;
	userRoleAssignmentByUserIdAndRoleId: Maybe<UserRoleAssignment>;
	userRoleById: Maybe<UserRole>;
	userRoleByName: Maybe<UserRole>;
	/** Reads a single `UserSession` using its globally unique `ID`. */
	userSession: Maybe<UserSession>;
	userSessionById: Maybe<UserSession>;
	userSessionByRefreshToken: Maybe<UserSession>;
	userSessionBySessionToken: Maybe<UserSession>;
	/** Validate time-off request against policy rules and user eligibility */
	validateTimeOffRequest: Maybe<Scalars['JSON']['output']>;
	/** Reads a single `WorkflowApproval` using its globally unique `ID`. */
	workflowApproval: Maybe<WorkflowApproval>;
	workflowApprovalById: Maybe<WorkflowApproval>;
	/** Reads a single `WorkflowDefinition` using its globally unique `ID`. */
	workflowDefinition: Maybe<WorkflowDefinition>;
	workflowDefinitionById: Maybe<WorkflowDefinition>;
	workflowDefinitionByNameAndVersion: Maybe<WorkflowDefinition>;
	/** Reads a single `WorkflowInstance` using its globally unique `ID`. */
	workflowInstance: Maybe<WorkflowInstance>;
	workflowInstanceById: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` using its globally unique `ID`. */
	workflowStepExecution: Maybe<WorkflowStepExecution>;
	workflowStepExecutionById: Maybe<WorkflowStepExecution>;
	/** Reads a single `WorkflowTask` using its globally unique `ID`. */
	workflowTask: Maybe<WorkflowTask>;
	workflowTaskById: Maybe<WorkflowTask>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllAuditLogsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<AuditLogCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<AuditLogsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllAuthSessionsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<AuthSessionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<AuthSessionsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllCompetenciesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<CompetencyCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<CompetenciesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllCompetencyRatingsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<CompetencyRatingCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<CompetencyRatingsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllConsentRecordsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ConsentRecordCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ConsentRecordsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllContactInfosArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ContactInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ContactInfosOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDashboardMetricsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DashboardMetricsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDataBreachIncidentsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DataBreachIncidentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DataBreachIncidentsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDataLineagesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DataLineageCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DataLineagesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDataProtectionMetadataArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DataProtectionMetadatumCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DataProtectionMetadataOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDataRetentionPolicySArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DataRetentionPolicyCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DataRetentionPoliciesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDepartmentAnalyticsSArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DepartmentAnalyticsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDepartmentsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DepartmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DepartmentsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDocumentAccessesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentAccessCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDocumentSignaturesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentSignatureCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentSignaturesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllDocumentTemplatesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentTemplateCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentTemplatesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllEmployeeDocumentsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeDocumentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllEmployeeGoalsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeGoalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllEmployeeOverviewsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeOverviewsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllErasureRequestsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ErasureRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ErasureRequestsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllFailedLoginAttemptsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<FailedLoginAttemptCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<FailedLoginAttemptsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllJobInfosArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<JobInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllNotificationDeliveriesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationDeliveryCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationDeliveriesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllNotificationDigestsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationDigestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationDigestsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllNotificationPreferencesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationPreferenceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationPreferencesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllNotificationSubscriptionsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationSubscriptionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationSubscriptionsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllNotificationTemplatesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationTemplateCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationTemplatesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllNotificationsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllPasswordPoliciesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PasswordPolicyCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PasswordPoliciesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllPayrollPeriodsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PayrollPeriodCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllPerformanceReviewAnalyticsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PerformanceReviewAnalyticsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllPerformanceReviewsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PerformanceReviewCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllPrivacyImpactAssessmentsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PrivacyImpactAssessmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PrivacyImpactAssessmentsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllPrivacyRequestsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PrivacyRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PrivacyRequestsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllProcessingActivitiesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ProcessingActivityCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ProcessingActivitiesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllReviewCyclesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ReviewCycleCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ReviewCyclesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllSecurityEventsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<SecurityEventCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<SecurityEventsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllTimeOffAnalyticsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffAnalyticsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllTimeOffBalanceSArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffBalanceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffBalancesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllTimeOffPoliciesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffPolicyCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffPoliciesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllTimeOffRequestSArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUserDevicesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserDeviceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserDevicesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUserMfaSettingsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserMfaSettingCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserMfaSettingsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUserPasswordHistoriesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserPasswordHistoryCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserPasswordHistoriesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUserRoleAssignmentsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserRoleAssignmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUserRolesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserRoleCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserRolesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUserSessionSArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserSessionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserSessionsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllUsersArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UsersOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllWorkflowApprovalsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowApprovalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllWorkflowDefinitionsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowDefinitionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllWorkflowInstancesArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowInstanceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowInstancesOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllWorkflowStepExecutionsArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowStepExecutionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowStepExecutionsOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAllWorkflowTasksArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowTaskCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/** The root query type which gives access points into the data universe. */
export type QueryAuditLogArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryAuditLogByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryAuthSessionArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryAuthSessionByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryCalculateOverallRatingArgs = {
	pReviewId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type QueryCalculateTurnoverRateArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	pEndDate?: InputMaybe<Scalars['Date']['input']>;
	pStartDate?: InputMaybe<Scalars['Date']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type QueryCompetencyArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryCompetencyByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryCompetencyRatingArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryCompetencyRatingByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryCompetencyRatingByReviewIdAndCompetencyIdArgs = {
	competencyId: Scalars['UUID']['input'];
	reviewId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryConsentRecordArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryConsentRecordByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryConsentRecordByUserIdAndConsentTypeAndConsentVersionArgs = {
	consentType: Scalars['String']['input'];
	consentVersion: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryContactInfoArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryContactInfoByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataBreachIncidentArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataBreachIncidentByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataBreachIncidentByIncidentNumberArgs = {
	incidentNumber: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataLineageArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataLineageByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataProtectionMetadatumArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataProtectionMetadatumByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataRetentionPolicyArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataRetentionPolicyByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDataRetentionPolicyByPolicyNameArgs = {
	policyName: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDepartmentArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDepartmentByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentAccessArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentAccessByDocumentIdAndUserIdAndAccessTypeArgs = {
	accessType: Scalars['String']['input'];
	documentId: Scalars['UUID']['input'];
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentAccessByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentSignatureArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeArgs = {
	documentId: Scalars['UUID']['input'];
	signatureType: Scalars['String']['input'];
	signerId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentSignatureByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentTemplateArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentTemplateByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryDocumentTemplateByTemplateNameAndVersionArgs = {
	templateName: Scalars['String']['input'];
	version: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryEmployeeDocumentArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryEmployeeDocumentByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryEmployeeGoalArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryEmployeeGoalByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryErasureRequestArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryErasureRequestByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryFailedLoginAttemptArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryFailedLoginAttemptByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryGetTimeOffBalanceArgs = {
	pPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
	pYear?: InputMaybe<Scalars['Int']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type QueryJobInfoArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryJobInfoByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNodeArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationDeliveryArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationDeliveryByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationDigestArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationDigestByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationPreferenceArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationPreferenceByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationPreferenceByUserIdAndCategoryAndTemplateKeyArgs = {
	category: NotificationCategory;
	templateKey: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationSubscriptionArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationSubscriptionByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdArgs = {
	resourceId: Scalars['UUID']['input'];
	resourceType: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationTemplateArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationTemplateByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryNotificationTemplateByTemplateKeyArgs = {
	templateKey: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPasswordPolicyArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPasswordPolicyByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPasswordPolicyByPolicyNameArgs = {
	policyName: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPayrollPeriodArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPayrollPeriodByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPerformanceReviewArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPerformanceReviewByEmployeeIdAndCycleIdArgs = {
	cycleId: Scalars['UUID']['input'];
	employeeId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPerformanceReviewByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPrivacyImpactAssessmentArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPrivacyImpactAssessmentByAssessmentReferenceArgs = {
	assessmentReference: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPrivacyImpactAssessmentByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPrivacyRequestArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPrivacyRequestByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryPrivacyRequestByRequestNumberArgs = {
	requestNumber: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryProcessingActivityArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryProcessingActivityByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryReviewCycleArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryReviewCycleByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QuerySecurityEventArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QuerySecurityEventByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffBalanceArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffBalanceByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffBalanceByUserIdAndPolicyIdAndYearArgs = {
	policyId: Scalars['UUID']['input'];
	userId: Scalars['UUID']['input'];
	year: Scalars['Int']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffPolicyArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffPolicyByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffRequestArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryTimeOffRequestByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserByEmailArgs = {
	email: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserDeviceArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserDeviceByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserDeviceByUserIdAndDeviceIdArgs = {
	deviceId: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserMfaSettingArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserMfaSettingByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserMfaSettingByUserIdArgs = {
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserPasswordHistoryArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserPasswordHistoryByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserRoleArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserRoleAssignmentArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserRoleAssignmentByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserRoleAssignmentByUserIdAndRoleIdArgs = {
	roleId: Scalars['Int']['input'];
	userId: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserRoleByIdArgs = {
	id: Scalars['Int']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserRoleByNameArgs = {
	name: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserSessionArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserSessionByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserSessionByRefreshTokenArgs = {
	refreshToken: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryUserSessionBySessionTokenArgs = {
	sessionToken: Scalars['String']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryValidateTimeOffRequestArgs = {
	pEndDate?: InputMaybe<Scalars['Date']['input']>;
	pHoursRequested?: InputMaybe<Scalars['BigFloat']['input']>;
	pPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	pStartDate?: InputMaybe<Scalars['Date']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowApprovalArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowApprovalByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowDefinitionArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowDefinitionByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowDefinitionByNameAndVersionArgs = {
	name: Scalars['String']['input'];
	version: Scalars['Int']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowInstanceArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowInstanceByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowStepExecutionArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowStepExecutionByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowTaskArgs = {
	nodeId: Scalars['ID']['input'];
};

/** The root query type which gives access points into the data universe. */
export type QueryWorkflowTaskByIdArgs = {
	id: Scalars['UUID']['input'];
};

/** All input for the `recordUserConsent` mutation. */
export type RecordUserConsentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pConsentEvidence?: InputMaybe<Scalars['JSON']['input']>;
	pConsentMethod?: InputMaybe<Scalars['String']['input']>;
	pConsentType?: InputMaybe<Scalars['String']['input']>;
	pExpiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	pProcessingCategories?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	pPurpose?: InputMaybe<Scalars['String']['input']>;
	pThirdParties?: InputMaybe<Scalars['JSON']['input']>;
	pThirdPartySharing?: InputMaybe<Scalars['Boolean']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `recordUserConsent` mutation. */
export type RecordUserConsentPayload = {
	__typename: 'RecordUserConsentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	consentId: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `refreshAnalyticsDashboard` mutation. */
export type RefreshAnalyticsDashboardInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `refreshAnalyticsDashboard` mutation. */
export type RefreshAnalyticsDashboardPayload = {
	__typename: 'RefreshAnalyticsDashboardPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `registerUser` mutation. */
export type RegisterUserInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	displayName?: InputMaybe<Scalars['String']['input']>;
	email?: InputMaybe<Scalars['String']['input']>;
	password?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `registerUser` mutation. */
export type RegisterUserPayload = {
	__typename: 'RegisterUserPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	user: Maybe<User>;
	/** An edge for our `User`. May be used by Relay 1. */
	userEdge: Maybe<UsersEdge>;
};

/** The output of our `registerUser` mutation. */
export type RegisterUserPayloadUserEdgeArgs = {
	orderBy?: InputMaybe<Array<UsersOrderBy>>;
};

/** All input for the `requestDocumentAccess` mutation. */
export type RequestDocumentAccessInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pAccessType?: InputMaybe<Scalars['String']['input']>;
	pDocumentId?: InputMaybe<Scalars['UUID']['input']>;
	pReason?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `requestDocumentAccess` mutation. */
export type RequestDocumentAccessPayload = {
	__typename: 'RequestDocumentAccessPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** An edge for our `DocumentAccess`. May be used by Relay 1. */
	documentAccessEdge: Maybe<DocumentAccessesEdge>;
	documentAccessRequest: Maybe<DocumentAccess>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentAccess`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByGrantedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByUserId: Maybe<User>;
};

/** The output of our `requestDocumentAccess` mutation. */
export type RequestDocumentAccessPayloadDocumentAccessEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

export type RequestStatus = 'APPROVED' | 'CANCELLED' | 'IN_REVIEW' | 'PENDING' | 'REJECTED';

/** Performance review cycles (Annual, Quarterly, etc.) */
export type ReviewCycle = Node & {
	__typename: 'ReviewCycle';
	autoCreateReviews: Maybe<Scalars['Boolean']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Maybe<Scalars['UUID']['output']>;
	cycleName: Scalars['String']['output'];
	cycleType: Scalars['String']['output'];
	description: Maybe<Scalars['String']['output']>;
	endDate: Scalars['Date']['output'];
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads and enables pagination through a set of `PerformanceReview`. */
	performanceReviewsByCycleId: PerformanceReviewsConnection;
	reviewDueDate: Scalars['Date']['output'];
	startDate: Scalars['Date']['output'];
	templateId: Maybe<Scalars['UUID']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `ReviewCycle`. */
	userByCreatedBy: Maybe<User>;
};

/** Performance review cycles (Annual, Quarterly, etc.) */
export type ReviewCyclePerformanceReviewsByCycleIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PerformanceReviewCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/**
 * A condition to be used against `ReviewCycle` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type ReviewCycleCondition = {
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `ReviewCycle` */
export type ReviewCycleInput = {
	autoCreateReviews?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	cycleName: Scalars['String']['input'];
	cycleType: Scalars['String']['input'];
	description?: InputMaybe<Scalars['String']['input']>;
	endDate: Scalars['Date']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	reviewDueDate: Scalars['Date']['input'];
	startDate: Scalars['Date']['input'];
	templateId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `ReviewCycle`. Fields that are set will be updated. */
export type ReviewCyclePatch = {
	autoCreateReviews?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	cycleName?: InputMaybe<Scalars['String']['input']>;
	cycleType?: InputMaybe<Scalars['String']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	endDate?: InputMaybe<Scalars['Date']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	reviewDueDate?: InputMaybe<Scalars['Date']['input']>;
	startDate?: InputMaybe<Scalars['Date']['input']>;
	templateId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `ReviewCycle` values. */
export type ReviewCyclesConnection = {
	__typename: 'ReviewCyclesConnection';
	/** A list of edges which contains the `ReviewCycle` and cursor to aid in pagination. */
	edges: Array<ReviewCyclesEdge>;
	/** A list of `ReviewCycle` objects. */
	nodes: Array<ReviewCycle>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `ReviewCycle` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `ReviewCycle` edge in the connection. */
export type ReviewCyclesEdge = {
	__typename: 'ReviewCyclesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `ReviewCycle` at the end of the edge. */
	node: ReviewCycle;
};

/** Methods to use when ordering `ReviewCycle`. */
export type ReviewCyclesOrderBy =
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

export type ReviewStatus =
	| 'CANCELLED'
	| 'COMPLETED'
	| 'EMPLOYEE_SUBMITTED'
	| 'HR_REVIEW'
	| 'IN_PROGRESS'
	| 'MANAGER_REVIEW'
	| 'NOT_STARTED';

/** All input for the `reviewTimeOffRequest` mutation. */
export type ReviewTimeOffRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pDecision?: InputMaybe<RequestStatus>;
	pRequestId?: InputMaybe<Scalars['UUID']['input']>;
	pReviewerId?: InputMaybe<Scalars['UUID']['input']>;
	pReviewerNotes?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `reviewTimeOffRequest` mutation. */
export type ReviewTimeOffRequestPayload = {
	__typename: 'ReviewTimeOffRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffRequest`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	timeOffRequest: Maybe<TimeOffRequest>;
	/** An edge for our `TimeOffRequest`. May be used by Relay 1. */
	timeOffRequestEdge: Maybe<TimeOffRequestsEdge>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByReviewedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our `reviewTimeOffRequest` mutation. */
export type ReviewTimeOffRequestPayloadTimeOffRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** Security events and audit log for monitoring and compliance */
export type SecurityEvent = Node & {
	__typename: 'SecurityEvent';
	actionTaken: Maybe<Scalars['String']['output']>;
	autoResolved: Maybe<Scalars['Boolean']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	eventCategory: Scalars['String']['output'];
	eventData: Maybe<Scalars['JSON']['output']>;
	eventMessage: Scalars['String']['output'];
	eventType: SecurityEventType;
	id: Scalars['UUID']['output'];
	ipAddress: Maybe<Scalars['InternetAddress']['output']>;
	isSuspicious: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	requestId: Maybe<Scalars['String']['output']>;
	requiresInvestigation: Maybe<Scalars['Boolean']['output']>;
	resolvedAt: Maybe<Scalars['Datetime']['output']>;
	resolvedBy: Maybe<Scalars['UUID']['output']>;
	riskScore: Maybe<Scalars['Int']['output']>;
	sessionId: Maybe<Scalars['UUID']['output']>;
	userAgent: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `SecurityEvent`. */
	userByUserId: Maybe<User>;
	userId: Maybe<Scalars['UUID']['output']>;
};

/**
 * A condition to be used against `SecurityEvent` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type SecurityEventCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `riskScore` field. */
	riskScore?: InputMaybe<Scalars['Int']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `SecurityEvent` */
export type SecurityEventInput = {
	actionTaken?: InputMaybe<Scalars['String']['input']>;
	autoResolved?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	eventCategory: Scalars['String']['input'];
	eventData?: InputMaybe<Scalars['JSON']['input']>;
	eventMessage: Scalars['String']['input'];
	eventType: SecurityEventType;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isSuspicious?: InputMaybe<Scalars['Boolean']['input']>;
	requestId?: InputMaybe<Scalars['String']['input']>;
	requiresInvestigation?: InputMaybe<Scalars['Boolean']['input']>;
	resolvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	resolvedBy?: InputMaybe<Scalars['UUID']['input']>;
	riskScore?: InputMaybe<Scalars['Int']['input']>;
	sessionId?: InputMaybe<Scalars['UUID']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** Represents an update to a `SecurityEvent`. Fields that are set will be updated. */
export type SecurityEventPatch = {
	actionTaken?: InputMaybe<Scalars['String']['input']>;
	autoResolved?: InputMaybe<Scalars['Boolean']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	eventCategory?: InputMaybe<Scalars['String']['input']>;
	eventData?: InputMaybe<Scalars['JSON']['input']>;
	eventMessage?: InputMaybe<Scalars['String']['input']>;
	eventType?: InputMaybe<SecurityEventType>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isSuspicious?: InputMaybe<Scalars['Boolean']['input']>;
	requestId?: InputMaybe<Scalars['String']['input']>;
	requiresInvestigation?: InputMaybe<Scalars['Boolean']['input']>;
	resolvedAt?: InputMaybe<Scalars['Datetime']['input']>;
	resolvedBy?: InputMaybe<Scalars['UUID']['input']>;
	riskScore?: InputMaybe<Scalars['Int']['input']>;
	sessionId?: InputMaybe<Scalars['UUID']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

export type SecurityEventType =
	| 'ADMIN_ACTION'
	| 'DATA_ACCESS'
	| 'DATA_EXPORT'
	| 'LOGIN_BLOCKED'
	| 'LOGIN_FAILED'
	| 'LOGIN_SUCCESS'
	| 'MFA_CHALLENGE_FAILED'
	| 'MFA_CHALLENGE_SUCCESS'
	| 'MFA_DISABLED'
	| 'MFA_ENABLED'
	| 'PASSWORD_CHANGED'
	| 'PERMISSION_DENIED'
	| 'SESSION_CREATED'
	| 'SESSION_EXPIRED'
	| 'SESSION_TERMINATED'
	| 'SUSPICIOUS_ACTIVITY';

/** A connection to a list of `SecurityEvent` values. */
export type SecurityEventsConnection = {
	__typename: 'SecurityEventsConnection';
	/** A list of edges which contains the `SecurityEvent` and cursor to aid in pagination. */
	edges: Array<SecurityEventsEdge>;
	/** A list of `SecurityEvent` objects. */
	nodes: Array<SecurityEvent>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `SecurityEvent` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `SecurityEvent` edge in the connection. */
export type SecurityEventsEdge = {
	__typename: 'SecurityEventsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `SecurityEvent` at the end of the edge. */
	node: SecurityEvent;
};

/** Methods to use when ordering `SecurityEvent`. */
export type SecurityEventsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'RISK_SCORE_ASC'
	| 'RISK_SCORE_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** All input for the `sendTemplatedNotification` mutation. */
export type SendTemplatedNotificationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	pExpiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	pPriority?: InputMaybe<NotificationPriority>;
	pSourceId?: InputMaybe<Scalars['UUID']['input']>;
	pSourceType?: InputMaybe<Scalars['String']['input']>;
	pTemplateData?: InputMaybe<Scalars['JSON']['input']>;
	pTemplateKey?: InputMaybe<Scalars['String']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `sendTemplatedNotification` mutation. */
export type SendTemplatedNotificationPayload = {
	__typename: 'SendTemplatedNotificationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	notificationId: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'TERMINATED';

/** All input for the `submitManagerAssessment` mutation. */
export type SubmitManagerAssessmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pDevelopmentAreas?: InputMaybe<Scalars['String']['input']>;
	pFeedback?: InputMaybe<Scalars['String']['input']>;
	pManagerAssessment?: InputMaybe<Scalars['String']['input']>;
	pManagerId?: InputMaybe<Scalars['UUID']['input']>;
	pOverallRating?: InputMaybe<Scalars['BigFloat']['input']>;
	pRecommendations?: InputMaybe<Scalars['String']['input']>;
	pReviewId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `submitManagerAssessment` mutation. */
export type SubmitManagerAssessmentPayload = {
	__typename: 'SubmitManagerAssessmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	performanceReview: Maybe<PerformanceReview>;
	/** An edge for our `PerformanceReview`. May be used by Relay 1. */
	performanceReviewEdge: Maybe<PerformanceReviewsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `ReviewCycle` that is related to this `PerformanceReview`. */
	reviewCycleByCycleId: Maybe<ReviewCycle>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByHrReviewerId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByManagerId: Maybe<User>;
};

/** The output of our `submitManagerAssessment` mutation. */
export type SubmitManagerAssessmentPayloadPerformanceReviewEdgeArgs = {
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** All input for the `submitSelfAssessment` mutation. */
export type SubmitSelfAssessmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pAchievements?: InputMaybe<Scalars['String']['input']>;
	pChallenges?: InputMaybe<Scalars['String']['input']>;
	pEmployeeId?: InputMaybe<Scalars['UUID']['input']>;
	pGoalsNextPeriod?: InputMaybe<Scalars['String']['input']>;
	pReviewId?: InputMaybe<Scalars['UUID']['input']>;
	pSelfAssessment?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `submitSelfAssessment` mutation. */
export type SubmitSelfAssessmentPayload = {
	__typename: 'SubmitSelfAssessmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	performanceReview: Maybe<PerformanceReview>;
	/** An edge for our `PerformanceReview`. May be used by Relay 1. */
	performanceReviewEdge: Maybe<PerformanceReviewsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `ReviewCycle` that is related to this `PerformanceReview`. */
	reviewCycleByCycleId: Maybe<ReviewCycle>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByHrReviewerId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByManagerId: Maybe<User>;
};

/** The output of our `submitSelfAssessment` mutation. */
export type SubmitSelfAssessmentPayloadPerformanceReviewEdgeArgs = {
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** All input for the `submitTimeOffRequest` mutation. */
export type SubmitTimeOffRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pEndDate?: InputMaybe<Scalars['Date']['input']>;
	pHoursRequested?: InputMaybe<Scalars['BigFloat']['input']>;
	pNotes?: InputMaybe<Scalars['String']['input']>;
	pPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	pReason?: InputMaybe<Scalars['String']['input']>;
	pStartDate?: InputMaybe<Scalars['Date']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `submitTimeOffRequest` mutation. */
export type SubmitTimeOffRequestPayload = {
	__typename: 'SubmitTimeOffRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffRequest`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	timeOffRequest: Maybe<TimeOffRequest>;
	/** An edge for our `TimeOffRequest`. May be used by Relay 1. */
	timeOffRequestEdge: Maybe<TimeOffRequestsEdge>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByReviewedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our `submitTimeOffRequest` mutation. */
export type SubmitTimeOffRequestPayloadTimeOffRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** All input for the `subscribeToNotifications` mutation. */
export type SubscribeToNotificationsInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pCategories?: InputMaybe<Array<InputMaybe<NotificationCategory>>>;
	pChannels?: InputMaybe<Array<InputMaybe<NotificationChannel>>>;
	pResourceId?: InputMaybe<Scalars['UUID']['input']>;
	pResourceType?: InputMaybe<Scalars['String']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `subscribeToNotifications` mutation. */
export type SubscribeToNotificationsPayload = {
	__typename: 'SubscribeToNotificationsPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	uuid: Maybe<Scalars['UUID']['output']>;
};

/** All input for the `terminateSession` mutation. */
export type TerminateSessionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pSessionId?: InputMaybe<Scalars['UUID']['input']>;
	pTerminationReason?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `terminateSession` mutation. */
export type TerminateSessionPayload = {
	__typename: 'TerminateSessionPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** Time-off request statistics and approval rates */
export type TimeOffAnalytic = {
	__typename: 'TimeOffAnalytic';
	approvalRatePercent: Maybe<Scalars['BigFloat']['output']>;
	approvedRequests: Maybe<Scalars['BigInt']['output']>;
	avgApprovedHours: Maybe<Scalars['BigFloat']['output']>;
	pendingRequests: Maybe<Scalars['BigInt']['output']>;
	policyId: Maybe<Scalars['UUID']['output']>;
	policyName: Maybe<Scalars['String']['output']>;
	recentRequests: Maybe<Scalars['BigInt']['output']>;
	rejectedRequests: Maybe<Scalars['BigInt']['output']>;
	timeOffType: Maybe<TimeOffType>;
	totalApprovedHours: Maybe<Scalars['BigFloat']['output']>;
	totalPendingHours: Maybe<Scalars['BigFloat']['output']>;
	totalRequests: Maybe<Scalars['BigInt']['output']>;
};

/** A connection to a list of `TimeOffAnalytic` values. */
export type TimeOffAnalyticsConnection = {
	__typename: 'TimeOffAnalyticsConnection';
	/** A list of edges which contains the `TimeOffAnalytic` and cursor to aid in pagination. */
	edges: Array<TimeOffAnalyticsEdge>;
	/** A list of `TimeOffAnalytic` objects. */
	nodes: Array<TimeOffAnalytic>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `TimeOffAnalytic` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `TimeOffAnalytic` edge in the connection. */
export type TimeOffAnalyticsEdge = {
	__typename: 'TimeOffAnalyticsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `TimeOffAnalytic` at the end of the edge. */
	node: TimeOffAnalytic;
};

/** Methods to use when ordering `TimeOffAnalytic`. */
export type TimeOffAnalyticsOrderBy = 'NATURAL';

/** Current time-off balances for employees by policy and year */
export type TimeOffBalance = Node & {
	__typename: 'TimeOffBalance';
	carryForwardBalance: Scalars['BigFloat']['output'];
	createdAt: Maybe<Scalars['Datetime']['output']>;
	currentBalance: Scalars['BigFloat']['output'];
	id: Scalars['UUID']['output'];
	lastAccrualDate: Maybe<Scalars['Date']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Available balance minus pending requests */
	pendingBalance: Scalars['BigFloat']['output'];
	policyId: Scalars['UUID']['output'];
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffBalance`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	usedThisYear: Scalars['BigFloat']['output'];
	/** Reads a single `User` that is related to this `TimeOffBalance`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	year: Scalars['Int']['output'];
};

/**
 * A condition to be used against `TimeOffBalance` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type TimeOffBalanceCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `policyId` field. */
	policyId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `TimeOffBalance` */
export type TimeOffBalanceInput = {
	carryForwardBalance?: InputMaybe<Scalars['BigFloat']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	currentBalance?: InputMaybe<Scalars['BigFloat']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	lastAccrualDate?: InputMaybe<Scalars['Date']['input']>;
	/** Available balance minus pending requests */
	pendingBalance?: InputMaybe<Scalars['BigFloat']['input']>;
	policyId: Scalars['UUID']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	usedThisYear?: InputMaybe<Scalars['BigFloat']['input']>;
	userId: Scalars['UUID']['input'];
	year?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents an update to a `TimeOffBalance`. Fields that are set will be updated. */
export type TimeOffBalancePatch = {
	carryForwardBalance?: InputMaybe<Scalars['BigFloat']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	currentBalance?: InputMaybe<Scalars['BigFloat']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	lastAccrualDate?: InputMaybe<Scalars['Date']['input']>;
	/** Available balance minus pending requests */
	pendingBalance?: InputMaybe<Scalars['BigFloat']['input']>;
	policyId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	usedThisYear?: InputMaybe<Scalars['BigFloat']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	year?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of `TimeOffBalance` values. */
export type TimeOffBalancesConnection = {
	__typename: 'TimeOffBalancesConnection';
	/** A list of edges which contains the `TimeOffBalance` and cursor to aid in pagination. */
	edges: Array<TimeOffBalancesEdge>;
	/** A list of `TimeOffBalance` objects. */
	nodes: Array<TimeOffBalance>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `TimeOffBalance` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `TimeOffBalance` edge in the connection. */
export type TimeOffBalancesEdge = {
	__typename: 'TimeOffBalancesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `TimeOffBalance` at the end of the edge. */
	node: TimeOffBalance;
};

/** Methods to use when ordering `TimeOffBalance`. */
export type TimeOffBalancesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'POLICY_ID_ASC'
	| 'POLICY_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** A connection to a list of `TimeOffPolicy` values. */
export type TimeOffPoliciesConnection = {
	__typename: 'TimeOffPoliciesConnection';
	/** A list of edges which contains the `TimeOffPolicy` and cursor to aid in pagination. */
	edges: Array<TimeOffPoliciesEdge>;
	/** A list of `TimeOffPolicy` objects. */
	nodes: Array<TimeOffPolicy>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `TimeOffPolicy` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `TimeOffPolicy` edge in the connection. */
export type TimeOffPoliciesEdge = {
	__typename: 'TimeOffPoliciesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `TimeOffPolicy` at the end of the edge. */
	node: TimeOffPolicy;
};

/** Methods to use when ordering `TimeOffPolicy`. */
export type TimeOffPoliciesOrderBy =
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** Time-off policies with accrual rules and limits */
export type TimeOffPolicy = Node & {
	__typename: 'TimeOffPolicy';
	accrualFrequency: Maybe<AccrualFrequency>;
	accrualRate: Scalars['BigFloat']['output'];
	advanceNoticeDays: Maybe<Scalars['Int']['output']>;
	appliesToRoles: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Maybe<Scalars['UUID']['output']>;
	description: Maybe<Scalars['String']['output']>;
	effectiveDate: Maybe<Scalars['Date']['output']>;
	eligibilityMonths: Maybe<Scalars['Int']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	maxAccrual: Maybe<Scalars['BigFloat']['output']>;
	maxCarryForward: Maybe<Scalars['BigFloat']['output']>;
	maxConsecutiveDays: Maybe<Scalars['Int']['output']>;
	minIncrement: Maybe<Scalars['BigFloat']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	policyName: Scalars['String']['output'];
	requiresApproval: Maybe<Scalars['Boolean']['output']>;
	/** Reads and enables pagination through a set of `TimeOffBalance`. */
	timeOffBalanceSByPolicyId: TimeOffBalancesConnection;
	/** Reads and enables pagination through a set of `TimeOffRequest`. */
	timeOffRequestSByPolicyId: TimeOffRequestsConnection;
	timeOffType: TimeOffType;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `TimeOffPolicy`. */
	userByCreatedBy: Maybe<User>;
};

/** Time-off policies with accrual rules and limits */
export type TimeOffPolicyTimeOffBalanceSByPolicyIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffBalanceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffBalancesOrderBy>>;
};

/** Time-off policies with accrual rules and limits */
export type TimeOffPolicyTimeOffRequestSByPolicyIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/**
 * A condition to be used against `TimeOffPolicy` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type TimeOffPolicyCondition = {
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `TimeOffPolicy` */
export type TimeOffPolicyInput = {
	accrualFrequency?: InputMaybe<AccrualFrequency>;
	accrualRate?: InputMaybe<Scalars['BigFloat']['input']>;
	advanceNoticeDays?: InputMaybe<Scalars['Int']['input']>;
	appliesToRoles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	effectiveDate?: InputMaybe<Scalars['Date']['input']>;
	eligibilityMonths?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	maxAccrual?: InputMaybe<Scalars['BigFloat']['input']>;
	maxCarryForward?: InputMaybe<Scalars['BigFloat']['input']>;
	maxConsecutiveDays?: InputMaybe<Scalars['Int']['input']>;
	minIncrement?: InputMaybe<Scalars['BigFloat']['input']>;
	policyName: Scalars['String']['input'];
	requiresApproval?: InputMaybe<Scalars['Boolean']['input']>;
	timeOffType: TimeOffType;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `TimeOffPolicy`. Fields that are set will be updated. */
export type TimeOffPolicyPatch = {
	accrualFrequency?: InputMaybe<AccrualFrequency>;
	accrualRate?: InputMaybe<Scalars['BigFloat']['input']>;
	advanceNoticeDays?: InputMaybe<Scalars['Int']['input']>;
	appliesToRoles?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	effectiveDate?: InputMaybe<Scalars['Date']['input']>;
	eligibilityMonths?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	maxAccrual?: InputMaybe<Scalars['BigFloat']['input']>;
	maxCarryForward?: InputMaybe<Scalars['BigFloat']['input']>;
	maxConsecutiveDays?: InputMaybe<Scalars['Int']['input']>;
	minIncrement?: InputMaybe<Scalars['BigFloat']['input']>;
	policyName?: InputMaybe<Scalars['String']['input']>;
	requiresApproval?: InputMaybe<Scalars['Boolean']['input']>;
	timeOffType?: InputMaybe<TimeOffType>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Employee time-off requests with approval workflow */
export type TimeOffRequest = Node & {
	__typename: 'TimeOffRequest';
	approvalLevel: Maybe<Scalars['Int']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	endDate: Scalars['Date']['output'];
	/** Hours requested for time off (8 hours = 1 day typically) */
	hoursRequested: Scalars['BigFloat']['output'];
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	notes: Maybe<Scalars['String']['output']>;
	policyId: Scalars['UUID']['output'];
	reason: Maybe<Scalars['String']['output']>;
	reviewedAt: Maybe<Scalars['Datetime']['output']>;
	reviewedBy: Maybe<Scalars['UUID']['output']>;
	reviewerNotes: Maybe<Scalars['String']['output']>;
	startDate: Scalars['Date']['output'];
	status: Maybe<RequestStatus>;
	submittedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffRequest`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByReviewedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `TimeOffRequest` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type TimeOffRequestCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `policyId` field. */
	policyId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `reviewedBy` field. */
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `startDate` field. */
	startDate?: InputMaybe<Scalars['Date']['input']>;
	/** Checks for equality with the object’s `submittedAt` field. */
	submittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `TimeOffRequest` */
export type TimeOffRequestInput = {
	approvalLevel?: InputMaybe<Scalars['Int']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	endDate: Scalars['Date']['input'];
	/** Hours requested for time off (8 hours = 1 day typically) */
	hoursRequested: Scalars['BigFloat']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	notes?: InputMaybe<Scalars['String']['input']>;
	policyId: Scalars['UUID']['input'];
	reason?: InputMaybe<Scalars['String']['input']>;
	reviewedAt?: InputMaybe<Scalars['Datetime']['input']>;
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	reviewerNotes?: InputMaybe<Scalars['String']['input']>;
	startDate: Scalars['Date']['input'];
	status?: InputMaybe<RequestStatus>;
	submittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `TimeOffRequest`. Fields that are set will be updated. */
export type TimeOffRequestPatch = {
	approvalLevel?: InputMaybe<Scalars['Int']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	endDate?: InputMaybe<Scalars['Date']['input']>;
	/** Hours requested for time off (8 hours = 1 day typically) */
	hoursRequested?: InputMaybe<Scalars['BigFloat']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	notes?: InputMaybe<Scalars['String']['input']>;
	policyId?: InputMaybe<Scalars['UUID']['input']>;
	reason?: InputMaybe<Scalars['String']['input']>;
	reviewedAt?: InputMaybe<Scalars['Datetime']['input']>;
	reviewedBy?: InputMaybe<Scalars['UUID']['input']>;
	reviewerNotes?: InputMaybe<Scalars['String']['input']>;
	startDate?: InputMaybe<Scalars['Date']['input']>;
	status?: InputMaybe<RequestStatus>;
	submittedAt?: InputMaybe<Scalars['Datetime']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `TimeOffRequest` values. */
export type TimeOffRequestsConnection = {
	__typename: 'TimeOffRequestsConnection';
	/** A list of edges which contains the `TimeOffRequest` and cursor to aid in pagination. */
	edges: Array<TimeOffRequestsEdge>;
	/** A list of `TimeOffRequest` objects. */
	nodes: Array<TimeOffRequest>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `TimeOffRequest` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `TimeOffRequest` edge in the connection. */
export type TimeOffRequestsEdge = {
	__typename: 'TimeOffRequestsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `TimeOffRequest` at the end of the edge. */
	node: TimeOffRequest;
};

/** Methods to use when ordering `TimeOffRequest`. */
export type TimeOffRequestsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'POLICY_ID_ASC'
	| 'POLICY_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'REVIEWED_BY_ASC'
	| 'REVIEWED_BY_DESC'
	| 'START_DATE_ASC'
	| 'START_DATE_DESC'
	| 'SUBMITTED_AT_ASC'
	| 'SUBMITTED_AT_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

export type TimeOffType =
	| 'BEREAVEMENT'
	| 'COMP_TIME'
	| 'HOLIDAY'
	| 'JURY_DUTY'
	| 'MATERNITY_PATERNITY'
	| 'PERSONAL_TIME'
	| 'SICK_LEAVE'
	| 'UNPAID_LEAVE'
	| 'VACATION';

/** All input for the `trackDataLineage` mutation. */
export type TrackDataLineageInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pAction?: InputMaybe<DataLineageAction>;
	pComplianceRequirement?: InputMaybe<Scalars['String']['input']>;
	pSourceRecordId?: InputMaybe<Scalars['UUID']['input']>;
	pSourceTable?: InputMaybe<Scalars['String']['input']>;
	pTargetRecordId?: InputMaybe<Scalars['UUID']['input']>;
	pTargetTable?: InputMaybe<Scalars['String']['input']>;
	pTransformationDetails?: InputMaybe<Scalars['JSON']['input']>;
	pTransformationType?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `trackDataLineage` mutation. */
export type TrackDataLineagePayload = {
	__typename: 'TrackDataLineagePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	lineageId: Maybe<Scalars['UUID']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `trackFailedLogin` mutation. */
export type TrackFailedLoginInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pEmail?: InputMaybe<Scalars['String']['input']>;
	pFailureReason?: InputMaybe<Scalars['String']['input']>;
	pIpAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	pUserAgent?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `trackFailedLogin` mutation. */
export type TrackFailedLoginPayload = {
	__typename: 'TrackFailedLoginPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `triggerWorkflow` mutation. */
export type TriggerWorkflowInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pTriggerData?: InputMaybe<Scalars['JSON']['input']>;
	pTriggerType?: InputMaybe<WorkflowTriggerType>;
	pTriggeredByUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `triggerWorkflow` mutation. */
export type TriggerWorkflowPayload = {
	__typename: 'TriggerWorkflowPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	uuids: Maybe<Array<Maybe<Scalars['UUID']['output']>>>;
};

/** All input for the `triggerWorkflowSimple` mutation. */
export type TriggerWorkflowSimpleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pTriggerData?: InputMaybe<Scalars['JSON']['input']>;
	pTriggerType?: InputMaybe<WorkflowTriggerType>;
};

/** The output of our `triggerWorkflowSimple` mutation. */
export type TriggerWorkflowSimplePayload = {
	__typename: 'TriggerWorkflowSimplePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	workflowInstanceId: Maybe<Scalars['UUID']['output']>;
};

/** All input for the `unsubscribeFromNotifications` mutation. */
export type UnsubscribeFromNotificationsInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pResourceId?: InputMaybe<Scalars['UUID']['input']>;
	pResourceType?: InputMaybe<Scalars['String']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `unsubscribeFromNotifications` mutation. */
export type UnsubscribeFromNotificationsPayload = {
	__typename: 'UnsubscribeFromNotificationsPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `updateAuditLogById` mutation. */
export type UpdateAuditLogByIdInput = {
	/** An object where the defined keys will be set on the `AuditLog` being updated. */
	auditLogPatch: AuditLogPatch;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateAuditLog` mutation. */
export type UpdateAuditLogInput = {
	/** An object where the defined keys will be set on the `AuditLog` being updated. */
	auditLogPatch: AuditLogPatch;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `AuditLog` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `AuditLog` mutation. */
export type UpdateAuditLogPayload = {
	__typename: 'UpdateAuditLogPayload';
	/** The `AuditLog` that was updated by this mutation. */
	auditLog: Maybe<AuditLog>;
	/** An edge for our `AuditLog`. May be used by Relay 1. */
	auditLogEdge: Maybe<AuditLogsEdge>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `AuditLog`. */
	userByUserId: Maybe<User>;
	/** Reads a single `UserSession` that is related to this `AuditLog`. */
	userSessionBySessionId: Maybe<UserSession>;
};

/** The output of our update `AuditLog` mutation. */
export type UpdateAuditLogPayloadAuditLogEdgeArgs = {
	orderBy?: InputMaybe<Array<AuditLogsOrderBy>>;
};

/** All input for the `updateAuthSessionById` mutation. */
export type UpdateAuthSessionByIdInput = {
	/** An object where the defined keys will be set on the `AuthSession` being updated. */
	authSessionPatch: AuthSessionPatch;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateAuthSession` mutation. */
export type UpdateAuthSessionInput = {
	/** An object where the defined keys will be set on the `AuthSession` being updated. */
	authSessionPatch: AuthSessionPatch;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `AuthSession` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `AuthSession` mutation. */
export type UpdateAuthSessionPayload = {
	__typename: 'UpdateAuthSessionPayload';
	/** The `AuthSession` that was updated by this mutation. */
	authSession: Maybe<AuthSession>;
	/** An edge for our `AuthSession`. May be used by Relay 1. */
	authSessionEdge: Maybe<AuthSessionsEdge>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `AuthSession`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `AuthSession` mutation. */
export type UpdateAuthSessionPayloadAuthSessionEdgeArgs = {
	orderBy?: InputMaybe<Array<AuthSessionsOrderBy>>;
};

/** All input for the `updateCompetencyById` mutation. */
export type UpdateCompetencyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `Competency` being updated. */
	competencyPatch: CompetencyPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateCompetency` mutation. */
export type UpdateCompetencyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `Competency` being updated. */
	competencyPatch: CompetencyPatch;
	/** The globally unique `ID` which will identify a single `Competency` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `Competency` mutation. */
export type UpdateCompetencyPayload = {
	__typename: 'UpdateCompetencyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Competency` that was updated by this mutation. */
	competency: Maybe<Competency>;
	/** An edge for our `Competency`. May be used by Relay 1. */
	competencyEdge: Maybe<CompetenciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `Competency` mutation. */
export type UpdateCompetencyPayloadCompetencyEdgeArgs = {
	orderBy?: InputMaybe<Array<CompetenciesOrderBy>>;
};

/** All input for the `updateCompetencyRatingById` mutation. */
export type UpdateCompetencyRatingByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `CompetencyRating` being updated. */
	competencyRatingPatch: CompetencyRatingPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateCompetencyRatingByReviewIdAndCompetencyId` mutation. */
export type UpdateCompetencyRatingByReviewIdAndCompetencyIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	competencyId: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `CompetencyRating` being updated. */
	competencyRatingPatch: CompetencyRatingPatch;
	reviewId: Scalars['UUID']['input'];
};

/** All input for the `updateCompetencyRating` mutation. */
export type UpdateCompetencyRatingInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `CompetencyRating` being updated. */
	competencyRatingPatch: CompetencyRatingPatch;
	/** The globally unique `ID` which will identify a single `CompetencyRating` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `CompetencyRating` mutation. */
export type UpdateCompetencyRatingPayload = {
	__typename: 'UpdateCompetencyRatingPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Competency` that is related to this `CompetencyRating`. */
	competencyByCompetencyId: Maybe<Competency>;
	/** The `CompetencyRating` that was updated by this mutation. */
	competencyRating: Maybe<CompetencyRating>;
	/** An edge for our `CompetencyRating`. May be used by Relay 1. */
	competencyRatingEdge: Maybe<CompetencyRatingsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `CompetencyRating`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `CompetencyRating` mutation. */
export type UpdateCompetencyRatingPayloadCompetencyRatingEdgeArgs = {
	orderBy?: InputMaybe<Array<CompetencyRatingsOrderBy>>;
};

/** All input for the `updateConsentRecordById` mutation. */
export type UpdateConsentRecordByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ConsentRecord` being updated. */
	consentRecordPatch: ConsentRecordPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateConsentRecordByUserIdAndConsentTypeAndConsentVersion` mutation. */
export type UpdateConsentRecordByUserIdAndConsentTypeAndConsentVersionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ConsentRecord` being updated. */
	consentRecordPatch: ConsentRecordPatch;
	consentType: Scalars['String']['input'];
	consentVersion: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `updateConsentRecord` mutation. */
export type UpdateConsentRecordInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ConsentRecord` being updated. */
	consentRecordPatch: ConsentRecordPatch;
	/** The globally unique `ID` which will identify a single `ConsentRecord` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `ConsentRecord` mutation. */
export type UpdateConsentRecordPayload = {
	__typename: 'UpdateConsentRecordPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ConsentRecord` that was updated by this mutation. */
	consentRecord: Maybe<ConsentRecord>;
	/** An edge for our `ConsentRecord`. May be used by Relay 1. */
	consentRecordEdge: Maybe<ConsentRecordsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ConsentRecord`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `ConsentRecord` mutation. */
export type UpdateConsentRecordPayloadConsentRecordEdgeArgs = {
	orderBy?: InputMaybe<Array<ConsentRecordsOrderBy>>;
};

/** All input for the `updateContactInfoById` mutation. */
export type UpdateContactInfoByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ContactInfo` being updated. */
	contactInfoPatch: ContactInfoPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateContactInfo` mutation. */
export type UpdateContactInfoInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ContactInfo` being updated. */
	contactInfoPatch: ContactInfoPatch;
	/** The globally unique `ID` which will identify a single `ContactInfo` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `ContactInfo` mutation. */
export type UpdateContactInfoPayload = {
	__typename: 'UpdateContactInfoPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ContactInfo` that was updated by this mutation. */
	contactInfo: Maybe<ContactInfo>;
	/** An edge for our `ContactInfo`. May be used by Relay 1. */
	contactInfoEdge: Maybe<ContactInfosEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ContactInfo`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our update `ContactInfo` mutation. */
export type UpdateContactInfoPayloadContactInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<ContactInfosOrderBy>>;
};

/** All input for the `updateDataBreachIncidentById` mutation. */
export type UpdateDataBreachIncidentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataBreachIncident` being updated. */
	dataBreachIncidentPatch: DataBreachIncidentPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDataBreachIncidentByIncidentNumber` mutation. */
export type UpdateDataBreachIncidentByIncidentNumberInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataBreachIncident` being updated. */
	dataBreachIncidentPatch: DataBreachIncidentPatch;
	incidentNumber: Scalars['String']['input'];
};

/** All input for the `updateDataBreachIncident` mutation. */
export type UpdateDataBreachIncidentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataBreachIncident` being updated. */
	dataBreachIncidentPatch: DataBreachIncidentPatch;
	/** The globally unique `ID` which will identify a single `DataBreachIncident` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DataBreachIncident` mutation. */
export type UpdateDataBreachIncidentPayload = {
	__typename: 'UpdateDataBreachIncidentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataBreachIncident` that was updated by this mutation. */
	dataBreachIncident: Maybe<DataBreachIncident>;
	/** An edge for our `DataBreachIncident`. May be used by Relay 1. */
	dataBreachIncidentEdge: Maybe<DataBreachIncidentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `DataBreachIncident` mutation. */
export type UpdateDataBreachIncidentPayloadDataBreachIncidentEdgeArgs = {
	orderBy?: InputMaybe<Array<DataBreachIncidentsOrderBy>>;
};

/** All input for the `updateDataLineageById` mutation. */
export type UpdateDataLineageByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataLineage` being updated. */
	dataLineagePatch: DataLineagePatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDataLineage` mutation. */
export type UpdateDataLineageInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataLineage` being updated. */
	dataLineagePatch: DataLineagePatch;
	/** The globally unique `ID` which will identify a single `DataLineage` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DataLineage` mutation. */
export type UpdateDataLineagePayload = {
	__typename: 'UpdateDataLineagePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataLineage` that was updated by this mutation. */
	dataLineage: Maybe<DataLineage>;
	/** An edge for our `DataLineage`. May be used by Relay 1. */
	dataLineageEdge: Maybe<DataLineagesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DataLineage`. */
	userByPerformedByUserId: Maybe<User>;
};

/** The output of our update `DataLineage` mutation. */
export type UpdateDataLineagePayloadDataLineageEdgeArgs = {
	orderBy?: InputMaybe<Array<DataLineagesOrderBy>>;
};

/** All input for the `updateDataProtectionMetadatumById` mutation. */
export type UpdateDataProtectionMetadatumByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataProtectionMetadatum` being updated. */
	dataProtectionMetadatumPatch: DataProtectionMetadatumPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDataProtectionMetadatum` mutation. */
export type UpdateDataProtectionMetadatumInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataProtectionMetadatum` being updated. */
	dataProtectionMetadatumPatch: DataProtectionMetadatumPatch;
	/** The globally unique `ID` which will identify a single `DataProtectionMetadatum` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DataProtectionMetadatum` mutation. */
export type UpdateDataProtectionMetadatumPayload = {
	__typename: 'UpdateDataProtectionMetadatumPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataProtectionMetadatum` that was updated by this mutation. */
	dataProtectionMetadatum: Maybe<DataProtectionMetadatum>;
	/** An edge for our `DataProtectionMetadatum`. May be used by Relay 1. */
	dataProtectionMetadatumEdge: Maybe<DataProtectionMetadataEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `DataProtectionMetadatum` mutation. */
export type UpdateDataProtectionMetadatumPayloadDataProtectionMetadatumEdgeArgs = {
	orderBy?: InputMaybe<Array<DataProtectionMetadataOrderBy>>;
};

/** All input for the `updateDataRetentionPolicyById` mutation. */
export type UpdateDataRetentionPolicyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataRetentionPolicy` being updated. */
	dataRetentionPolicyPatch: DataRetentionPolicyPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDataRetentionPolicyByPolicyName` mutation. */
export type UpdateDataRetentionPolicyByPolicyNameInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataRetentionPolicy` being updated. */
	dataRetentionPolicyPatch: DataRetentionPolicyPatch;
	policyName: Scalars['String']['input'];
};

/** All input for the `updateDataRetentionPolicy` mutation. */
export type UpdateDataRetentionPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DataRetentionPolicy` being updated. */
	dataRetentionPolicyPatch: DataRetentionPolicyPatch;
	/** The globally unique `ID` which will identify a single `DataRetentionPolicy` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DataRetentionPolicy` mutation. */
export type UpdateDataRetentionPolicyPayload = {
	__typename: 'UpdateDataRetentionPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DataRetentionPolicy` that was updated by this mutation. */
	dataRetentionPolicy: Maybe<DataRetentionPolicy>;
	/** An edge for our `DataRetentionPolicy`. May be used by Relay 1. */
	dataRetentionPolicyEdge: Maybe<DataRetentionPoliciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `DataRetentionPolicy` mutation. */
export type UpdateDataRetentionPolicyPayloadDataRetentionPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<DataRetentionPoliciesOrderBy>>;
};

/** All input for the `updateDeliveryStatus` mutation. */
export type UpdateDeliveryStatusInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pDeliveryId?: InputMaybe<Scalars['UUID']['input']>;
	pErrorMessage?: InputMaybe<Scalars['String']['input']>;
	pExternalId?: InputMaybe<Scalars['String']['input']>;
	pStatus?: InputMaybe<DeliveryStatus>;
};

/** The output of our `updateDeliveryStatus` mutation. */
export type UpdateDeliveryStatusPayload = {
	__typename: 'UpdateDeliveryStatusPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** All input for the `updateDepartmentById` mutation. */
export type UpdateDepartmentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `Department` being updated. */
	departmentPatch: DepartmentPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDepartment` mutation. */
export type UpdateDepartmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `Department` being updated. */
	departmentPatch: DepartmentPatch;
	/** The globally unique `ID` which will identify a single `Department` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `Department` mutation. */
export type UpdateDepartmentPayload = {
	__typename: 'UpdateDepartmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Department` that was updated by this mutation. */
	department: Maybe<Department>;
	/** Reads a single `Department` that is related to this `Department`. */
	departmentByParentDepartmentId: Maybe<Department>;
	/** An edge for our `Department`. May be used by Relay 1. */
	departmentEdge: Maybe<DepartmentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `Department`. */
	userByManagerId: Maybe<User>;
};

/** The output of our update `Department` mutation. */
export type UpdateDepartmentPayloadDepartmentEdgeArgs = {
	orderBy?: InputMaybe<Array<DepartmentsOrderBy>>;
};

/** All input for the `updateDocumentAccessByDocumentIdAndUserIdAndAccessType` mutation. */
export type UpdateDocumentAccessByDocumentIdAndUserIdAndAccessTypeInput = {
	accessType: Scalars['String']['input'];
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentAccess` being updated. */
	documentAccessPatch: DocumentAccessPatch;
	documentId: Scalars['UUID']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `updateDocumentAccessById` mutation. */
export type UpdateDocumentAccessByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentAccess` being updated. */
	documentAccessPatch: DocumentAccessPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDocumentAccess` mutation. */
export type UpdateDocumentAccessInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentAccess` being updated. */
	documentAccessPatch: DocumentAccessPatch;
	/** The globally unique `ID` which will identify a single `DocumentAccess` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DocumentAccess` mutation. */
export type UpdateDocumentAccessPayload = {
	__typename: 'UpdateDocumentAccessPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DocumentAccess` that was updated by this mutation. */
	documentAccess: Maybe<DocumentAccess>;
	/** An edge for our `DocumentAccess`. May be used by Relay 1. */
	documentAccessEdge: Maybe<DocumentAccessesEdge>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentAccess`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByGrantedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `DocumentAccess`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `DocumentAccess` mutation. */
export type UpdateDocumentAccessPayloadDocumentAccessEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** All input for the `updateDocumentSignatureByDocumentIdAndSignerIdAndSignatureType` mutation. */
export type UpdateDocumentSignatureByDocumentIdAndSignerIdAndSignatureTypeInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	documentId: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `DocumentSignature` being updated. */
	documentSignaturePatch: DocumentSignaturePatch;
	signatureType: Scalars['String']['input'];
	signerId: Scalars['UUID']['input'];
};

/** All input for the `updateDocumentSignatureById` mutation. */
export type UpdateDocumentSignatureByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentSignature` being updated. */
	documentSignaturePatch: DocumentSignaturePatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDocumentSignature` mutation. */
export type UpdateDocumentSignatureInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentSignature` being updated. */
	documentSignaturePatch: DocumentSignaturePatch;
	/** The globally unique `ID` which will identify a single `DocumentSignature` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DocumentSignature` mutation. */
export type UpdateDocumentSignaturePayload = {
	__typename: 'UpdateDocumentSignaturePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DocumentSignature` that was updated by this mutation. */
	documentSignature: Maybe<DocumentSignature>;
	/** An edge for our `DocumentSignature`. May be used by Relay 1. */
	documentSignatureEdge: Maybe<DocumentSignaturesEdge>;
	/** Reads a single `EmployeeDocument` that is related to this `DocumentSignature`. */
	employeeDocumentByDocumentId: Maybe<EmployeeDocument>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentSignature`. */
	userBySignerId: Maybe<User>;
};

/** The output of our update `DocumentSignature` mutation. */
export type UpdateDocumentSignaturePayloadDocumentSignatureEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentSignaturesOrderBy>>;
};

/** All input for the `updateDocumentTemplateById` mutation. */
export type UpdateDocumentTemplateByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentTemplate` being updated. */
	documentTemplatePatch: DocumentTemplatePatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateDocumentTemplateByTemplateNameAndVersion` mutation. */
export type UpdateDocumentTemplateByTemplateNameAndVersionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentTemplate` being updated. */
	documentTemplatePatch: DocumentTemplatePatch;
	templateName: Scalars['String']['input'];
	version: Scalars['String']['input'];
};

/** All input for the `updateDocumentTemplate` mutation. */
export type UpdateDocumentTemplateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `DocumentTemplate` being updated. */
	documentTemplatePatch: DocumentTemplatePatch;
	/** The globally unique `ID` which will identify a single `DocumentTemplate` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `DocumentTemplate` mutation. */
export type UpdateDocumentTemplatePayload = {
	__typename: 'UpdateDocumentTemplatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `DocumentTemplate` that was updated by this mutation. */
	documentTemplate: Maybe<DocumentTemplate>;
	/** Reads a single `DocumentTemplate` that is related to this `DocumentTemplate`. */
	documentTemplateByPreviousVersionId: Maybe<DocumentTemplate>;
	/** An edge for our `DocumentTemplate`. May be used by Relay 1. */
	documentTemplateEdge: Maybe<DocumentTemplatesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `DocumentTemplate`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our update `DocumentTemplate` mutation. */
export type UpdateDocumentTemplatePayloadDocumentTemplateEdgeArgs = {
	orderBy?: InputMaybe<Array<DocumentTemplatesOrderBy>>;
};

/** All input for the `updateEmployeeDocumentById` mutation. */
export type UpdateEmployeeDocumentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `EmployeeDocument` being updated. */
	employeeDocumentPatch: EmployeeDocumentPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateEmployeeDocument` mutation. */
export type UpdateEmployeeDocumentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `EmployeeDocument` being updated. */
	employeeDocumentPatch: EmployeeDocumentPatch;
	/** The globally unique `ID` which will identify a single `EmployeeDocument` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `EmployeeDocument` mutation. */
export type UpdateEmployeeDocumentPayload = {
	__typename: 'UpdateEmployeeDocumentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `DocumentTemplate` that is related to this `EmployeeDocument`. */
	documentTemplateByTemplateId: Maybe<DocumentTemplate>;
	/** The `EmployeeDocument` that was updated by this mutation. */
	employeeDocument: Maybe<EmployeeDocument>;
	/** An edge for our `EmployeeDocument`. May be used by Relay 1. */
	employeeDocumentEdge: Maybe<EmployeeDocumentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeDocument`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our update `EmployeeDocument` mutation. */
export type UpdateEmployeeDocumentPayloadEmployeeDocumentEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/** All input for the `updateEmployeeGoalById` mutation. */
export type UpdateEmployeeGoalByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `EmployeeGoal` being updated. */
	employeeGoalPatch: EmployeeGoalPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateEmployeeGoal` mutation. */
export type UpdateEmployeeGoalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `EmployeeGoal` being updated. */
	employeeGoalPatch: EmployeeGoalPatch;
	/** The globally unique `ID` which will identify a single `EmployeeGoal` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `EmployeeGoal` mutation. */
export type UpdateEmployeeGoalPayload = {
	__typename: 'UpdateEmployeeGoalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `EmployeeGoal` that was updated by this mutation. */
	employeeGoal: Maybe<EmployeeGoal>;
	/** An edge for our `EmployeeGoal`. May be used by Relay 1. */
	employeeGoalEdge: Maybe<EmployeeGoalsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `EmployeeGoal`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our update `EmployeeGoal` mutation. */
export type UpdateEmployeeGoalPayloadEmployeeGoalEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** All input for the `updateErasureRequestById` mutation. */
export type UpdateErasureRequestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ErasureRequest` being updated. */
	erasureRequestPatch: ErasureRequestPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateErasureRequest` mutation. */
export type UpdateErasureRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `ErasureRequest` being updated. */
	erasureRequestPatch: ErasureRequestPatch;
	/** The globally unique `ID` which will identify a single `ErasureRequest` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `ErasureRequest` mutation. */
export type UpdateErasureRequestPayload = {
	__typename: 'UpdateErasureRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ErasureRequest` that was updated by this mutation. */
	erasureRequest: Maybe<ErasureRequest>;
	/** An edge for our `ErasureRequest`. May be used by Relay 1. */
	erasureRequestEdge: Maybe<ErasureRequestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `ErasureRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `ErasureRequest` mutation. */
export type UpdateErasureRequestPayloadErasureRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<ErasureRequestsOrderBy>>;
};

/** All input for the `updateFailedLoginAttemptById` mutation. */
export type UpdateFailedLoginAttemptByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `FailedLoginAttempt` being updated. */
	failedLoginAttemptPatch: FailedLoginAttemptPatch;
	id: Scalars['UUID']['input'];
};

/** All input for the `updateFailedLoginAttempt` mutation. */
export type UpdateFailedLoginAttemptInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `FailedLoginAttempt` being updated. */
	failedLoginAttemptPatch: FailedLoginAttemptPatch;
	/** The globally unique `ID` which will identify a single `FailedLoginAttempt` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `FailedLoginAttempt` mutation. */
export type UpdateFailedLoginAttemptPayload = {
	__typename: 'UpdateFailedLoginAttemptPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `FailedLoginAttempt` that was updated by this mutation. */
	failedLoginAttempt: Maybe<FailedLoginAttempt>;
	/** An edge for our `FailedLoginAttempt`. May be used by Relay 1. */
	failedLoginAttemptEdge: Maybe<FailedLoginAttemptsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `FailedLoginAttempt` mutation. */
export type UpdateFailedLoginAttemptPayloadFailedLoginAttemptEdgeArgs = {
	orderBy?: InputMaybe<Array<FailedLoginAttemptsOrderBy>>;
};

/** All input for the `updateGoalProgress` mutation. */
export type UpdateGoalProgressInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pEmployeeId?: InputMaybe<Scalars['UUID']['input']>;
	pGoalId?: InputMaybe<Scalars['UUID']['input']>;
	pNotes?: InputMaybe<Scalars['String']['input']>;
	pProgressPercentage?: InputMaybe<Scalars['Int']['input']>;
	pStatus?: InputMaybe<GoalStatus>;
};

/** The output of our `updateGoalProgress` mutation. */
export type UpdateGoalProgressPayload = {
	__typename: 'UpdateGoalProgressPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	employeeGoal: Maybe<EmployeeGoal>;
	/** An edge for our `EmployeeGoal`. May be used by Relay 1. */
	employeeGoalEdge: Maybe<EmployeeGoalsEdge>;
	/** Reads a single `PerformanceReview` that is related to this `EmployeeGoal`. */
	performanceReviewByReviewId: Maybe<PerformanceReview>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `EmployeeGoal`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our `updateGoalProgress` mutation. */
export type UpdateGoalProgressPayloadEmployeeGoalEdgeArgs = {
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** All input for the `updateJobInfoById` mutation. */
export type UpdateJobInfoByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `JobInfo` being updated. */
	jobInfoPatch: JobInfoPatch;
};

/** All input for the `updateJobInfo` mutation. */
export type UpdateJobInfoInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `JobInfo` being updated. */
	jobInfoPatch: JobInfoPatch;
	/** The globally unique `ID` which will identify a single `JobInfo` to be updated. */
	nodeId: Scalars['ID']['input'];
};

/** The output of our update `JobInfo` mutation. */
export type UpdateJobInfoPayload = {
	__typename: 'UpdateJobInfoPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Department` that is related to this `JobInfo`. */
	departmentByDepartmentId: Maybe<Department>;
	/** The `JobInfo` that was updated by this mutation. */
	jobInfo: Maybe<JobInfo>;
	/** An edge for our `JobInfo`. May be used by Relay 1. */
	jobInfoEdge: Maybe<JobInfosEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByManagerId: Maybe<User>;
	/** Reads a single `User` that is related to this `JobInfo`. */
	userByReportsTo: Maybe<User>;
};

/** The output of our update `JobInfo` mutation. */
export type UpdateJobInfoPayloadJobInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** All input for the `updateMyContactInformation` mutation. */
export type UpdateMyContactInformationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pAddressLine1?: InputMaybe<Scalars['String']['input']>;
	pAddressLine2?: InputMaybe<Scalars['String']['input']>;
	pCity?: InputMaybe<Scalars['String']['input']>;
	pCountry?: InputMaybe<Scalars['String']['input']>;
	pEmergencyContactName?: InputMaybe<Scalars['String']['input']>;
	pEmergencyContactPhone?: InputMaybe<Scalars['String']['input']>;
	pPhoneNumber?: InputMaybe<Scalars['String']['input']>;
	pPostalCode?: InputMaybe<Scalars['String']['input']>;
	pStateProvince?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `updateMyContactInformation` mutation. */
export type UpdateMyContactInformationPayload = {
	__typename: 'UpdateMyContactInformationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** An edge for our `ContactInfo`. May be used by Relay 1. */
	contactInfoEdge: Maybe<ContactInfosEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	updatedContactInfo: Maybe<ContactInfo>;
	/** Reads a single `User` that is related to this `ContactInfo`. */
	userByEmployeeId: Maybe<User>;
};

/** The output of our `updateMyContactInformation` mutation. */
export type UpdateMyContactInformationPayloadContactInfoEdgeArgs = {
	orderBy?: InputMaybe<Array<ContactInfosOrderBy>>;
};

/** All input for the `updateNotificationById` mutation. */
export type UpdateNotificationByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `Notification` being updated. */
	notificationPatch: NotificationPatch;
};

/** All input for the `updateNotificationDeliveryById` mutation. */
export type UpdateNotificationDeliveryByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `NotificationDelivery` being updated. */
	notificationDeliveryPatch: NotificationDeliveryPatch;
};

/** All input for the `updateNotificationDelivery` mutation. */
export type UpdateNotificationDeliveryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationDelivery` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `NotificationDelivery` being updated. */
	notificationDeliveryPatch: NotificationDeliveryPatch;
};

/** The output of our update `NotificationDelivery` mutation. */
export type UpdateNotificationDeliveryPayload = {
	__typename: 'UpdateNotificationDeliveryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Notification` that is related to this `NotificationDelivery`. */
	notificationByNotificationId: Maybe<Notification>;
	/** The `NotificationDelivery` that was updated by this mutation. */
	notificationDelivery: Maybe<NotificationDelivery>;
	/** An edge for our `NotificationDelivery`. May be used by Relay 1. */
	notificationDeliveryEdge: Maybe<NotificationDeliveriesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationDelivery`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `NotificationDelivery` mutation. */
export type UpdateNotificationDeliveryPayloadNotificationDeliveryEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationDeliveriesOrderBy>>;
};

/** All input for the `updateNotificationDigestById` mutation. */
export type UpdateNotificationDigestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `NotificationDigest` being updated. */
	notificationDigestPatch: NotificationDigestPatch;
};

/** All input for the `updateNotificationDigest` mutation. */
export type UpdateNotificationDigestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationDigest` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `NotificationDigest` being updated. */
	notificationDigestPatch: NotificationDigestPatch;
};

/** The output of our update `NotificationDigest` mutation. */
export type UpdateNotificationDigestPayload = {
	__typename: 'UpdateNotificationDigestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationDigest` that was updated by this mutation. */
	notificationDigest: Maybe<NotificationDigest>;
	/** An edge for our `NotificationDigest`. May be used by Relay 1. */
	notificationDigestEdge: Maybe<NotificationDigestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationDigest`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `NotificationDigest` mutation. */
export type UpdateNotificationDigestPayloadNotificationDigestEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationDigestsOrderBy>>;
};

/** All input for the `updateNotification` mutation. */
export type UpdateNotificationInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `Notification` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `Notification` being updated. */
	notificationPatch: NotificationPatch;
};

/** The output of our update `Notification` mutation. */
export type UpdateNotificationPayload = {
	__typename: 'UpdateNotificationPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `Notification` that was updated by this mutation. */
	notification: Maybe<Notification>;
	/** Reads a single `Notification` that is related to this `Notification`. */
	notificationByParentNotificationId: Maybe<Notification>;
	/** An edge for our `Notification`. May be used by Relay 1. */
	notificationEdge: Maybe<NotificationsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `Notification`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `Notification` mutation. */
export type UpdateNotificationPayloadNotificationEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationsOrderBy>>;
};

/** All input for the `updateNotificationPreferenceById` mutation. */
export type UpdateNotificationPreferenceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `NotificationPreference` being updated. */
	notificationPreferencePatch: NotificationPreferencePatch;
};

/** All input for the `updateNotificationPreferenceByUserIdAndCategoryAndTemplateKey` mutation. */
export type UpdateNotificationPreferenceByUserIdAndCategoryAndTemplateKeyInput = {
	category: NotificationCategory;
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `NotificationPreference` being updated. */
	notificationPreferencePatch: NotificationPreferencePatch;
	templateKey: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `updateNotificationPreference` mutation. */
export type UpdateNotificationPreferenceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationPreference` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `NotificationPreference` being updated. */
	notificationPreferencePatch: NotificationPreferencePatch;
};

/** The output of our update `NotificationPreference` mutation. */
export type UpdateNotificationPreferencePayload = {
	__typename: 'UpdateNotificationPreferencePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationPreference` that was updated by this mutation. */
	notificationPreference: Maybe<NotificationPreference>;
	/** An edge for our `NotificationPreference`. May be used by Relay 1. */
	notificationPreferenceEdge: Maybe<NotificationPreferencesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationPreference`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `NotificationPreference` mutation. */
export type UpdateNotificationPreferencePayloadNotificationPreferenceEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationPreferencesOrderBy>>;
};

/** All input for the `updateNotificationSubscriptionById` mutation. */
export type UpdateNotificationSubscriptionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `NotificationSubscription` being updated. */
	notificationSubscriptionPatch: NotificationSubscriptionPatch;
};

/** All input for the `updateNotificationSubscriptionByUserIdAndResourceTypeAndResourceId` mutation. */
export type UpdateNotificationSubscriptionByUserIdAndResourceTypeAndResourceIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `NotificationSubscription` being updated. */
	notificationSubscriptionPatch: NotificationSubscriptionPatch;
	resourceId: Scalars['UUID']['input'];
	resourceType: Scalars['String']['input'];
	userId: Scalars['UUID']['input'];
};

/** All input for the `updateNotificationSubscription` mutation. */
export type UpdateNotificationSubscriptionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationSubscription` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `NotificationSubscription` being updated. */
	notificationSubscriptionPatch: NotificationSubscriptionPatch;
};

/** The output of our update `NotificationSubscription` mutation. */
export type UpdateNotificationSubscriptionPayload = {
	__typename: 'UpdateNotificationSubscriptionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationSubscription` that was updated by this mutation. */
	notificationSubscription: Maybe<NotificationSubscription>;
	/** An edge for our `NotificationSubscription`. May be used by Relay 1. */
	notificationSubscriptionEdge: Maybe<NotificationSubscriptionsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationSubscription`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `NotificationSubscription` mutation. */
export type UpdateNotificationSubscriptionPayloadNotificationSubscriptionEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationSubscriptionsOrderBy>>;
};

/** All input for the `updateNotificationTemplateById` mutation. */
export type UpdateNotificationTemplateByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `NotificationTemplate` being updated. */
	notificationTemplatePatch: NotificationTemplatePatch;
};

/** All input for the `updateNotificationTemplateByTemplateKey` mutation. */
export type UpdateNotificationTemplateByTemplateKeyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `NotificationTemplate` being updated. */
	notificationTemplatePatch: NotificationTemplatePatch;
	templateKey: Scalars['String']['input'];
};

/** All input for the `updateNotificationTemplate` mutation. */
export type UpdateNotificationTemplateInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `NotificationTemplate` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `NotificationTemplate` being updated. */
	notificationTemplatePatch: NotificationTemplatePatch;
};

/** The output of our update `NotificationTemplate` mutation. */
export type UpdateNotificationTemplatePayload = {
	__typename: 'UpdateNotificationTemplatePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `NotificationTemplate` that was updated by this mutation. */
	notificationTemplate: Maybe<NotificationTemplate>;
	/** Reads a single `NotificationTemplate` that is related to this `NotificationTemplate`. */
	notificationTemplateByPreviousVersionId: Maybe<NotificationTemplate>;
	/** An edge for our `NotificationTemplate`. May be used by Relay 1. */
	notificationTemplateEdge: Maybe<NotificationTemplatesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `NotificationTemplate`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our update `NotificationTemplate` mutation. */
export type UpdateNotificationTemplatePayloadNotificationTemplateEdgeArgs = {
	orderBy?: InputMaybe<Array<NotificationTemplatesOrderBy>>;
};

/** All input for the `updatePasswordPolicyById` mutation. */
export type UpdatePasswordPolicyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `PasswordPolicy` being updated. */
	passwordPolicyPatch: PasswordPolicyPatch;
};

/** All input for the `updatePasswordPolicyByPolicyName` mutation. */
export type UpdatePasswordPolicyByPolicyNameInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `PasswordPolicy` being updated. */
	passwordPolicyPatch: PasswordPolicyPatch;
	policyName: Scalars['String']['input'];
};

/** All input for the `updatePasswordPolicy` mutation. */
export type UpdatePasswordPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PasswordPolicy` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `PasswordPolicy` being updated. */
	passwordPolicyPatch: PasswordPolicyPatch;
};

/** The output of our update `PasswordPolicy` mutation. */
export type UpdatePasswordPolicyPayload = {
	__typename: 'UpdatePasswordPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PasswordPolicy` that was updated by this mutation. */
	passwordPolicy: Maybe<PasswordPolicy>;
	/** An edge for our `PasswordPolicy`. May be used by Relay 1. */
	passwordPolicyEdge: Maybe<PasswordPoliciesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `PasswordPolicy` mutation. */
export type UpdatePasswordPolicyPayloadPasswordPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<PasswordPoliciesOrderBy>>;
};

/** All input for the `updatePayrollPeriodById` mutation. */
export type UpdatePayrollPeriodByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `PayrollPeriod` being updated. */
	payrollPeriodPatch: PayrollPeriodPatch;
};

/** All input for the `updatePayrollPeriod` mutation. */
export type UpdatePayrollPeriodInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PayrollPeriod` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `PayrollPeriod` being updated. */
	payrollPeriodPatch: PayrollPeriodPatch;
};

/** The output of our update `PayrollPeriod` mutation. */
export type UpdatePayrollPeriodPayload = {
	__typename: 'UpdatePayrollPeriodPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PayrollPeriod` that was updated by this mutation. */
	payrollPeriod: Maybe<PayrollPeriod>;
	/** An edge for our `PayrollPeriod`. May be used by Relay 1. */
	payrollPeriodEdge: Maybe<PayrollPeriodsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByApprovedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByCreatedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `PayrollPeriod`. */
	userByProcessedBy: Maybe<User>;
};

/** The output of our update `PayrollPeriod` mutation. */
export type UpdatePayrollPeriodPayloadPayrollPeriodEdgeArgs = {
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** All input for the `updatePerformanceReviewByEmployeeIdAndCycleId` mutation. */
export type UpdatePerformanceReviewByEmployeeIdAndCycleIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	cycleId: Scalars['UUID']['input'];
	employeeId: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `PerformanceReview` being updated. */
	performanceReviewPatch: PerformanceReviewPatch;
};

/** All input for the `updatePerformanceReviewById` mutation. */
export type UpdatePerformanceReviewByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `PerformanceReview` being updated. */
	performanceReviewPatch: PerformanceReviewPatch;
};

/** All input for the `updatePerformanceReview` mutation. */
export type UpdatePerformanceReviewInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PerformanceReview` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `PerformanceReview` being updated. */
	performanceReviewPatch: PerformanceReviewPatch;
};

/** The output of our update `PerformanceReview` mutation. */
export type UpdatePerformanceReviewPayload = {
	__typename: 'UpdatePerformanceReviewPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PerformanceReview` that was updated by this mutation. */
	performanceReview: Maybe<PerformanceReview>;
	/** An edge for our `PerformanceReview`. May be used by Relay 1. */
	performanceReviewEdge: Maybe<PerformanceReviewsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `ReviewCycle` that is related to this `PerformanceReview`. */
	reviewCycleByCycleId: Maybe<ReviewCycle>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByEmployeeId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByHrReviewerId: Maybe<User>;
	/** Reads a single `User` that is related to this `PerformanceReview`. */
	userByManagerId: Maybe<User>;
};

/** The output of our update `PerformanceReview` mutation. */
export type UpdatePerformanceReviewPayloadPerformanceReviewEdgeArgs = {
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** All input for the `updatePrivacyImpactAssessmentByAssessmentReference` mutation. */
export type UpdatePrivacyImpactAssessmentByAssessmentReferenceInput = {
	assessmentReference: Scalars['String']['input'];
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `PrivacyImpactAssessment` being updated. */
	privacyImpactAssessmentPatch: PrivacyImpactAssessmentPatch;
};

/** All input for the `updatePrivacyImpactAssessmentById` mutation. */
export type UpdatePrivacyImpactAssessmentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `PrivacyImpactAssessment` being updated. */
	privacyImpactAssessmentPatch: PrivacyImpactAssessmentPatch;
};

/** All input for the `updatePrivacyImpactAssessment` mutation. */
export type UpdatePrivacyImpactAssessmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PrivacyImpactAssessment` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `PrivacyImpactAssessment` being updated. */
	privacyImpactAssessmentPatch: PrivacyImpactAssessmentPatch;
};

/** The output of our update `PrivacyImpactAssessment` mutation. */
export type UpdatePrivacyImpactAssessmentPayload = {
	__typename: 'UpdatePrivacyImpactAssessmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PrivacyImpactAssessment` that was updated by this mutation. */
	privacyImpactAssessment: Maybe<PrivacyImpactAssessment>;
	/** An edge for our `PrivacyImpactAssessment`. May be used by Relay 1. */
	privacyImpactAssessmentEdge: Maybe<PrivacyImpactAssessmentsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `PrivacyImpactAssessment` mutation. */
export type UpdatePrivacyImpactAssessmentPayloadPrivacyImpactAssessmentEdgeArgs = {
	orderBy?: InputMaybe<Array<PrivacyImpactAssessmentsOrderBy>>;
};

/** All input for the `updatePrivacyRequestById` mutation. */
export type UpdatePrivacyRequestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `PrivacyRequest` being updated. */
	privacyRequestPatch: PrivacyRequestPatch;
};

/** All input for the `updatePrivacyRequestByRequestNumber` mutation. */
export type UpdatePrivacyRequestByRequestNumberInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** An object where the defined keys will be set on the `PrivacyRequest` being updated. */
	privacyRequestPatch: PrivacyRequestPatch;
	requestNumber: Scalars['String']['input'];
};

/** All input for the `updatePrivacyRequest` mutation. */
export type UpdatePrivacyRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `PrivacyRequest` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `PrivacyRequest` being updated. */
	privacyRequestPatch: PrivacyRequestPatch;
};

/** The output of our update `PrivacyRequest` mutation. */
export type UpdatePrivacyRequestPayload = {
	__typename: 'UpdatePrivacyRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `PrivacyRequest` that was updated by this mutation. */
	privacyRequest: Maybe<PrivacyRequest>;
	/** An edge for our `PrivacyRequest`. May be used by Relay 1. */
	privacyRequestEdge: Maybe<PrivacyRequestsEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByAssignedTo: Maybe<User>;
	/** Reads a single `User` that is related to this `PrivacyRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `PrivacyRequest` mutation. */
export type UpdatePrivacyRequestPayloadPrivacyRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<PrivacyRequestsOrderBy>>;
};

/** All input for the `updateProcessingActivityById` mutation. */
export type UpdateProcessingActivityByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `ProcessingActivity` being updated. */
	processingActivityPatch: ProcessingActivityPatch;
};

/** All input for the `updateProcessingActivity` mutation. */
export type UpdateProcessingActivityInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ProcessingActivity` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `ProcessingActivity` being updated. */
	processingActivityPatch: ProcessingActivityPatch;
};

/** The output of our update `ProcessingActivity` mutation. */
export type UpdateProcessingActivityPayload = {
	__typename: 'UpdateProcessingActivityPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** The `ProcessingActivity` that was updated by this mutation. */
	processingActivity: Maybe<ProcessingActivity>;
	/** An edge for our `ProcessingActivity`. May be used by Relay 1. */
	processingActivityEdge: Maybe<ProcessingActivitiesEdge>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

/** The output of our update `ProcessingActivity` mutation. */
export type UpdateProcessingActivityPayloadProcessingActivityEdgeArgs = {
	orderBy?: InputMaybe<Array<ProcessingActivitiesOrderBy>>;
};

/** All input for the `updateReviewCycleById` mutation. */
export type UpdateReviewCycleByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `ReviewCycle` being updated. */
	reviewCyclePatch: ReviewCyclePatch;
};

/** All input for the `updateReviewCycle` mutation. */
export type UpdateReviewCycleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `ReviewCycle` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `ReviewCycle` being updated. */
	reviewCyclePatch: ReviewCyclePatch;
};

/** The output of our update `ReviewCycle` mutation. */
export type UpdateReviewCyclePayload = {
	__typename: 'UpdateReviewCyclePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `ReviewCycle` that was updated by this mutation. */
	reviewCycle: Maybe<ReviewCycle>;
	/** An edge for our `ReviewCycle`. May be used by Relay 1. */
	reviewCycleEdge: Maybe<ReviewCyclesEdge>;
	/** Reads a single `User` that is related to this `ReviewCycle`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our update `ReviewCycle` mutation. */
export type UpdateReviewCyclePayloadReviewCycleEdgeArgs = {
	orderBy?: InputMaybe<Array<ReviewCyclesOrderBy>>;
};

/** All input for the `updateSecurityEventById` mutation. */
export type UpdateSecurityEventByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `SecurityEvent` being updated. */
	securityEventPatch: SecurityEventPatch;
};

/** All input for the `updateSecurityEvent` mutation. */
export type UpdateSecurityEventInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `SecurityEvent` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `SecurityEvent` being updated. */
	securityEventPatch: SecurityEventPatch;
};

/** The output of our update `SecurityEvent` mutation. */
export type UpdateSecurityEventPayload = {
	__typename: 'UpdateSecurityEventPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `SecurityEvent` that was updated by this mutation. */
	securityEvent: Maybe<SecurityEvent>;
	/** An edge for our `SecurityEvent`. May be used by Relay 1. */
	securityEventEdge: Maybe<SecurityEventsEdge>;
	/** Reads a single `User` that is related to this `SecurityEvent`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `SecurityEvent` mutation. */
export type UpdateSecurityEventPayloadSecurityEventEdgeArgs = {
	orderBy?: InputMaybe<Array<SecurityEventsOrderBy>>;
};

/** All input for the `updateTimeOffBalanceById` mutation. */
export type UpdateTimeOffBalanceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `TimeOffBalance` being updated. */
	timeOffBalancePatch: TimeOffBalancePatch;
};

/** All input for the `updateTimeOffBalanceByUserIdAndPolicyIdAndYear` mutation. */
export type UpdateTimeOffBalanceByUserIdAndPolicyIdAndYearInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	policyId: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `TimeOffBalance` being updated. */
	timeOffBalancePatch: TimeOffBalancePatch;
	userId: Scalars['UUID']['input'];
	year: Scalars['Int']['input'];
};

/** All input for the `updateTimeOffBalance` mutation. */
export type UpdateTimeOffBalanceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `TimeOffBalance` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `TimeOffBalance` being updated. */
	timeOffBalancePatch: TimeOffBalancePatch;
};

/** The output of our update `TimeOffBalance` mutation. */
export type UpdateTimeOffBalancePayload = {
	__typename: 'UpdateTimeOffBalancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `TimeOffBalance` that was updated by this mutation. */
	timeOffBalance: Maybe<TimeOffBalance>;
	/** An edge for our `TimeOffBalance`. May be used by Relay 1. */
	timeOffBalanceEdge: Maybe<TimeOffBalancesEdge>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffBalance`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	/** Reads a single `User` that is related to this `TimeOffBalance`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `TimeOffBalance` mutation. */
export type UpdateTimeOffBalancePayloadTimeOffBalanceEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffBalancesOrderBy>>;
};

/** All input for the `updateTimeOffPolicyById` mutation. */
export type UpdateTimeOffPolicyByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `TimeOffPolicy` being updated. */
	timeOffPolicyPatch: TimeOffPolicyPatch;
};

/** All input for the `updateTimeOffPolicy` mutation. */
export type UpdateTimeOffPolicyInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `TimeOffPolicy` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `TimeOffPolicy` being updated. */
	timeOffPolicyPatch: TimeOffPolicyPatch;
};

/** The output of our update `TimeOffPolicy` mutation. */
export type UpdateTimeOffPolicyPayload = {
	__typename: 'UpdateTimeOffPolicyPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `TimeOffPolicy` that was updated by this mutation. */
	timeOffPolicy: Maybe<TimeOffPolicy>;
	/** An edge for our `TimeOffPolicy`. May be used by Relay 1. */
	timeOffPolicyEdge: Maybe<TimeOffPoliciesEdge>;
	/** Reads a single `User` that is related to this `TimeOffPolicy`. */
	userByCreatedBy: Maybe<User>;
};

/** The output of our update `TimeOffPolicy` mutation. */
export type UpdateTimeOffPolicyPayloadTimeOffPolicyEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffPoliciesOrderBy>>;
};

/** All input for the `updateTimeOffRequestById` mutation. */
export type UpdateTimeOffRequestByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `TimeOffRequest` being updated. */
	timeOffRequestPatch: TimeOffRequestPatch;
};

/** All input for the `updateTimeOffRequest` mutation. */
export type UpdateTimeOffRequestInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `TimeOffRequest` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `TimeOffRequest` being updated. */
	timeOffRequestPatch: TimeOffRequestPatch;
};

/** The output of our update `TimeOffRequest` mutation. */
export type UpdateTimeOffRequestPayload = {
	__typename: 'UpdateTimeOffRequestPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `TimeOffPolicy` that is related to this `TimeOffRequest`. */
	timeOffPolicyByPolicyId: Maybe<TimeOffPolicy>;
	/** The `TimeOffRequest` that was updated by this mutation. */
	timeOffRequest: Maybe<TimeOffRequest>;
	/** An edge for our `TimeOffRequest`. May be used by Relay 1. */
	timeOffRequestEdge: Maybe<TimeOffRequestsEdge>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByReviewedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `TimeOffRequest`. */
	userByUserId: Maybe<User>;
};

/** The output of our update `TimeOffRequest` mutation. */
export type UpdateTimeOffRequestPayloadTimeOffRequestEdgeArgs = {
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** All input for the `updateUserByEmail` mutation. */
export type UpdateUserByEmailInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	email: Scalars['String']['input'];
	/** An object where the defined keys will be set on the `User` being updated. */
	userPatch: UserPatch;
};

/** All input for the `updateUserById` mutation. */
export type UpdateUserByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `User` being updated. */
	userPatch: UserPatch;
};

/** All input for the `updateUserDeviceById` mutation. */
export type UpdateUserDeviceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserDevice` being updated. */
	userDevicePatch: UserDevicePatch;
};

/** All input for the `updateUserDeviceByUserIdAndDeviceId` mutation. */
export type UpdateUserDeviceByUserIdAndDeviceIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	deviceId: Scalars['String']['input'];
	/** An object where the defined keys will be set on the `UserDevice` being updated. */
	userDevicePatch: UserDevicePatch;
	userId: Scalars['UUID']['input'];
};

/** All input for the `updateUserDevice` mutation. */
export type UpdateUserDeviceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserDevice` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `UserDevice` being updated. */
	userDevicePatch: UserDevicePatch;
};

/** The output of our update `UserDevice` mutation. */
export type UpdateUserDevicePayload = {
	__typename: 'UpdateUserDevicePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserDevice`. */
	userByUserId: Maybe<User>;
	/** The `UserDevice` that was updated by this mutation. */
	userDevice: Maybe<UserDevice>;
	/** An edge for our `UserDevice`. May be used by Relay 1. */
	userDeviceEdge: Maybe<UserDevicesEdge>;
};

/** The output of our update `UserDevice` mutation. */
export type UpdateUserDevicePayloadUserDeviceEdgeArgs = {
	orderBy?: InputMaybe<Array<UserDevicesOrderBy>>;
};

/** All input for the `updateUser` mutation. */
export type UpdateUserInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `User` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `User` being updated. */
	userPatch: UserPatch;
};

/** All input for the `updateUserMfaSettingById` mutation. */
export type UpdateUserMfaSettingByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserMfaSetting` being updated. */
	userMfaSettingPatch: UserMfaSettingPatch;
};

/** All input for the `updateUserMfaSettingByUserId` mutation. */
export type UpdateUserMfaSettingByUserIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	userId: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserMfaSetting` being updated. */
	userMfaSettingPatch: UserMfaSettingPatch;
};

/** All input for the `updateUserMfaSetting` mutation. */
export type UpdateUserMfaSettingInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserMfaSetting` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `UserMfaSetting` being updated. */
	userMfaSettingPatch: UserMfaSettingPatch;
};

/** The output of our update `UserMfaSetting` mutation. */
export type UpdateUserMfaSettingPayload = {
	__typename: 'UpdateUserMfaSettingPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserMfaSetting`. */
	userByUserId: Maybe<User>;
	/** The `UserMfaSetting` that was updated by this mutation. */
	userMfaSetting: Maybe<UserMfaSetting>;
	/** An edge for our `UserMfaSetting`. May be used by Relay 1. */
	userMfaSettingEdge: Maybe<UserMfaSettingsEdge>;
};

/** The output of our update `UserMfaSetting` mutation. */
export type UpdateUserMfaSettingPayloadUserMfaSettingEdgeArgs = {
	orderBy?: InputMaybe<Array<UserMfaSettingsOrderBy>>;
};

/** All input for the `updateUserPasswordHistoryById` mutation. */
export type UpdateUserPasswordHistoryByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserPasswordHistory` being updated. */
	userPasswordHistoryPatch: UserPasswordHistoryPatch;
};

/** All input for the `updateUserPasswordHistory` mutation. */
export type UpdateUserPasswordHistoryInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserPasswordHistory` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `UserPasswordHistory` being updated. */
	userPasswordHistoryPatch: UserPasswordHistoryPatch;
};

/** The output of our update `UserPasswordHistory` mutation. */
export type UpdateUserPasswordHistoryPayload = {
	__typename: 'UpdateUserPasswordHistoryPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserPasswordHistory`. */
	userByUserId: Maybe<User>;
	/** The `UserPasswordHistory` that was updated by this mutation. */
	userPasswordHistory: Maybe<UserPasswordHistory>;
	/** An edge for our `UserPasswordHistory`. May be used by Relay 1. */
	userPasswordHistoryEdge: Maybe<UserPasswordHistoriesEdge>;
};

/** The output of our update `UserPasswordHistory` mutation. */
export type UpdateUserPasswordHistoryPayloadUserPasswordHistoryEdgeArgs = {
	orderBy?: InputMaybe<Array<UserPasswordHistoriesOrderBy>>;
};

/** The output of our update `User` mutation. */
export type UpdateUserPayload = {
	__typename: 'UpdateUserPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `User` that was updated by this mutation. */
	user: Maybe<User>;
	/** An edge for our `User`. May be used by Relay 1. */
	userEdge: Maybe<UsersEdge>;
};

/** The output of our update `User` mutation. */
export type UpdateUserPayloadUserEdgeArgs = {
	orderBy?: InputMaybe<Array<UsersOrderBy>>;
};

/** All input for the `updateUserRoleAssignmentById` mutation. */
export type UpdateUserRoleAssignmentByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserRoleAssignment` being updated. */
	userRoleAssignmentPatch: UserRoleAssignmentPatch;
};

/** All input for the `updateUserRoleAssignmentByUserIdAndRoleId` mutation. */
export type UpdateUserRoleAssignmentByUserIdAndRoleIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	roleId: Scalars['Int']['input'];
	userId: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserRoleAssignment` being updated. */
	userRoleAssignmentPatch: UserRoleAssignmentPatch;
};

/** All input for the `updateUserRoleAssignment` mutation. */
export type UpdateUserRoleAssignmentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserRoleAssignment` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `UserRoleAssignment` being updated. */
	userRoleAssignmentPatch: UserRoleAssignmentPatch;
};

/** The output of our update `UserRoleAssignment` mutation. */
export type UpdateUserRoleAssignmentPayload = {
	__typename: 'UpdateUserRoleAssignmentPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByAssignedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByUserId: Maybe<User>;
	/** The `UserRoleAssignment` that was updated by this mutation. */
	userRoleAssignment: Maybe<UserRoleAssignment>;
	/** An edge for our `UserRoleAssignment`. May be used by Relay 1. */
	userRoleAssignmentEdge: Maybe<UserRoleAssignmentsEdge>;
	/** Reads a single `UserRole` that is related to this `UserRoleAssignment`. */
	userRoleByRoleId: Maybe<UserRole>;
};

/** The output of our update `UserRoleAssignment` mutation. */
export type UpdateUserRoleAssignmentPayloadUserRoleAssignmentEdgeArgs = {
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

/** All input for the `updateUserRoleById` mutation. */
export type UpdateUserRoleByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['Int']['input'];
	/** An object where the defined keys will be set on the `UserRole` being updated. */
	userRolePatch: UserRolePatch;
};

/** All input for the `updateUserRoleByName` mutation. */
export type UpdateUserRoleByNameInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	name: Scalars['String']['input'];
	/** An object where the defined keys will be set on the `UserRole` being updated. */
	userRolePatch: UserRolePatch;
};

/** All input for the `updateUserRole` mutation. */
export type UpdateUserRoleInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserRole` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `UserRole` being updated. */
	userRolePatch: UserRolePatch;
};

/** The output of our update `UserRole` mutation. */
export type UpdateUserRolePayload = {
	__typename: 'UpdateUserRolePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `UserRole` that was updated by this mutation. */
	userRole: Maybe<UserRole>;
	/** An edge for our `UserRole`. May be used by Relay 1. */
	userRoleEdge: Maybe<UserRolesEdge>;
};

/** The output of our update `UserRole` mutation. */
export type UpdateUserRolePayloadUserRoleEdgeArgs = {
	orderBy?: InputMaybe<Array<UserRolesOrderBy>>;
};

/** All input for the `updateUserSessionById` mutation. */
export type UpdateUserSessionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `UserSession` being updated. */
	userSessionPatch: UserSessionPatch;
};

/** All input for the `updateUserSessionByRefreshToken` mutation. */
export type UpdateUserSessionByRefreshTokenInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	refreshToken: Scalars['String']['input'];
	/** An object where the defined keys will be set on the `UserSession` being updated. */
	userSessionPatch: UserSessionPatch;
};

/** All input for the `updateUserSessionBySessionToken` mutation. */
export type UpdateUserSessionBySessionTokenInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	sessionToken: Scalars['String']['input'];
	/** An object where the defined keys will be set on the `UserSession` being updated. */
	userSessionPatch: UserSessionPatch;
};

/** All input for the `updateUserSession` mutation. */
export type UpdateUserSessionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `UserSession` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `UserSession` being updated. */
	userSessionPatch: UserSessionPatch;
};

/** The output of our update `UserSession` mutation. */
export type UpdateUserSessionPayload = {
	__typename: 'UpdateUserSessionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** The `UserSession` that was updated by this mutation. */
	userSession: Maybe<UserSession>;
	/** An edge for our `UserSession`. May be used by Relay 1. */
	userSessionEdge: Maybe<UserSessionsEdge>;
};

/** The output of our update `UserSession` mutation. */
export type UpdateUserSessionPayloadUserSessionEdgeArgs = {
	orderBy?: InputMaybe<Array<UserSessionsOrderBy>>;
};

/** All input for the `updateWorkflowApprovalById` mutation. */
export type UpdateWorkflowApprovalByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `WorkflowApproval` being updated. */
	workflowApprovalPatch: WorkflowApprovalPatch;
};

/** All input for the `updateWorkflowApproval` mutation. */
export type UpdateWorkflowApprovalInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowApproval` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `WorkflowApproval` being updated. */
	workflowApprovalPatch: WorkflowApprovalPatch;
};

/** The output of our update `WorkflowApproval` mutation. */
export type UpdateWorkflowApprovalPayload = {
	__typename: 'UpdateWorkflowApprovalPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByApproverId: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByEscalatedToId: Maybe<User>;
	/** The `WorkflowApproval` that was updated by this mutation. */
	workflowApproval: Maybe<WorkflowApproval>;
	/** An edge for our `WorkflowApproval`. May be used by Relay 1. */
	workflowApprovalEdge: Maybe<WorkflowApprovalsEdge>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowApproval`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowApproval`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
};

/** The output of our update `WorkflowApproval` mutation. */
export type UpdateWorkflowApprovalPayloadWorkflowApprovalEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** All input for the `updateWorkflowDefinitionById` mutation. */
export type UpdateWorkflowDefinitionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `WorkflowDefinition` being updated. */
	workflowDefinitionPatch: WorkflowDefinitionPatch;
};

/** All input for the `updateWorkflowDefinitionByNameAndVersion` mutation. */
export type UpdateWorkflowDefinitionByNameAndVersionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	name: Scalars['String']['input'];
	version: Scalars['Int']['input'];
	/** An object where the defined keys will be set on the `WorkflowDefinition` being updated. */
	workflowDefinitionPatch: WorkflowDefinitionPatch;
};

/** All input for the `updateWorkflowDefinition` mutation. */
export type UpdateWorkflowDefinitionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowDefinition` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `WorkflowDefinition` being updated. */
	workflowDefinitionPatch: WorkflowDefinitionPatch;
};

/** The output of our update `WorkflowDefinition` mutation. */
export type UpdateWorkflowDefinitionPayload = {
	__typename: 'UpdateWorkflowDefinitionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Reads a single `Department` that is related to this `WorkflowDefinition`. */
	departmentByDepartmentId: Maybe<Department>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowDefinition`. */
	userByCreatedBy: Maybe<User>;
	/** The `WorkflowDefinition` that was updated by this mutation. */
	workflowDefinition: Maybe<WorkflowDefinition>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowDefinition`. */
	workflowDefinitionByParentWorkflowId: Maybe<WorkflowDefinition>;
	/** An edge for our `WorkflowDefinition`. May be used by Relay 1. */
	workflowDefinitionEdge: Maybe<WorkflowDefinitionsEdge>;
};

/** The output of our update `WorkflowDefinition` mutation. */
export type UpdateWorkflowDefinitionPayloadWorkflowDefinitionEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** All input for the `updateWorkflowInstanceById` mutation. */
export type UpdateWorkflowInstanceByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `WorkflowInstance` being updated. */
	workflowInstancePatch: WorkflowInstancePatch;
};

/** All input for the `updateWorkflowInstance` mutation. */
export type UpdateWorkflowInstanceInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowInstance` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `WorkflowInstance` being updated. */
	workflowInstancePatch: WorkflowInstancePatch;
};

/** The output of our update `WorkflowInstance` mutation. */
export type UpdateWorkflowInstancePayload = {
	__typename: 'UpdateWorkflowInstancePayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowInstance`. */
	userByTriggeredByUserId: Maybe<User>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowInstance`. */
	workflowDefinitionByWorkflowDefinitionId: Maybe<WorkflowDefinition>;
	/** The `WorkflowInstance` that was updated by this mutation. */
	workflowInstance: Maybe<WorkflowInstance>;
	/** An edge for our `WorkflowInstance`. May be used by Relay 1. */
	workflowInstanceEdge: Maybe<WorkflowInstancesEdge>;
};

/** The output of our update `WorkflowInstance` mutation. */
export type UpdateWorkflowInstancePayloadWorkflowInstanceEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowInstancesOrderBy>>;
};

/** All input for the `updateWorkflowStepExecutionById` mutation. */
export type UpdateWorkflowStepExecutionByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `WorkflowStepExecution` being updated. */
	workflowStepExecutionPatch: WorkflowStepExecutionPatch;
};

/** All input for the `updateWorkflowStepExecution` mutation. */
export type UpdateWorkflowStepExecutionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowStepExecution` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `WorkflowStepExecution` being updated. */
	workflowStepExecutionPatch: WorkflowStepExecutionPatch;
};

/** The output of our update `WorkflowStepExecution` mutation. */
export type UpdateWorkflowStepExecutionPayload = {
	__typename: 'UpdateWorkflowStepExecutionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowStepExecution`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** The `WorkflowStepExecution` that was updated by this mutation. */
	workflowStepExecution: Maybe<WorkflowStepExecution>;
	/** An edge for our `WorkflowStepExecution`. May be used by Relay 1. */
	workflowStepExecutionEdge: Maybe<WorkflowStepExecutionsEdge>;
};

/** The output of our update `WorkflowStepExecution` mutation. */
export type UpdateWorkflowStepExecutionPayloadWorkflowStepExecutionEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowStepExecutionsOrderBy>>;
};

/** All input for the `updateWorkflowTaskById` mutation. */
export type UpdateWorkflowTaskByIdInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	id: Scalars['UUID']['input'];
	/** An object where the defined keys will be set on the `WorkflowTask` being updated. */
	workflowTaskPatch: WorkflowTaskPatch;
};

/** All input for the `updateWorkflowTask` mutation. */
export type UpdateWorkflowTaskInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	/** The globally unique `ID` which will identify a single `WorkflowTask` to be updated. */
	nodeId: Scalars['ID']['input'];
	/** An object where the defined keys will be set on the `WorkflowTask` being updated. */
	workflowTaskPatch: WorkflowTaskPatch;
};

/** The output of our update `WorkflowTask` mutation. */
export type UpdateWorkflowTaskPayload = {
	__typename: 'UpdateWorkflowTaskPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedById: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedToId: Maybe<User>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowTask`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowTask`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
	/** The `WorkflowTask` that was updated by this mutation. */
	workflowTask: Maybe<WorkflowTask>;
	/** An edge for our `WorkflowTask`. May be used by Relay 1. */
	workflowTaskEdge: Maybe<WorkflowTasksEdge>;
};

/** The output of our update `WorkflowTask` mutation. */
export type UpdateWorkflowTaskPayloadWorkflowTaskEdgeArgs = {
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/** Core user accounts in the HR system */
export type User = Node & {
	__typename: 'User';
	/** Reads and enables pagination through a set of `AuditLog`. */
	auditLogsByUserId: AuditLogsConnection;
	/** Reads and enables pagination through a set of `AuthSession`. */
	authSessionsByUserId: AuthSessionsConnection;
	/** Reads and enables pagination through a set of `ConsentRecord`. */
	consentRecordsByUserId: ConsentRecordsConnection;
	/** Reads and enables pagination through a set of `ContactInfo`. */
	contactInfosByEmployeeId: ContactInfosConnection;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads and enables pagination through a set of `DataLineage`. */
	dataLineagesByPerformedByUserId: DataLineagesConnection;
	/** Reads and enables pagination through a set of `Department`. */
	departmentsByManagerId: DepartmentsConnection;
	displayName: Maybe<Scalars['String']['output']>;
	/** Reads and enables pagination through a set of `DocumentAccess`. */
	documentAccessesByGrantedBy: DocumentAccessesConnection;
	/** Reads and enables pagination through a set of `DocumentAccess`. */
	documentAccessesByUserId: DocumentAccessesConnection;
	/** Reads and enables pagination through a set of `DocumentSignature`. */
	documentSignaturesBySignerId: DocumentSignaturesConnection;
	/** Reads and enables pagination through a set of `DocumentTemplate`. */
	documentTemplatesByCreatedBy: DocumentTemplatesConnection;
	email: Scalars['String']['output'];
	/** Reads and enables pagination through a set of `EmployeeDocument`. */
	employeeDocumentsByCreatedBy: EmployeeDocumentsConnection;
	/** Reads and enables pagination through a set of `EmployeeDocument`. */
	employeeDocumentsByEmployeeId: EmployeeDocumentsConnection;
	/** Reads and enables pagination through a set of `EmployeeGoal`. */
	employeeGoalsByCreatedBy: EmployeeGoalsConnection;
	/** Reads and enables pagination through a set of `EmployeeGoal`. */
	employeeGoalsByEmployeeId: EmployeeGoalsConnection;
	/** Reads and enables pagination through a set of `ErasureRequest`. */
	erasureRequestsByUserId: ErasureRequestsConnection;
	/** @deprecated Use display_name directly. Computed field for user full name. */
	fullName: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** Reads and enables pagination through a set of `JobInfo`. */
	jobInfosByEmployeeId: JobInfosConnection;
	/** Reads and enables pagination through a set of `JobInfo`. */
	jobInfosByManagerId: JobInfosConnection;
	/** Reads and enables pagination through a set of `JobInfo`. */
	jobInfosByReportsTo: JobInfosConnection;
	lastLogin: Maybe<Scalars['Datetime']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	/** Reads and enables pagination through a set of `NotificationDelivery`. */
	notificationDeliveriesByUserId: NotificationDeliveriesConnection;
	/** Reads and enables pagination through a set of `NotificationDigest`. */
	notificationDigestsByUserId: NotificationDigestsConnection;
	/** Reads and enables pagination through a set of `NotificationPreference`. */
	notificationPreferencesByUserId: NotificationPreferencesConnection;
	/** Reads and enables pagination through a set of `NotificationSubscription`. */
	notificationSubscriptionsByUserId: NotificationSubscriptionsConnection;
	/** Reads and enables pagination through a set of `NotificationTemplate`. */
	notificationTemplatesByCreatedBy: NotificationTemplatesConnection;
	/** Reads and enables pagination through a set of `Notification`. */
	notificationsByUserId: NotificationsConnection;
	onboardingStatus: Maybe<Scalars['String']['output']>;
	/** Password hash - never exposed via GraphQL */
	passwordHash: Scalars['String']['output'];
	/** Reads and enables pagination through a set of `PayrollPeriod`. */
	payrollPeriodsByApprovedBy: PayrollPeriodsConnection;
	/** Reads and enables pagination through a set of `PayrollPeriod`. */
	payrollPeriodsByCreatedBy: PayrollPeriodsConnection;
	/** Reads and enables pagination through a set of `PayrollPeriod`. */
	payrollPeriodsByProcessedBy: PayrollPeriodsConnection;
	/** Reads and enables pagination through a set of `PerformanceReview`. */
	performanceReviewsByEmployeeId: PerformanceReviewsConnection;
	/** Reads and enables pagination through a set of `PerformanceReview`. */
	performanceReviewsByHrReviewerId: PerformanceReviewsConnection;
	/** Reads and enables pagination through a set of `PerformanceReview`. */
	performanceReviewsByManagerId: PerformanceReviewsConnection;
	/** Reads and enables pagination through a set of `PrivacyRequest`. */
	privacyRequestsByAssignedTo: PrivacyRequestsConnection;
	/** Reads and enables pagination through a set of `PrivacyRequest`. */
	privacyRequestsByUserId: PrivacyRequestsConnection;
	/** Reads and enables pagination through a set of `ReviewCycle`. */
	reviewCyclesByCreatedBy: ReviewCyclesConnection;
	/** Reads and enables pagination through a set of `SecurityEvent`. */
	securityEventsByUserId: SecurityEventsConnection;
	/** Reads and enables pagination through a set of `TimeOffBalance`. */
	timeOffBalanceSByUserId: TimeOffBalancesConnection;
	/** Reads and enables pagination through a set of `TimeOffPolicy`. */
	timeOffPoliciesByCreatedBy: TimeOffPoliciesConnection;
	/** Reads and enables pagination through a set of `TimeOffRequest`. */
	timeOffRequestSByReviewedBy: TimeOffRequestsConnection;
	/** Reads and enables pagination through a set of `TimeOffRequest`. */
	timeOffRequestSByUserId: TimeOffRequestsConnection;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads and enables pagination through a set of `UserDevice`. */
	userDevicesByUserId: UserDevicesConnection;
	/** Reads a single `UserMfaSetting` that is related to this `User`. */
	userMfaSettingByUserId: Maybe<UserMfaSetting>;
	/** Reads and enables pagination through a set of `UserPasswordHistory`. */
	userPasswordHistoriesByUserId: UserPasswordHistoriesConnection;
	/** Reads and enables pagination through a set of `UserRoleAssignment`. */
	userRoleAssignmentsByAssignedBy: UserRoleAssignmentsConnection;
	/** Reads and enables pagination through a set of `UserRoleAssignment`. */
	userRoleAssignmentsByUserId: UserRoleAssignmentsConnection;
	/** Reads and enables pagination through a set of `WorkflowApproval`. */
	workflowApprovalsByApproverId: WorkflowApprovalsConnection;
	/** Reads and enables pagination through a set of `WorkflowApproval`. */
	workflowApprovalsByEscalatedToId: WorkflowApprovalsConnection;
	/** Reads and enables pagination through a set of `WorkflowDefinition`. */
	workflowDefinitionsByCreatedBy: WorkflowDefinitionsConnection;
	/** Reads and enables pagination through a set of `WorkflowInstance`. */
	workflowInstancesByTriggeredByUserId: WorkflowInstancesConnection;
	/** Reads and enables pagination through a set of `WorkflowTask`. */
	workflowTasksByAssignedById: WorkflowTasksConnection;
	/** Reads and enables pagination through a set of `WorkflowTask`. */
	workflowTasksByAssignedToId: WorkflowTasksConnection;
};

/** Core user accounts in the HR system */
export type UserAuditLogsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<AuditLogCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<AuditLogsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserAuthSessionsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<AuthSessionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<AuthSessionsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserConsentRecordsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ConsentRecordCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ConsentRecordsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserContactInfosByEmployeeIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ContactInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ContactInfosOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserDataLineagesByPerformedByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DataLineageCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DataLineagesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserDepartmentsByManagerIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DepartmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DepartmentsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserDocumentAccessesByGrantedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentAccessCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserDocumentAccessesByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentAccessCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentAccessesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserDocumentSignaturesBySignerIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentSignatureCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentSignaturesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserDocumentTemplatesByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<DocumentTemplateCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<DocumentTemplatesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserEmployeeDocumentsByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeDocumentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserEmployeeDocumentsByEmployeeIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeDocumentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeDocumentsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserEmployeeGoalsByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeGoalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserEmployeeGoalsByEmployeeIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<EmployeeGoalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<EmployeeGoalsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserErasureRequestsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ErasureRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ErasureRequestsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserJobInfosByEmployeeIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<JobInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserJobInfosByManagerIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<JobInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserJobInfosByReportsToArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<JobInfoCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<JobInfosOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserNotificationDeliveriesByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationDeliveryCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationDeliveriesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserNotificationDigestsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationDigestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationDigestsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserNotificationPreferencesByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationPreferenceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationPreferencesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserNotificationSubscriptionsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationSubscriptionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationSubscriptionsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserNotificationTemplatesByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationTemplateCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationTemplatesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserNotificationsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<NotificationCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<NotificationsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPayrollPeriodsByApprovedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PayrollPeriodCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPayrollPeriodsByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PayrollPeriodCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPayrollPeriodsByProcessedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PayrollPeriodCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PayrollPeriodsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPerformanceReviewsByEmployeeIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PerformanceReviewCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPerformanceReviewsByHrReviewerIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PerformanceReviewCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPerformanceReviewsByManagerIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PerformanceReviewCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PerformanceReviewsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPrivacyRequestsByAssignedToArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PrivacyRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PrivacyRequestsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserPrivacyRequestsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<PrivacyRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<PrivacyRequestsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserReviewCyclesByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<ReviewCycleCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<ReviewCyclesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserSecurityEventsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<SecurityEventCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<SecurityEventsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserTimeOffBalanceSByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffBalanceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffBalancesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserTimeOffPoliciesByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffPolicyCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffPoliciesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserTimeOffRequestSByReviewedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserTimeOffRequestSByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<TimeOffRequestCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<TimeOffRequestsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserUserDevicesByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserDeviceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserDevicesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserUserPasswordHistoriesByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserPasswordHistoryCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserPasswordHistoriesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserUserRoleAssignmentsByAssignedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserRoleAssignmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserUserRoleAssignmentsByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserRoleAssignmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserWorkflowApprovalsByApproverIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowApprovalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserWorkflowApprovalsByEscalatedToIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowApprovalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserWorkflowDefinitionsByCreatedByArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowDefinitionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserWorkflowInstancesByTriggeredByUserIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowInstanceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowInstancesOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserWorkflowTasksByAssignedByIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowTaskCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/** Core user accounts in the HR system */
export type UserWorkflowTasksByAssignedToIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowTaskCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/** A condition to be used against `User` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type UserCondition = {
	/** Checks for equality with the object’s `email` field. */
	email?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
};

/** Registered user devices with trust level management */
export type UserDevice = Node & {
	__typename: 'UserDevice';
	blockedAt: Maybe<Scalars['Datetime']['output']>;
	blockedReason: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	deviceFingerprint: Maybe<Scalars['JSON']['output']>;
	deviceId: Scalars['String']['output'];
	deviceName: Scalars['String']['output'];
	deviceType: Maybe<Scalars['String']['output']>;
	firstSeenAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	isBlocked: Maybe<Scalars['Boolean']['output']>;
	isVerified: Maybe<Scalars['Boolean']['output']>;
	lastSeenAt: Maybe<Scalars['Datetime']['output']>;
	lastSeenIp: Maybe<Scalars['InternetAddress']['output']>;
	lastSeenLocation: Maybe<Scalars['JSON']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	notes: Maybe<Scalars['String']['output']>;
	sessionCount: Maybe<Scalars['Int']['output']>;
	trustLevel: Maybe<DeviceTrustLevel>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `UserDevice`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	verificationMethod: Maybe<Scalars['String']['output']>;
	verifiedAt: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `UserDevice` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type UserDeviceCondition = {
	/** Checks for equality with the object’s `deviceId` field. */
	deviceId?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `lastSeenAt` field. */
	lastSeenAt?: InputMaybe<Scalars['Datetime']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `UserDevice` */
export type UserDeviceInput = {
	blockedAt?: InputMaybe<Scalars['Datetime']['input']>;
	blockedReason?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	deviceFingerprint?: InputMaybe<Scalars['JSON']['input']>;
	deviceId: Scalars['String']['input'];
	deviceName: Scalars['String']['input'];
	deviceType?: InputMaybe<Scalars['String']['input']>;
	firstSeenAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isBlocked?: InputMaybe<Scalars['Boolean']['input']>;
	isVerified?: InputMaybe<Scalars['Boolean']['input']>;
	lastSeenAt?: InputMaybe<Scalars['Datetime']['input']>;
	lastSeenIp?: InputMaybe<Scalars['InternetAddress']['input']>;
	lastSeenLocation?: InputMaybe<Scalars['JSON']['input']>;
	notes?: InputMaybe<Scalars['String']['input']>;
	sessionCount?: InputMaybe<Scalars['Int']['input']>;
	trustLevel?: InputMaybe<DeviceTrustLevel>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
	verificationMethod?: InputMaybe<Scalars['String']['input']>;
	verifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `UserDevice`. Fields that are set will be updated. */
export type UserDevicePatch = {
	blockedAt?: InputMaybe<Scalars['Datetime']['input']>;
	blockedReason?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	deviceFingerprint?: InputMaybe<Scalars['JSON']['input']>;
	deviceId?: InputMaybe<Scalars['String']['input']>;
	deviceName?: InputMaybe<Scalars['String']['input']>;
	deviceType?: InputMaybe<Scalars['String']['input']>;
	firstSeenAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isBlocked?: InputMaybe<Scalars['Boolean']['input']>;
	isVerified?: InputMaybe<Scalars['Boolean']['input']>;
	lastSeenAt?: InputMaybe<Scalars['Datetime']['input']>;
	lastSeenIp?: InputMaybe<Scalars['InternetAddress']['input']>;
	lastSeenLocation?: InputMaybe<Scalars['JSON']['input']>;
	notes?: InputMaybe<Scalars['String']['input']>;
	sessionCount?: InputMaybe<Scalars['Int']['input']>;
	trustLevel?: InputMaybe<DeviceTrustLevel>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	verificationMethod?: InputMaybe<Scalars['String']['input']>;
	verifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `UserDevice` values. */
export type UserDevicesConnection = {
	__typename: 'UserDevicesConnection';
	/** A list of edges which contains the `UserDevice` and cursor to aid in pagination. */
	edges: Array<UserDevicesEdge>;
	/** A list of `UserDevice` objects. */
	nodes: Array<UserDevice>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `UserDevice` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `UserDevice` edge in the connection. */
export type UserDevicesEdge = {
	__typename: 'UserDevicesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `UserDevice` at the end of the edge. */
	node: UserDevice;
};

/** Methods to use when ordering `UserDevice`. */
export type UserDevicesOrderBy =
	| 'DEVICE_ID_ASC'
	| 'DEVICE_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'LAST_SEEN_AT_ASC'
	| 'LAST_SEEN_AT_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** An input for mutations affecting `User` */
export type UserInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	displayName?: InputMaybe<Scalars['String']['input']>;
	email: Scalars['String']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	lastLogin?: InputMaybe<Scalars['Datetime']['input']>;
	onboardingStatus?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Multi-factor authentication configuration for users */
export type UserMfaSetting = Node & {
	__typename: 'UserMfaSetting';
	backupCodesEncrypted: Maybe<Array<Maybe<Scalars['String']['output']>>>;
	backupCodesGeneratedAt: Maybe<Scalars['Datetime']['output']>;
	backupCodesUsed: Maybe<Array<Maybe<Scalars['Int']['output']>>>;
	backupEmail: Maybe<Scalars['String']['output']>;
	backupMethods: Maybe<Array<Maybe<MfaMethod>>>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	emailVerifiedAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	isEnabled: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	primaryMethod: Maybe<MfaMethod>;
	recoveryQuestions: Maybe<Scalars['JSON']['output']>;
	recoveryUpdatedAt: Maybe<Scalars['Datetime']['output']>;
	smsPhoneNumber: Maybe<Scalars['String']['output']>;
	smsVerifiedAt: Maybe<Scalars['Datetime']['output']>;
	totpSecret: Maybe<Scalars['String']['output']>;
	totpVerifiedAt: Maybe<Scalars['Datetime']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `UserMfaSetting`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `UserMfaSetting` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type UserMfaSettingCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `UserMfaSetting` */
export type UserMfaSettingInput = {
	backupCodesEncrypted?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	backupCodesGeneratedAt?: InputMaybe<Scalars['Datetime']['input']>;
	backupCodesUsed?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
	backupEmail?: InputMaybe<Scalars['String']['input']>;
	backupMethods?: InputMaybe<Array<InputMaybe<MfaMethod>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	emailVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isEnabled?: InputMaybe<Scalars['Boolean']['input']>;
	primaryMethod?: InputMaybe<MfaMethod>;
	recoveryQuestions?: InputMaybe<Scalars['JSON']['input']>;
	recoveryUpdatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	smsPhoneNumber?: InputMaybe<Scalars['String']['input']>;
	smsVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	totpSecret?: InputMaybe<Scalars['String']['input']>;
	totpVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `UserMfaSetting`. Fields that are set will be updated. */
export type UserMfaSettingPatch = {
	backupCodesEncrypted?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
	backupCodesGeneratedAt?: InputMaybe<Scalars['Datetime']['input']>;
	backupCodesUsed?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
	backupEmail?: InputMaybe<Scalars['String']['input']>;
	backupMethods?: InputMaybe<Array<InputMaybe<MfaMethod>>>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	emailVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isEnabled?: InputMaybe<Scalars['Boolean']['input']>;
	primaryMethod?: InputMaybe<MfaMethod>;
	recoveryQuestions?: InputMaybe<Scalars['JSON']['input']>;
	recoveryUpdatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	smsPhoneNumber?: InputMaybe<Scalars['String']['input']>;
	smsVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	totpSecret?: InputMaybe<Scalars['String']['input']>;
	totpVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `UserMfaSetting` values. */
export type UserMfaSettingsConnection = {
	__typename: 'UserMfaSettingsConnection';
	/** A list of edges which contains the `UserMfaSetting` and cursor to aid in pagination. */
	edges: Array<UserMfaSettingsEdge>;
	/** A list of `UserMfaSetting` objects. */
	nodes: Array<UserMfaSetting>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `UserMfaSetting` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `UserMfaSetting` edge in the connection. */
export type UserMfaSettingsEdge = {
	__typename: 'UserMfaSettingsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `UserMfaSetting` at the end of the edge. */
	node: UserMfaSetting;
};

/** Methods to use when ordering `UserMfaSetting`. */
export type UserMfaSettingsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** A connection to a list of `UserPasswordHistory` values. */
export type UserPasswordHistoriesConnection = {
	__typename: 'UserPasswordHistoriesConnection';
	/** A list of edges which contains the `UserPasswordHistory` and cursor to aid in pagination. */
	edges: Array<UserPasswordHistoriesEdge>;
	/** A list of `UserPasswordHistory` objects. */
	nodes: Array<UserPasswordHistory>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `UserPasswordHistory` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `UserPasswordHistory` edge in the connection. */
export type UserPasswordHistoriesEdge = {
	__typename: 'UserPasswordHistoriesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `UserPasswordHistory` at the end of the edge. */
	node: UserPasswordHistory;
};

/** Methods to use when ordering `UserPasswordHistory`. */
export type UserPasswordHistoriesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/** Historical password hashes for preventing reuse */
export type UserPasswordHistory = Node & {
	__typename: 'UserPasswordHistory';
	algorithm: Maybe<Scalars['String']['output']>;
	compromiseDetectedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBySession: Maybe<Scalars['UUID']['output']>;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	passwordHash: Scalars['String']['output'];
	passwordPolicyId: Maybe<Scalars['UUID']['output']>;
	salt: Maybe<Scalars['String']['output']>;
	/** Reads a single `User` that is related to this `UserPasswordHistory`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	wasCompromised: Maybe<Scalars['Boolean']['output']>;
};

/**
 * A condition to be used against `UserPasswordHistory` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type UserPasswordHistoryCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `UserPasswordHistory` */
export type UserPasswordHistoryInput = {
	algorithm?: InputMaybe<Scalars['String']['input']>;
	compromiseDetectedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBySession?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	passwordHash: Scalars['String']['input'];
	passwordPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	salt?: InputMaybe<Scalars['String']['input']>;
	userId: Scalars['UUID']['input'];
	wasCompromised?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents an update to a `UserPasswordHistory`. Fields that are set will be updated. */
export type UserPasswordHistoryPatch = {
	algorithm?: InputMaybe<Scalars['String']['input']>;
	compromiseDetectedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBySession?: InputMaybe<Scalars['UUID']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	passwordHash?: InputMaybe<Scalars['String']['input']>;
	passwordPolicyId?: InputMaybe<Scalars['UUID']['input']>;
	salt?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	wasCompromised?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents an update to a `User`. Fields that are set will be updated. */
export type UserPatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	displayName?: InputMaybe<Scalars['String']['input']>;
	email?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	lastLogin?: InputMaybe<Scalars['Datetime']['input']>;
	onboardingStatus?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

export type UserRole = Node & {
	__typename: 'UserRole';
	createdAt: Maybe<Scalars['Datetime']['output']>;
	description: Maybe<Scalars['String']['output']>;
	id: Scalars['Int']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	level: Maybe<Scalars['Int']['output']>;
	name: Scalars['String']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads and enables pagination through a set of `UserRoleAssignment`. */
	userRoleAssignmentsByRoleId: UserRoleAssignmentsConnection;
};

export type UserRoleUserRoleAssignmentsByRoleIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<UserRoleAssignmentCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<UserRoleAssignmentsOrderBy>>;
};

export type UserRoleAssignment = Node & {
	__typename: 'UserRoleAssignment';
	assignedBy: Maybe<Scalars['UUID']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	isActive: Maybe<Scalars['Boolean']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	roleId: Scalars['Int']['output'];
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByAssignedBy: Maybe<User>;
	/** Reads a single `User` that is related to this `UserRoleAssignment`. */
	userByUserId: Maybe<User>;
	userId: Scalars['UUID']['output'];
	/** Reads a single `UserRole` that is related to this `UserRoleAssignment`. */
	userRoleByRoleId: Maybe<UserRole>;
	validFrom: Maybe<Scalars['Datetime']['output']>;
	validUntil: Maybe<Scalars['Datetime']['output']>;
};

/**
 * A condition to be used against `UserRoleAssignment` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type UserRoleAssignmentCondition = {
	/** Checks for equality with the object’s `assignedBy` field. */
	assignedBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `roleId` field. */
	roleId?: InputMaybe<Scalars['Int']['input']>;
	/** Checks for equality with the object’s `userId` field. */
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `UserRoleAssignment` */
export type UserRoleAssignmentInput = {
	assignedBy?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	roleId: Scalars['Int']['input'];
	userId: Scalars['UUID']['input'];
	validFrom?: InputMaybe<Scalars['Datetime']['input']>;
	validUntil?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `UserRoleAssignment`. Fields that are set will be updated. */
export type UserRoleAssignmentPatch = {
	assignedBy?: InputMaybe<Scalars['UUID']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	roleId?: InputMaybe<Scalars['Int']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
	validFrom?: InputMaybe<Scalars['Datetime']['input']>;
	validUntil?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `UserRoleAssignment` values. */
export type UserRoleAssignmentsConnection = {
	__typename: 'UserRoleAssignmentsConnection';
	/** A list of edges which contains the `UserRoleAssignment` and cursor to aid in pagination. */
	edges: Array<UserRoleAssignmentsEdge>;
	/** A list of `UserRoleAssignment` objects. */
	nodes: Array<UserRoleAssignment>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `UserRoleAssignment` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `UserRoleAssignment` edge in the connection. */
export type UserRoleAssignmentsEdge = {
	__typename: 'UserRoleAssignmentsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `UserRoleAssignment` at the end of the edge. */
	node: UserRoleAssignment;
};

/** Methods to use when ordering `UserRoleAssignment`. */
export type UserRoleAssignmentsOrderBy =
	| 'ASSIGNED_BY_ASC'
	| 'ASSIGNED_BY_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'ROLE_ID_ASC'
	| 'ROLE_ID_DESC'
	| 'USER_ID_ASC'
	| 'USER_ID_DESC';

/**
 * A condition to be used against `UserRole` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type UserRoleCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['Int']['input']>;
	/** Checks for equality with the object’s `name` field. */
	name?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `UserRole` */
export type UserRoleInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['Int']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	level?: InputMaybe<Scalars['Int']['input']>;
	name: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Represents an update to a `UserRole`. Fields that are set will be updated. */
export type UserRolePatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['Int']['input']>;
	isActive?: InputMaybe<Scalars['Boolean']['input']>;
	level?: InputMaybe<Scalars['Int']['input']>;
	name?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
};

/** A connection to a list of `UserRole` values. */
export type UserRolesConnection = {
	__typename: 'UserRolesConnection';
	/** A list of edges which contains the `UserRole` and cursor to aid in pagination. */
	edges: Array<UserRolesEdge>;
	/** A list of `UserRole` objects. */
	nodes: Array<UserRole>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `UserRole` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `UserRole` edge in the connection. */
export type UserRolesEdge = {
	__typename: 'UserRolesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `UserRole` at the end of the edge. */
	node: UserRole;
};

/** Methods to use when ordering `UserRole`. */
export type UserRolesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NAME_ASC'
	| 'NAME_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** Active user sessions with device and security tracking */
export type UserSession = Node & {
	__typename: 'UserSession';
	/** Reads and enables pagination through a set of `AuditLog`. */
	auditLogsBySessionId: AuditLogsConnection;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	deviceId: Maybe<Scalars['String']['output']>;
	deviceName: Maybe<Scalars['String']['output']>;
	deviceTrustLevel: Maybe<DeviceTrustLevel>;
	deviceType: Maybe<Scalars['String']['output']>;
	expiresAt: Scalars['Datetime']['output'];
	id: Scalars['UUID']['output'];
	ipAddress: Maybe<Scalars['InternetAddress']['output']>;
	isMfaVerified: Maybe<Scalars['Boolean']['output']>;
	lastActivityAt: Maybe<Scalars['Datetime']['output']>;
	locationCity: Maybe<Scalars['String']['output']>;
	locationCountry: Maybe<Scalars['String']['output']>;
	locationRegion: Maybe<Scalars['String']['output']>;
	mfaVerifiedAt: Maybe<Scalars['Datetime']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	refreshToken: Maybe<Scalars['String']['output']>;
	requiresPasswordChange: Maybe<Scalars['Boolean']['output']>;
	sessionName: Maybe<Scalars['String']['output']>;
	sessionToken: Scalars['String']['output'];
	status: Maybe<SessionStatus>;
	terminatedAt: Maybe<Scalars['Datetime']['output']>;
	terminationReason: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	userAgent: Maybe<Scalars['String']['output']>;
	userId: Scalars['UUID']['output'];
};

/** Active user sessions with device and security tracking */
export type UserSessionAuditLogsBySessionIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<AuditLogCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<AuditLogsOrderBy>>;
};

/**
 * A condition to be used against `UserSession` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type UserSessionCondition = {
	/** Checks for equality with the object’s `deviceId` field. */
	deviceId?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `lastActivityAt` field. */
	lastActivityAt?: InputMaybe<Scalars['Datetime']['input']>;
	/** Checks for equality with the object’s `refreshToken` field. */
	refreshToken?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `sessionToken` field. */
	sessionToken?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `UserSession` */
export type UserSessionInput = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	deviceId?: InputMaybe<Scalars['String']['input']>;
	deviceName?: InputMaybe<Scalars['String']['input']>;
	deviceTrustLevel?: InputMaybe<DeviceTrustLevel>;
	deviceType?: InputMaybe<Scalars['String']['input']>;
	expiresAt: Scalars['Datetime']['input'];
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isMfaVerified?: InputMaybe<Scalars['Boolean']['input']>;
	lastActivityAt?: InputMaybe<Scalars['Datetime']['input']>;
	locationCity?: InputMaybe<Scalars['String']['input']>;
	locationCountry?: InputMaybe<Scalars['String']['input']>;
	locationRegion?: InputMaybe<Scalars['String']['input']>;
	mfaVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	refreshToken?: InputMaybe<Scalars['String']['input']>;
	requiresPasswordChange?: InputMaybe<Scalars['Boolean']['input']>;
	sessionName?: InputMaybe<Scalars['String']['input']>;
	sessionToken: Scalars['String']['input'];
	status?: InputMaybe<SessionStatus>;
	terminatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	terminationReason?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId: Scalars['UUID']['input'];
};

/** Represents an update to a `UserSession`. Fields that are set will be updated. */
export type UserSessionPatch = {
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	deviceId?: InputMaybe<Scalars['String']['input']>;
	deviceName?: InputMaybe<Scalars['String']['input']>;
	deviceTrustLevel?: InputMaybe<DeviceTrustLevel>;
	deviceType?: InputMaybe<Scalars['String']['input']>;
	expiresAt?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	ipAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	isMfaVerified?: InputMaybe<Scalars['Boolean']['input']>;
	lastActivityAt?: InputMaybe<Scalars['Datetime']['input']>;
	locationCity?: InputMaybe<Scalars['String']['input']>;
	locationCountry?: InputMaybe<Scalars['String']['input']>;
	locationRegion?: InputMaybe<Scalars['String']['input']>;
	mfaVerifiedAt?: InputMaybe<Scalars['Datetime']['input']>;
	refreshToken?: InputMaybe<Scalars['String']['input']>;
	requiresPasswordChange?: InputMaybe<Scalars['Boolean']['input']>;
	sessionName?: InputMaybe<Scalars['String']['input']>;
	sessionToken?: InputMaybe<Scalars['String']['input']>;
	status?: InputMaybe<SessionStatus>;
	terminatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	terminationReason?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	userAgent?: InputMaybe<Scalars['String']['input']>;
	userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `UserSession` values. */
export type UserSessionsConnection = {
	__typename: 'UserSessionsConnection';
	/** A list of edges which contains the `UserSession` and cursor to aid in pagination. */
	edges: Array<UserSessionsEdge>;
	/** A list of `UserSession` objects. */
	nodes: Array<UserSession>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `UserSession` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `UserSession` edge in the connection. */
export type UserSessionsEdge = {
	__typename: 'UserSessionsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `UserSession` at the end of the edge. */
	node: UserSession;
};

/** Methods to use when ordering `UserSession`. */
export type UserSessionsOrderBy =
	| 'DEVICE_ID_ASC'
	| 'DEVICE_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'LAST_ACTIVITY_AT_ASC'
	| 'LAST_ACTIVITY_AT_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'REFRESH_TOKEN_ASC'
	| 'REFRESH_TOKEN_DESC'
	| 'SESSION_TOKEN_ASC'
	| 'SESSION_TOKEN_DESC';

/** A connection to a list of `User` values. */
export type UsersConnection = {
	__typename: 'UsersConnection';
	/** A list of edges which contains the `User` and cursor to aid in pagination. */
	edges: Array<UsersEdge>;
	/** A list of `User` objects. */
	nodes: Array<User>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `User` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `User` edge in the connection. */
export type UsersEdge = {
	__typename: 'UsersEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `User` at the end of the edge. */
	node: User;
};

/** Methods to use when ordering `User`. */
export type UsersOrderBy =
	| 'EMAIL_ASC'
	| 'EMAIL_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** All input for the `validateSession` mutation. */
export type ValidateSessionInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pIpAddress?: InputMaybe<Scalars['InternetAddress']['input']>;
	pSessionToken?: InputMaybe<Scalars['String']['input']>;
	pUserAgent?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `validateSession` mutation. */
export type ValidateSessionPayload = {
	__typename: 'ValidateSessionPayload';
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
	results: Maybe<Array<Maybe<ValidateSessionRecord>>>;
};

/** The return type of our `validateSession` mutation. */
export type ValidateSessionRecord = {
	__typename: 'ValidateSessionRecord';
	expiresAt: Maybe<Scalars['Datetime']['output']>;
	isValid: Maybe<Scalars['Boolean']['output']>;
	requiresMfa: Maybe<Scalars['Boolean']['output']>;
	sessionId: Maybe<Scalars['UUID']['output']>;
	userId: Maybe<Scalars['UUID']['output']>;
};

/** All input for the `withdrawUserConsent` mutation. */
export type WithdrawUserConsentInput = {
	/**
	 * An arbitrary string value with no semantic meaning. Will be included in the
	 * payload verbatim. May be used to track mutations by the client.
	 */
	clientMutationId?: InputMaybe<Scalars['String']['input']>;
	pConsentType?: InputMaybe<Scalars['String']['input']>;
	pUserId?: InputMaybe<Scalars['UUID']['input']>;
	pWithdrawalReason?: InputMaybe<Scalars['String']['input']>;
};

/** The output of our `withdrawUserConsent` mutation. */
export type WithdrawUserConsentPayload = {
	__typename: 'WithdrawUserConsentPayload';
	boolean: Maybe<Scalars['Boolean']['output']>;
	/**
	 * The exact same `clientMutationId` that was provided in the mutation input,
	 * unchanged and unused. May be used by a client to track mutations.
	 */
	clientMutationId: Maybe<Scalars['String']['output']>;
	/** Our root query field type. Allows us to run any query from our mutation payload. */
	query: Maybe<Query>;
};

export type WorkflowActionType =
	| 'ASSIGN_ROLE'
	| 'CONDITIONAL_BRANCH'
	| 'CREATE_DOCUMENT'
	| 'CREATE_TASK'
	| 'DELAY'
	| 'END_WORKFLOW'
	| 'EXECUTE_FUNCTION'
	| 'LOOP'
	| 'SCHEDULE_MEETING'
	| 'SEND_APPROVAL_REQUEST'
	| 'SEND_EMAIL'
	| 'SEND_NOTIFICATION'
	| 'UPDATE_STATUS';

/** Approval requests generated by workflows with escalation support */
export type WorkflowApproval = Node & {
	__typename: 'WorkflowApproval';
	approvalLevel: Maybe<Scalars['Int']['output']>;
	approvalType: Scalars['String']['output'];
	approverId: Scalars['UUID']['output'];
	approverRole: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	decidedAt: Maybe<Scalars['Datetime']['output']>;
	decisionReason: Maybe<Scalars['String']['output']>;
	description: Maybe<Scalars['String']['output']>;
	escalatedAt: Maybe<Scalars['Datetime']['output']>;
	escalatedToId: Maybe<Scalars['UUID']['output']>;
	escalationAfterHours: Maybe<Scalars['Int']['output']>;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	requiredApprovals: Maybe<Scalars['Int']['output']>;
	status: Maybe<Scalars['String']['output']>;
	stepExecutionId: Maybe<Scalars['UUID']['output']>;
	subject: Scalars['String']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByApproverId: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowApproval`. */
	userByEscalatedToId: Maybe<User>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowApproval`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	workflowInstanceId: Scalars['UUID']['output'];
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowApproval`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
};

/**
 * A condition to be used against `WorkflowApproval` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type WorkflowApprovalCondition = {
	/** Checks for equality with the object’s `approverId` field. */
	approverId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `escalatedToId` field. */
	escalatedToId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `stepExecutionId` field. */
	stepExecutionId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `workflowInstanceId` field. */
	workflowInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `WorkflowApproval` */
export type WorkflowApprovalInput = {
	approvalLevel?: InputMaybe<Scalars['Int']['input']>;
	approvalType: Scalars['String']['input'];
	approverId: Scalars['UUID']['input'];
	approverRole?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	decidedAt?: InputMaybe<Scalars['Datetime']['input']>;
	decisionReason?: InputMaybe<Scalars['String']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	escalatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	escalatedToId?: InputMaybe<Scalars['UUID']['input']>;
	escalationAfterHours?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	requiredApprovals?: InputMaybe<Scalars['Int']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	stepExecutionId?: InputMaybe<Scalars['UUID']['input']>;
	subject: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowInstanceId: Scalars['UUID']['input'];
};

/** Represents an update to a `WorkflowApproval`. Fields that are set will be updated. */
export type WorkflowApprovalPatch = {
	approvalLevel?: InputMaybe<Scalars['Int']['input']>;
	approvalType?: InputMaybe<Scalars['String']['input']>;
	approverId?: InputMaybe<Scalars['UUID']['input']>;
	approverRole?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	decidedAt?: InputMaybe<Scalars['Datetime']['input']>;
	decisionReason?: InputMaybe<Scalars['String']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	escalatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	escalatedToId?: InputMaybe<Scalars['UUID']['input']>;
	escalationAfterHours?: InputMaybe<Scalars['Int']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	requiredApprovals?: InputMaybe<Scalars['Int']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	stepExecutionId?: InputMaybe<Scalars['UUID']['input']>;
	subject?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `WorkflowApproval` values. */
export type WorkflowApprovalsConnection = {
	__typename: 'WorkflowApprovalsConnection';
	/** A list of edges which contains the `WorkflowApproval` and cursor to aid in pagination. */
	edges: Array<WorkflowApprovalsEdge>;
	/** A list of `WorkflowApproval` objects. */
	nodes: Array<WorkflowApproval>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `WorkflowApproval` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `WorkflowApproval` edge in the connection. */
export type WorkflowApprovalsEdge = {
	__typename: 'WorkflowApprovalsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `WorkflowApproval` at the end of the edge. */
	node: WorkflowApproval;
};

/** Methods to use when ordering `WorkflowApproval`. */
export type WorkflowApprovalsOrderBy =
	| 'APPROVER_ID_ASC'
	| 'APPROVER_ID_DESC'
	| 'ESCALATED_TO_ID_ASC'
	| 'ESCALATED_TO_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STEP_EXECUTION_ID_ASC'
	| 'STEP_EXECUTION_ID_DESC'
	| 'WORKFLOW_INSTANCE_ID_ASC'
	| 'WORKFLOW_INSTANCE_ID_DESC';

/** Configurable workflow templates for HR process automation */
export type WorkflowDefinition = Node & {
	__typename: 'WorkflowDefinition';
	category: Maybe<Scalars['String']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	createdBy: Scalars['UUID']['output'];
	definition: Scalars['JSON']['output'];
	/** Reads a single `Department` that is related to this `WorkflowDefinition`. */
	departmentByDepartmentId: Maybe<Department>;
	departmentId: Maybe<Scalars['UUID']['output']>;
	description: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	isTemplate: Maybe<Scalars['Boolean']['output']>;
	maxRetries: Maybe<Scalars['Int']['output']>;
	name: Scalars['String']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	parentWorkflowId: Maybe<Scalars['UUID']['output']>;
	retryDelayMinutes: Maybe<Scalars['Int']['output']>;
	status: Maybe<WorkflowStatus>;
	timeoutMinutes: Maybe<Scalars['Int']['output']>;
	triggerConditions: Maybe<Scalars['JSON']['output']>;
	triggerType: WorkflowTriggerType;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `WorkflowDefinition`. */
	userByCreatedBy: Maybe<User>;
	version: Maybe<Scalars['Int']['output']>;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowDefinition`. */
	workflowDefinitionByParentWorkflowId: Maybe<WorkflowDefinition>;
	/** Reads and enables pagination through a set of `WorkflowDefinition`. */
	workflowDefinitionsByParentWorkflowId: WorkflowDefinitionsConnection;
	/** Reads and enables pagination through a set of `WorkflowInstance`. */
	workflowInstancesByWorkflowDefinitionId: WorkflowInstancesConnection;
};

/** Configurable workflow templates for HR process automation */
export type WorkflowDefinitionWorkflowDefinitionsByParentWorkflowIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowDefinitionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowDefinitionsOrderBy>>;
};

/** Configurable workflow templates for HR process automation */
export type WorkflowDefinitionWorkflowInstancesByWorkflowDefinitionIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowInstanceCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowInstancesOrderBy>>;
};

/**
 * A condition to be used against `WorkflowDefinition` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type WorkflowDefinitionCondition = {
	/** Checks for equality with the object’s `category` field. */
	category?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `createdBy` field. */
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `departmentId` field. */
	departmentId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `name` field. */
	name?: InputMaybe<Scalars['String']['input']>;
	/** Checks for equality with the object’s `parentWorkflowId` field. */
	parentWorkflowId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `WorkflowDefinition` */
export type WorkflowDefinitionInput = {
	category?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy: Scalars['UUID']['input'];
	definition: Scalars['JSON']['input'];
	departmentId?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isTemplate?: InputMaybe<Scalars['Boolean']['input']>;
	maxRetries?: InputMaybe<Scalars['Int']['input']>;
	name: Scalars['String']['input'];
	parentWorkflowId?: InputMaybe<Scalars['UUID']['input']>;
	retryDelayMinutes?: InputMaybe<Scalars['Int']['input']>;
	status?: InputMaybe<WorkflowStatus>;
	timeoutMinutes?: InputMaybe<Scalars['Int']['input']>;
	triggerConditions?: InputMaybe<Scalars['JSON']['input']>;
	triggerType: WorkflowTriggerType;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	version?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents an update to a `WorkflowDefinition`. Fields that are set will be updated. */
export type WorkflowDefinitionPatch = {
	category?: InputMaybe<Scalars['String']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdBy?: InputMaybe<Scalars['UUID']['input']>;
	definition?: InputMaybe<Scalars['JSON']['input']>;
	departmentId?: InputMaybe<Scalars['UUID']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	isTemplate?: InputMaybe<Scalars['Boolean']['input']>;
	maxRetries?: InputMaybe<Scalars['Int']['input']>;
	name?: InputMaybe<Scalars['String']['input']>;
	parentWorkflowId?: InputMaybe<Scalars['UUID']['input']>;
	retryDelayMinutes?: InputMaybe<Scalars['Int']['input']>;
	status?: InputMaybe<WorkflowStatus>;
	timeoutMinutes?: InputMaybe<Scalars['Int']['input']>;
	triggerConditions?: InputMaybe<Scalars['JSON']['input']>;
	triggerType?: InputMaybe<WorkflowTriggerType>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	version?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of `WorkflowDefinition` values. */
export type WorkflowDefinitionsConnection = {
	__typename: 'WorkflowDefinitionsConnection';
	/** A list of edges which contains the `WorkflowDefinition` and cursor to aid in pagination. */
	edges: Array<WorkflowDefinitionsEdge>;
	/** A list of `WorkflowDefinition` objects. */
	nodes: Array<WorkflowDefinition>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `WorkflowDefinition` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `WorkflowDefinition` edge in the connection. */
export type WorkflowDefinitionsEdge = {
	__typename: 'WorkflowDefinitionsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `WorkflowDefinition` at the end of the edge. */
	node: WorkflowDefinition;
};

/** Methods to use when ordering `WorkflowDefinition`. */
export type WorkflowDefinitionsOrderBy =
	| 'CATEGORY_ASC'
	| 'CATEGORY_DESC'
	| 'CREATED_BY_ASC'
	| 'CREATED_BY_DESC'
	| 'DEPARTMENT_ID_ASC'
	| 'DEPARTMENT_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NAME_ASC'
	| 'NAME_DESC'
	| 'NATURAL'
	| 'PARENT_WORKFLOW_ID_ASC'
	| 'PARENT_WORKFLOW_ID_DESC'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC';

/** Active workflow executions with state tracking */
export type WorkflowInstance = Node & {
	__typename: 'WorkflowInstance';
	completedAt: Maybe<Scalars['Datetime']['output']>;
	contextData: Maybe<Scalars['JSON']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	currentStepId: Maybe<Scalars['String']['output']>;
	errorMessage: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	instanceName: Maybe<Scalars['String']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	retryCount: Maybe<Scalars['Int']['output']>;
	startedAt: Maybe<Scalars['Datetime']['output']>;
	status: Maybe<WorkflowInstanceStatus>;
	triggerData: Maybe<Scalars['JSON']['output']>;
	triggeredByEvent: Maybe<Scalars['String']['output']>;
	triggeredByUserId: Maybe<Scalars['UUID']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `WorkflowInstance`. */
	userByTriggeredByUserId: Maybe<User>;
	/** Reads and enables pagination through a set of `WorkflowApproval`. */
	workflowApprovalsByWorkflowInstanceId: WorkflowApprovalsConnection;
	/** Reads a single `WorkflowDefinition` that is related to this `WorkflowInstance`. */
	workflowDefinitionByWorkflowDefinitionId: Maybe<WorkflowDefinition>;
	workflowDefinitionId: Scalars['UUID']['output'];
	/** Reads and enables pagination through a set of `WorkflowStepExecution`. */
	workflowStepExecutionsByWorkflowInstanceId: WorkflowStepExecutionsConnection;
	/** Reads and enables pagination through a set of `WorkflowTask`. */
	workflowTasksByWorkflowInstanceId: WorkflowTasksConnection;
};

/** Active workflow executions with state tracking */
export type WorkflowInstanceWorkflowApprovalsByWorkflowInstanceIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowApprovalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** Active workflow executions with state tracking */
export type WorkflowInstanceWorkflowStepExecutionsByWorkflowInstanceIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowStepExecutionCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowStepExecutionsOrderBy>>;
};

/** Active workflow executions with state tracking */
export type WorkflowInstanceWorkflowTasksByWorkflowInstanceIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowTaskCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/**
 * A condition to be used against `WorkflowInstance` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type WorkflowInstanceCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<WorkflowInstanceStatus>;
	/** Checks for equality with the object’s `triggeredByUserId` field. */
	triggeredByUserId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `workflowDefinitionId` field. */
	workflowDefinitionId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `WorkflowInstance` */
export type WorkflowInstanceInput = {
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	contextData?: InputMaybe<Scalars['JSON']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	currentStepId?: InputMaybe<Scalars['String']['input']>;
	errorMessage?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	instanceName?: InputMaybe<Scalars['String']['input']>;
	retryCount?: InputMaybe<Scalars['Int']['input']>;
	startedAt?: InputMaybe<Scalars['Datetime']['input']>;
	status?: InputMaybe<WorkflowInstanceStatus>;
	triggerData?: InputMaybe<Scalars['JSON']['input']>;
	triggeredByEvent?: InputMaybe<Scalars['String']['input']>;
	triggeredByUserId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowDefinitionId: Scalars['UUID']['input'];
};

/** Represents an update to a `WorkflowInstance`. Fields that are set will be updated. */
export type WorkflowInstancePatch = {
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	contextData?: InputMaybe<Scalars['JSON']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	currentStepId?: InputMaybe<Scalars['String']['input']>;
	errorMessage?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	instanceName?: InputMaybe<Scalars['String']['input']>;
	retryCount?: InputMaybe<Scalars['Int']['input']>;
	startedAt?: InputMaybe<Scalars['Datetime']['input']>;
	status?: InputMaybe<WorkflowInstanceStatus>;
	triggerData?: InputMaybe<Scalars['JSON']['input']>;
	triggeredByEvent?: InputMaybe<Scalars['String']['input']>;
	triggeredByUserId?: InputMaybe<Scalars['UUID']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowDefinitionId?: InputMaybe<Scalars['UUID']['input']>;
};

export type WorkflowInstanceStatus =
	| 'CANCELLED'
	| 'COMPLETED'
	| 'FAILED'
	| 'PENDING'
	| 'RUNNING'
	| 'TIMEOUT'
	| 'WAITING';

/** A connection to a list of `WorkflowInstance` values. */
export type WorkflowInstancesConnection = {
	__typename: 'WorkflowInstancesConnection';
	/** A list of edges which contains the `WorkflowInstance` and cursor to aid in pagination. */
	edges: Array<WorkflowInstancesEdge>;
	/** A list of `WorkflowInstance` objects. */
	nodes: Array<WorkflowInstance>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `WorkflowInstance` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `WorkflowInstance` edge in the connection. */
export type WorkflowInstancesEdge = {
	__typename: 'WorkflowInstancesEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `WorkflowInstance` at the end of the edge. */
	node: WorkflowInstance;
};

/** Methods to use when ordering `WorkflowInstance`. */
export type WorkflowInstancesOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC'
	| 'TRIGGERED_BY_USER_ID_ASC'
	| 'TRIGGERED_BY_USER_ID_DESC'
	| 'WORKFLOW_DEFINITION_ID_ASC'
	| 'WORKFLOW_DEFINITION_ID_DESC';

export type WorkflowStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'DRAFT' | 'FAILED' | 'PAUSED';

/** Individual step executions within workflow instances */
export type WorkflowStepExecution = Node & {
	__typename: 'WorkflowStepExecution';
	actionConfig: Maybe<Scalars['JSON']['output']>;
	actionType: WorkflowActionType;
	completedAt: Maybe<Scalars['Datetime']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	errorMessage: Maybe<Scalars['String']['output']>;
	id: Scalars['UUID']['output'];
	inputData: Maybe<Scalars['JSON']['output']>;
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	outputData: Maybe<Scalars['JSON']['output']>;
	retryCount: Maybe<Scalars['Int']['output']>;
	startedAt: Maybe<Scalars['Datetime']['output']>;
	status: Maybe<WorkflowInstanceStatus>;
	stepId: Scalars['String']['output'];
	stepName: Maybe<Scalars['String']['output']>;
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads and enables pagination through a set of `WorkflowApproval`. */
	workflowApprovalsByStepExecutionId: WorkflowApprovalsConnection;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowStepExecution`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	workflowInstanceId: Scalars['UUID']['output'];
	/** Reads and enables pagination through a set of `WorkflowTask`. */
	workflowTasksByStepExecutionId: WorkflowTasksConnection;
};

/** Individual step executions within workflow instances */
export type WorkflowStepExecutionWorkflowApprovalsByStepExecutionIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowApprovalCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowApprovalsOrderBy>>;
};

/** Individual step executions within workflow instances */
export type WorkflowStepExecutionWorkflowTasksByStepExecutionIdArgs = {
	after?: InputMaybe<Scalars['Cursor']['input']>;
	before?: InputMaybe<Scalars['Cursor']['input']>;
	condition?: InputMaybe<WorkflowTaskCondition>;
	first?: InputMaybe<Scalars['Int']['input']>;
	last?: InputMaybe<Scalars['Int']['input']>;
	offset?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<WorkflowTasksOrderBy>>;
};

/**
 * A condition to be used against `WorkflowStepExecution` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type WorkflowStepExecutionCondition = {
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `status` field. */
	status?: InputMaybe<WorkflowInstanceStatus>;
	/** Checks for equality with the object’s `workflowInstanceId` field. */
	workflowInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `WorkflowStepExecution` */
export type WorkflowStepExecutionInput = {
	actionConfig?: InputMaybe<Scalars['JSON']['input']>;
	actionType: WorkflowActionType;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	errorMessage?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	inputData?: InputMaybe<Scalars['JSON']['input']>;
	outputData?: InputMaybe<Scalars['JSON']['input']>;
	retryCount?: InputMaybe<Scalars['Int']['input']>;
	startedAt?: InputMaybe<Scalars['Datetime']['input']>;
	status?: InputMaybe<WorkflowInstanceStatus>;
	stepId: Scalars['String']['input'];
	stepName?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowInstanceId: Scalars['UUID']['input'];
};

/** Represents an update to a `WorkflowStepExecution`. Fields that are set will be updated. */
export type WorkflowStepExecutionPatch = {
	actionConfig?: InputMaybe<Scalars['JSON']['input']>;
	actionType?: InputMaybe<WorkflowActionType>;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	errorMessage?: InputMaybe<Scalars['String']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	inputData?: InputMaybe<Scalars['JSON']['input']>;
	outputData?: InputMaybe<Scalars['JSON']['input']>;
	retryCount?: InputMaybe<Scalars['Int']['input']>;
	startedAt?: InputMaybe<Scalars['Datetime']['input']>;
	status?: InputMaybe<WorkflowInstanceStatus>;
	stepId?: InputMaybe<Scalars['String']['input']>;
	stepName?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `WorkflowStepExecution` values. */
export type WorkflowStepExecutionsConnection = {
	__typename: 'WorkflowStepExecutionsConnection';
	/** A list of edges which contains the `WorkflowStepExecution` and cursor to aid in pagination. */
	edges: Array<WorkflowStepExecutionsEdge>;
	/** A list of `WorkflowStepExecution` objects. */
	nodes: Array<WorkflowStepExecution>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `WorkflowStepExecution` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `WorkflowStepExecution` edge in the connection. */
export type WorkflowStepExecutionsEdge = {
	__typename: 'WorkflowStepExecutionsEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `WorkflowStepExecution` at the end of the edge. */
	node: WorkflowStepExecution;
};

/** Methods to use when ordering `WorkflowStepExecution`. */
export type WorkflowStepExecutionsOrderBy =
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STATUS_ASC'
	| 'STATUS_DESC'
	| 'WORKFLOW_INSTANCE_ID_ASC'
	| 'WORKFLOW_INSTANCE_ID_DESC';

/** Tasks assigned to users as part of workflow execution */
export type WorkflowTask = Node & {
	__typename: 'WorkflowTask';
	assignedById: Maybe<Scalars['UUID']['output']>;
	assignedToId: Scalars['UUID']['output'];
	completedAt: Maybe<Scalars['Datetime']['output']>;
	completionCriteria: Maybe<Scalars['JSON']['output']>;
	createdAt: Maybe<Scalars['Datetime']['output']>;
	description: Maybe<Scalars['String']['output']>;
	dueDate: Maybe<Scalars['Datetime']['output']>;
	id: Scalars['UUID']['output'];
	/** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
	nodeId: Scalars['ID']['output'];
	priority: Maybe<Scalars['String']['output']>;
	status: Maybe<Scalars['String']['output']>;
	stepExecutionId: Maybe<Scalars['UUID']['output']>;
	taskData: Maybe<Scalars['JSON']['output']>;
	taskType: Maybe<Scalars['String']['output']>;
	title: Scalars['String']['output'];
	updatedAt: Maybe<Scalars['Datetime']['output']>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedById: Maybe<User>;
	/** Reads a single `User` that is related to this `WorkflowTask`. */
	userByAssignedToId: Maybe<User>;
	/** Reads a single `WorkflowInstance` that is related to this `WorkflowTask`. */
	workflowInstanceByWorkflowInstanceId: Maybe<WorkflowInstance>;
	workflowInstanceId: Scalars['UUID']['output'];
	/** Reads a single `WorkflowStepExecution` that is related to this `WorkflowTask`. */
	workflowStepExecutionByStepExecutionId: Maybe<WorkflowStepExecution>;
};

/**
 * A condition to be used against `WorkflowTask` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type WorkflowTaskCondition = {
	/** Checks for equality with the object’s `assignedById` field. */
	assignedById?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `assignedToId` field. */
	assignedToId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `id` field. */
	id?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `stepExecutionId` field. */
	stepExecutionId?: InputMaybe<Scalars['UUID']['input']>;
	/** Checks for equality with the object’s `workflowInstanceId` field. */
	workflowInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `WorkflowTask` */
export type WorkflowTaskInput = {
	assignedById?: InputMaybe<Scalars['UUID']['input']>;
	assignedToId: Scalars['UUID']['input'];
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	completionCriteria?: InputMaybe<Scalars['JSON']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	dueDate?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	priority?: InputMaybe<Scalars['String']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	stepExecutionId?: InputMaybe<Scalars['UUID']['input']>;
	taskData?: InputMaybe<Scalars['JSON']['input']>;
	taskType?: InputMaybe<Scalars['String']['input']>;
	title: Scalars['String']['input'];
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowInstanceId: Scalars['UUID']['input'];
};

/** Represents an update to a `WorkflowTask`. Fields that are set will be updated. */
export type WorkflowTaskPatch = {
	assignedById?: InputMaybe<Scalars['UUID']['input']>;
	assignedToId?: InputMaybe<Scalars['UUID']['input']>;
	completedAt?: InputMaybe<Scalars['Datetime']['input']>;
	completionCriteria?: InputMaybe<Scalars['JSON']['input']>;
	createdAt?: InputMaybe<Scalars['Datetime']['input']>;
	description?: InputMaybe<Scalars['String']['input']>;
	dueDate?: InputMaybe<Scalars['Datetime']['input']>;
	id?: InputMaybe<Scalars['UUID']['input']>;
	priority?: InputMaybe<Scalars['String']['input']>;
	status?: InputMaybe<Scalars['String']['input']>;
	stepExecutionId?: InputMaybe<Scalars['UUID']['input']>;
	taskData?: InputMaybe<Scalars['JSON']['input']>;
	taskType?: InputMaybe<Scalars['String']['input']>;
	title?: InputMaybe<Scalars['String']['input']>;
	updatedAt?: InputMaybe<Scalars['Datetime']['input']>;
	workflowInstanceId?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `WorkflowTask` values. */
export type WorkflowTasksConnection = {
	__typename: 'WorkflowTasksConnection';
	/** A list of edges which contains the `WorkflowTask` and cursor to aid in pagination. */
	edges: Array<WorkflowTasksEdge>;
	/** A list of `WorkflowTask` objects. */
	nodes: Array<WorkflowTask>;
	/** Information to aid in pagination. */
	pageInfo: PageInfo;
	/** The count of *all* `WorkflowTask` you could get from the connection. */
	totalCount: Scalars['Int']['output'];
};

/** A `WorkflowTask` edge in the connection. */
export type WorkflowTasksEdge = {
	__typename: 'WorkflowTasksEdge';
	/** A cursor for use in pagination. */
	cursor: Maybe<Scalars['Cursor']['output']>;
	/** The `WorkflowTask` at the end of the edge. */
	node: WorkflowTask;
};

/** Methods to use when ordering `WorkflowTask`. */
export type WorkflowTasksOrderBy =
	| 'ASSIGNED_BY_ID_ASC'
	| 'ASSIGNED_BY_ID_DESC'
	| 'ASSIGNED_TO_ID_ASC'
	| 'ASSIGNED_TO_ID_DESC'
	| 'ID_ASC'
	| 'ID_DESC'
	| 'NATURAL'
	| 'PRIMARY_KEY_ASC'
	| 'PRIMARY_KEY_DESC'
	| 'STEP_EXECUTION_ID_ASC'
	| 'STEP_EXECUTION_ID_DESC'
	| 'WORKFLOW_INSTANCE_ID_ASC'
	| 'WORKFLOW_INSTANCE_ID_DESC';

export type WorkflowTriggerType =
	| 'DOCUMENT_SIGNED'
	| 'DOCUMENT_UPLOADED'
	| 'EMPLOYEE_HIRED'
	| 'EMPLOYEE_TERMINATED'
	| 'GOAL_COMPLETED'
	| 'GOAL_CREATED'
	| 'MANUAL_TRIGGER'
	| 'PAYROLL_PROCESSED'
	| 'REVIEW_COMPLETED'
	| 'REVIEW_CREATED'
	| 'SCHEDULED_TRIGGER'
	| 'TIME_OFF_APPROVED'
	| 'TIME_OFF_REJECTED'
	| 'TIME_OFF_REQUESTED'
	| 'USER_CREATED'
	| 'USER_UPDATED';

export type AuthenticateUserMutationVariables = Exact<{
	email: Scalars['String']['input'];
	password: Scalars['String']['input'];
}>;

export type AuthenticateUserMutation = {
	__typename: 'Mutation';
	authenticate: {
		__typename: 'AuthenticatePayload';
		jwtToken: any | null;
		query: { __typename: 'Query'; currentUserId: string | null } | null;
	} | null;
};

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never }>;

export type GetCurrentUserQuery = { __typename: 'Query'; currentUserId: string | null };

export type GetUserByIdQueryVariables = Exact<{
	id: Scalars['UUID']['input'];
}>;

export type GetUserByIdQuery = {
	__typename: 'Query';
	userById: {
		__typename: 'User';
		id: string;
		email: string;
		displayName: string | null;
		onboardingStatus: string | null;
		createdAt: string | null;
		lastLogin: string | null;
		isActive: boolean | null;
	} | null;
};

export type GetAllUsersQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetAllUsersQuery = {
	__typename: 'Query';
	allUsers: {
		__typename: 'UsersConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'User';
			id: string;
			email: string;
			displayName: string | null;
			onboardingStatus: string | null;
			createdAt: string | null;
			lastLogin: string | null;
			isActive: boolean | null;
		}>;
	} | null;
};

export type GetAllDepartmentsQueryVariables = Exact<{ [key: string]: never }>;

export type GetAllDepartmentsQuery = {
	__typename: 'Query';
	allDepartments: {
		__typename: 'DepartmentsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'Department';
			id: string;
			name: string;
			description: string | null;
			parentDepartmentId: string | null;
			createdAt: string | null;
			updatedAt: string | null;
		}>;
	} | null;
};

export type GetDepartmentByIdQueryVariables = Exact<{
	id: Scalars['UUID']['input'];
}>;

export type GetDepartmentByIdQuery = {
	__typename: 'Query';
	departmentById: {
		__typename: 'Department';
		id: string;
		name: string;
		description: string | null;
		parentDepartmentId: string | null;
		createdAt: string | null;
		updatedAt: string | null;
	} | null;
};

export type UpdateUserMutationVariables = Exact<{
	id: Scalars['UUID']['input'];
	patch: UserPatch;
}>;

export type UpdateUserMutation = {
	__typename: 'Mutation';
	updateUserById: {
		__typename: 'UpdateUserPayload';
		user: {
			__typename: 'User';
			id: string;
			email: string;
			displayName: string | null;
			onboardingStatus: string | null;
			updatedAt: string | null;
		} | null;
	} | null;
};

export type GetAllRolesQueryVariables = Exact<{ [key: string]: never }>;

export type GetAllRolesQuery = {
	__typename: 'Query';
	allUserRoles: {
		__typename: 'UserRolesConnection';
		nodes: Array<{
			__typename: 'UserRole';
			id: number;
			name: string;
			description: string | null;
			level: number | null;
			isActive: boolean | null;
			createdAt: string | null;
		}>;
	} | null;
};

export type GetUserRolesQueryVariables = Exact<{
	userId: Scalars['UUID']['input'];
}>;

export type GetUserRolesQuery = {
	__typename: 'Query';
	allUserRoleAssignments: {
		__typename: 'UserRoleAssignmentsConnection';
		nodes: Array<{
			__typename: 'UserRoleAssignment';
			id: string;
			userId: string;
			roleId: number;
			assignedBy: string | null;
			isActive: boolean | null;
			validFrom: string | null;
			validUntil: string | null;
			createdAt: string | null;
			userRoleByRoleId: {
				__typename: 'UserRole';
				id: number;
				name: string;
				description: string | null;
				level: number | null;
			} | null;
			userByUserId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
			userByAssignedBy: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		}>;
	} | null;
};

export type AssignUserRoleMutationVariables = Exact<{
	input: CreateUserRoleAssignmentInput;
}>;

export type AssignUserRoleMutation = {
	__typename: 'Mutation';
	createUserRoleAssignment: {
		__typename: 'CreateUserRoleAssignmentPayload';
		userRoleAssignment: {
			__typename: 'UserRoleAssignment';
			id: string;
			userId: string;
			roleId: number;
			assignedBy: string | null;
			isActive: boolean | null;
			validFrom: string | null;
			validUntil: string | null;
			createdAt: string | null;
			userRoleByRoleId: {
				__typename: 'UserRole';
				id: number;
				name: string;
				description: string | null;
				level: number | null;
			} | null;
			userByUserId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		} | null;
	} | null;
};

export type UpdateUserRoleAssignmentMutationVariables = Exact<{
	id: Scalars['UUID']['input'];
	patch: UserRoleAssignmentPatch;
}>;

export type UpdateUserRoleAssignmentMutation = {
	__typename: 'Mutation';
	updateUserRoleAssignmentById: {
		__typename: 'UpdateUserRoleAssignmentPayload';
		userRoleAssignment: {
			__typename: 'UserRoleAssignment';
			id: string;
			isActive: boolean | null;
			validUntil: string | null;
			userRoleByRoleId: { __typename: 'UserRole'; name: string; level: number | null } | null;
		} | null;
	} | null;
};

export type RevokeUserRoleMutationVariables = Exact<{
	id: Scalars['UUID']['input'];
}>;

export type RevokeUserRoleMutation = {
	__typename: 'Mutation';
	updateUserRoleAssignmentById: {
		__typename: 'UpdateUserRoleAssignmentPayload';
		userRoleAssignment: {
			__typename: 'UserRoleAssignment';
			id: string;
			isActive: boolean | null;
			userRoleByRoleId: { __typename: 'UserRole'; name: string } | null;
			userByUserId: { __typename: 'User'; displayName: string | null; email: string } | null;
		} | null;
	} | null;
};

export type GetWorkflowDefinitionsQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetWorkflowDefinitionsQuery = {
	__typename: 'Query';
	allWorkflowDefinitions: {
		__typename: 'WorkflowDefinitionsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'WorkflowDefinition';
			id: string;
			name: string;
			description: string | null;
			category: string | null;
			triggerType: WorkflowTriggerType;
			triggerConditions: any | null;
			isTemplate: boolean | null;
			timeoutMinutes: number | null;
			maxRetries: number | null;
			retryDelayMinutes: number | null;
			status: WorkflowStatus | null;
			version: number | null;
			createdAt: string | null;
			updatedAt: string | null;
			userByCreatedBy: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
			departmentByDepartmentId: { __typename: 'Department'; id: string; name: string } | null;
		}>;
	} | null;
};

export type GetWorkflowDefinitionByIdQueryVariables = Exact<{
	id: Scalars['UUID']['input'];
}>;

export type GetWorkflowDefinitionByIdQuery = {
	__typename: 'Query';
	workflowDefinitionById: {
		__typename: 'WorkflowDefinition';
		id: string;
		name: string;
		description: string | null;
		category: string | null;
		triggerType: WorkflowTriggerType;
		triggerConditions: any | null;
		definition: any;
		isTemplate: boolean | null;
		timeoutMinutes: number | null;
		maxRetries: number | null;
		retryDelayMinutes: number | null;
		status: WorkflowStatus | null;
		version: number | null;
		parentWorkflowId: string | null;
		createdBy: string;
		departmentId: string | null;
		createdAt: string | null;
		updatedAt: string | null;
		userByCreatedBy: {
			__typename: 'User';
			id: string;
			displayName: string | null;
			email: string;
		} | null;
		departmentByDepartmentId: { __typename: 'Department'; id: string; name: string } | null;
		workflowDefinitionByParentWorkflowId: {
			__typename: 'WorkflowDefinition';
			id: string;
			name: string;
		} | null;
		workflowInstancesByWorkflowDefinitionId: {
			__typename: 'WorkflowInstancesConnection';
			totalCount: number;
			nodes: Array<{
				__typename: 'WorkflowInstance';
				id: string;
				status: WorkflowInstanceStatus | null;
				createdAt: string | null;
			}>;
		};
	} | null;
};

export type GetWorkflowInstancesQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetWorkflowInstancesQuery = {
	__typename: 'Query';
	allWorkflowInstances: {
		__typename: 'WorkflowInstancesConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'WorkflowInstance';
			id: string;
			workflowDefinitionId: string;
			triggerData: any | null;
			contextData: any | null;
			status: WorkflowInstanceStatus | null;
			completedAt: string | null;
			startedAt: string | null;
			createdAt: string | null;
			updatedAt: string | null;
			workflowDefinitionByWorkflowDefinitionId: {
				__typename: 'WorkflowDefinition';
				id: string;
				name: string;
				category: string | null;
			} | null;
			userByTriggeredByUserId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		}>;
	} | null;
};

export type GetWorkflowTasksQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
	condition?: InputMaybe<WorkflowTaskCondition>;
}>;

export type GetWorkflowTasksQuery = {
	__typename: 'Query';
	allWorkflowTasks: {
		__typename: 'WorkflowTasksConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'WorkflowTask';
			id: string;
			workflowInstanceId: string;
			taskType: string | null;
			title: string;
			description: string | null;
			assignedToId: string;
			status: string | null;
			priority: string | null;
			dueDate: string | null;
			completedAt: string | null;
			createdAt: string | null;
			workflowInstanceByWorkflowInstanceId: {
				__typename: 'WorkflowInstance';
				id: string;
				workflowDefinitionByWorkflowDefinitionId: {
					__typename: 'WorkflowDefinition';
					name: string;
					category: string | null;
				} | null;
			} | null;
			userByAssignedToId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		}>;
	} | null;
};

export type CreateWorkflowDefinitionMutationVariables = Exact<{
	input: CreateWorkflowDefinitionInput;
}>;

export type CreateWorkflowDefinitionMutation = {
	__typename: 'Mutation';
	createWorkflowDefinition: {
		__typename: 'CreateWorkflowDefinitionPayload';
		workflowDefinition: {
			__typename: 'WorkflowDefinition';
			id: string;
			name: string;
			description: string | null;
			category: string | null;
			triggerType: WorkflowTriggerType;
			triggerConditions: any | null;
			definition: any;
			isTemplate: boolean | null;
			timeoutMinutes: number | null;
			maxRetries: number | null;
			retryDelayMinutes: number | null;
			status: WorkflowStatus | null;
			version: number | null;
			createdAt: string | null;
			userByCreatedBy: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		} | null;
	} | null;
};

export type UpdateWorkflowDefinitionMutationVariables = Exact<{
	id: Scalars['UUID']['input'];
	patch: WorkflowDefinitionPatch;
}>;

export type UpdateWorkflowDefinitionMutation = {
	__typename: 'Mutation';
	updateWorkflowDefinitionById: {
		__typename: 'UpdateWorkflowDefinitionPayload';
		workflowDefinition: {
			__typename: 'WorkflowDefinition';
			id: string;
			name: string;
			description: string | null;
			category: string | null;
			triggerType: WorkflowTriggerType;
			triggerConditions: any | null;
			definition: any;
			status: WorkflowStatus | null;
			version: number | null;
			updatedAt: string | null;
		} | null;
	} | null;
};

export type StartWorkflowInstanceMutationVariables = Exact<{
	input: CreateWorkflowInstanceInput;
}>;

export type StartWorkflowInstanceMutation = {
	__typename: 'Mutation';
	createWorkflowInstance: {
		__typename: 'CreateWorkflowInstancePayload';
		workflowInstance: {
			__typename: 'WorkflowInstance';
			id: string;
			workflowDefinitionId: string;
			triggerData: any | null;
			contextData: any | null;
			status: WorkflowInstanceStatus | null;
			createdAt: string | null;
			workflowDefinitionByWorkflowDefinitionId: {
				__typename: 'WorkflowDefinition';
				name: string;
				category: string | null;
			} | null;
		} | null;
	} | null;
};

export type UpdateWorkflowTaskMutationVariables = Exact<{
	id: Scalars['UUID']['input'];
	patch: WorkflowTaskPatch;
}>;

export type UpdateWorkflowTaskMutation = {
	__typename: 'Mutation';
	updateWorkflowTaskById: {
		__typename: 'UpdateWorkflowTaskPayload';
		workflowTask: {
			__typename: 'WorkflowTask';
			id: string;
			status: string | null;
			completedAt: string | null;
			updatedAt: string | null;
		} | null;
	} | null;
};

export type GetAuditLogsQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<AuditLogsOrderBy> | AuditLogsOrderBy>;
}>;

export type GetAuditLogsQuery = {
	__typename: 'Query';
	allAuditLogs: {
		__typename: 'AuditLogsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'AuditLog';
			id: string;
			actionType: AuditActionType;
			tableName: string;
			recordId: string | null;
			oldValues: any | null;
			newValues: any | null;
			ipAddress: any | null;
			userAgent: string | null;
			createdAt: string | null;
			userId: string | null;
			sessionId: string | null;
			userByUserId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
			userSessionBySessionId: {
				__typename: 'UserSession';
				id: string;
				userAgent: string | null;
				ipAddress: any | null;
			} | null;
		}>;
	} | null;
};

export type GetAuditLogByIdQueryVariables = Exact<{
	id: Scalars['UUID']['input'];
}>;

export type GetAuditLogByIdQuery = {
	__typename: 'Query';
	auditLogById: {
		__typename: 'AuditLog';
		id: string;
		actionType: AuditActionType;
		tableName: string;
		recordId: string | null;
		oldValues: any | null;
		newValues: any | null;
		ipAddress: any | null;
		userAgent: string | null;
		createdAt: string | null;
		userId: string | null;
		sessionId: string | null;
		changedFields: Array<string | null> | null;
		containsPii: boolean | null;
		dataClassification: DataClassification | null;
		legalBasis: string | null;
		userByUserId: {
			__typename: 'User';
			id: string;
			displayName: string | null;
			email: string;
		} | null;
		userSessionBySessionId: {
			__typename: 'UserSession';
			id: string;
			userAgent: string | null;
			ipAddress: any | null;
		} | null;
	} | null;
};

export type GetSecurityEventsQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
	orderBy?: InputMaybe<Array<SecurityEventsOrderBy> | SecurityEventsOrderBy>;
}>;

export type GetSecurityEventsQuery = {
	__typename: 'Query';
	allSecurityEvents: {
		__typename: 'SecurityEventsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'SecurityEvent';
			id: string;
			eventType: SecurityEventType;
			eventMessage: string;
			eventCategory: string;
			ipAddress: any | null;
			isSuspicious: boolean | null;
			riskScore: number | null;
			createdAt: string | null;
			userId: string | null;
			sessionId: string | null;
			eventData: any | null;
			requiresInvestigation: boolean | null;
			autoResolved: boolean | null;
			resolvedAt: string | null;
			resolvedBy: string | null;
			userAgent: string | null;
			userByUserId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		}>;
	} | null;
};

export type GetSuspiciousActivitiesQueryVariables = Exact<{
	first?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetSuspiciousActivitiesQuery = {
	__typename: 'Query';
	allSecurityEvents: {
		__typename: 'SecurityEventsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'SecurityEvent';
			id: string;
			eventType: SecurityEventType;
			eventMessage: string;
			eventCategory: string;
			ipAddress: any | null;
			isSuspicious: boolean | null;
			riskScore: number | null;
			createdAt: string | null;
			userId: string | null;
			sessionId: string | null;
			eventData: any | null;
			requiresInvestigation: boolean | null;
			userAgent: string | null;
			userByUserId: {
				__typename: 'User';
				id: string;
				displayName: string | null;
				email: string;
			} | null;
		}>;
	} | null;
};

export type GetUserActivityLogQueryVariables = Exact<{
	userId: Scalars['UUID']['input'];
	first?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetUserActivityLogQuery = {
	__typename: 'Query';
	userById: {
		__typename: 'User';
		auditLogsByUserId: {
			__typename: 'AuditLogsConnection';
			totalCount: number;
			nodes: Array<{
				__typename: 'AuditLog';
				id: string;
				actionType: AuditActionType;
				tableName: string;
				recordId: string | null;
				oldValues: any | null;
				newValues: any | null;
				ipAddress: any | null;
				createdAt: string | null;
				changedFields: Array<string | null> | null;
				containsPii: boolean | null;
			}>;
		};
	} | null;
};

export type GetSecurityMetricsQueryVariables = Exact<{ [key: string]: never }>;

export type GetSecurityMetricsQuery = {
	__typename: 'Query';
	totalUsers: { __typename: 'UsersConnection'; totalCount: number } | null;
	recentSecurityEvents: {
		__typename: 'SecurityEventsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'SecurityEvent';
			eventType: SecurityEventType;
			isSuspicious: boolean | null;
			riskScore: number | null;
			createdAt: string | null;
		}>;
	} | null;
	recentAuditLogs: {
		__typename: 'AuditLogsConnection';
		totalCount: number;
		nodes: Array<{
			__typename: 'AuditLog';
			actionType: AuditActionType;
			tableName: string;
			createdAt: string | null;
			containsPii: boolean | null;
		}>;
	} | null;
};

export class TypedDocumentString<TResult, TVariables>
	extends String
	implements DocumentTypeDecoration<TResult, TVariables>
{
	__apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
	private value: string;
	public __meta__?: Record<string, any> | undefined;

	constructor(value: string, __meta__?: Record<string, any> | undefined) {
		super(value);
		this.value = value;
		this.__meta__ = __meta__;
	}

	override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
		return this.value;
	}
}

export const AuthenticateUserDocument = new TypedDocumentString(`
    mutation AuthenticateUser($email: String!, $password: String!) {
  authenticate(input: {email: $email, password: $password}) {
    jwtToken
    query {
      currentUserId
    }
  }
}
    `) as unknown as TypedDocumentString<
	AuthenticateUserMutation,
	AuthenticateUserMutationVariables
>;
export const GetCurrentUserDocument = new TypedDocumentString(`
    query GetCurrentUser {
  currentUserId
}
    `) as unknown as TypedDocumentString<GetCurrentUserQuery, GetCurrentUserQueryVariables>;
export const GetUserByIdDocument = new TypedDocumentString(`
    query GetUserById($id: UUID!) {
  userById(id: $id) {
    id
    email
    displayName
    onboardingStatus
    createdAt
    lastLogin
    isActive
  }
}
    `) as unknown as TypedDocumentString<GetUserByIdQuery, GetUserByIdQueryVariables>;
export const GetAllUsersDocument = new TypedDocumentString(`
    query GetAllUsers($first: Int = 50) {
  allUsers(first: $first) {
    nodes {
      id
      email
      displayName
      onboardingStatus
      createdAt
      lastLogin
      isActive
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<GetAllUsersQuery, GetAllUsersQueryVariables>;
export const GetAllDepartmentsDocument = new TypedDocumentString(`
    query GetAllDepartments {
  allDepartments {
    nodes {
      id
      name
      description
      parentDepartmentId
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<GetAllDepartmentsQuery, GetAllDepartmentsQueryVariables>;
export const GetDepartmentByIdDocument = new TypedDocumentString(`
    query GetDepartmentById($id: UUID!) {
  departmentById(id: $id) {
    id
    name
    description
    parentDepartmentId
    createdAt
    updatedAt
  }
}
    `) as unknown as TypedDocumentString<GetDepartmentByIdQuery, GetDepartmentByIdQueryVariables>;
export const UpdateUserDocument = new TypedDocumentString(`
    mutation UpdateUser($id: UUID!, $patch: UserPatch!) {
  updateUserById(input: {id: $id, userPatch: $patch}) {
    user {
      id
      email
      displayName
      onboardingStatus
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateUserMutation, UpdateUserMutationVariables>;
export const GetAllRolesDocument = new TypedDocumentString(`
    query GetAllRoles {
  allUserRoles(orderBy: NAME_ASC) {
    nodes {
      id
      name
      description
      level
      isActive
      createdAt
    }
  }
}
    `) as unknown as TypedDocumentString<GetAllRolesQuery, GetAllRolesQueryVariables>;
export const GetUserRolesDocument = new TypedDocumentString(`
    query GetUserRoles($userId: UUID!) {
  allUserRoleAssignments(condition: {userId: $userId}) {
    nodes {
      id
      userId
      roleId
      assignedBy
      isActive
      validFrom
      validUntil
      createdAt
      userRoleByRoleId {
        id
        name
        description
        level
      }
      userByUserId {
        id
        displayName
        email
      }
      userByAssignedBy {
        id
        displayName
        email
      }
    }
  }
}
    `) as unknown as TypedDocumentString<GetUserRolesQuery, GetUserRolesQueryVariables>;
export const AssignUserRoleDocument = new TypedDocumentString(`
    mutation AssignUserRole($input: CreateUserRoleAssignmentInput!) {
  createUserRoleAssignment(input: $input) {
    userRoleAssignment {
      id
      userId
      roleId
      assignedBy
      isActive
      validFrom
      validUntil
      createdAt
      userRoleByRoleId {
        id
        name
        description
        level
      }
      userByUserId {
        id
        displayName
        email
      }
    }
  }
}
    `) as unknown as TypedDocumentString<AssignUserRoleMutation, AssignUserRoleMutationVariables>;
export const UpdateUserRoleAssignmentDocument = new TypedDocumentString(`
    mutation UpdateUserRoleAssignment($id: UUID!, $patch: UserRoleAssignmentPatch!) {
  updateUserRoleAssignmentById(input: {id: $id, userRoleAssignmentPatch: $patch}) {
    userRoleAssignment {
      id
      isActive
      validUntil
      userRoleByRoleId {
        name
        level
      }
    }
  }
}
    `) as unknown as TypedDocumentString<
	UpdateUserRoleAssignmentMutation,
	UpdateUserRoleAssignmentMutationVariables
>;
export const RevokeUserRoleDocument = new TypedDocumentString(`
    mutation RevokeUserRole($id: UUID!) {
  updateUserRoleAssignmentById(
    input: {id: $id, userRoleAssignmentPatch: {isActive: false}}
  ) {
    userRoleAssignment {
      id
      isActive
      userRoleByRoleId {
        name
      }
      userByUserId {
        displayName
        email
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RevokeUserRoleMutation, RevokeUserRoleMutationVariables>;
export const GetWorkflowDefinitionsDocument = new TypedDocumentString(`
    query GetWorkflowDefinitions($first: Int = 50) {
  allWorkflowDefinitions(first: $first, orderBy: [NAME_ASC]) {
    nodes {
      id
      name
      description
      category
      triggerType
      triggerConditions
      isTemplate
      timeoutMinutes
      maxRetries
      retryDelayMinutes
      status
      version
      createdAt
      updatedAt
      userByCreatedBy {
        id
        displayName
        email
      }
      departmentByDepartmentId {
        id
        name
      }
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<
	GetWorkflowDefinitionsQuery,
	GetWorkflowDefinitionsQueryVariables
>;
export const GetWorkflowDefinitionByIdDocument = new TypedDocumentString(`
    query GetWorkflowDefinitionById($id: UUID!) {
  workflowDefinitionById(id: $id) {
    id
    name
    description
    category
    triggerType
    triggerConditions
    definition
    isTemplate
    timeoutMinutes
    maxRetries
    retryDelayMinutes
    status
    version
    parentWorkflowId
    createdBy
    departmentId
    createdAt
    updatedAt
    userByCreatedBy {
      id
      displayName
      email
    }
    departmentByDepartmentId {
      id
      name
    }
    workflowDefinitionByParentWorkflowId {
      id
      name
    }
    workflowInstancesByWorkflowDefinitionId(first: 10) {
      nodes {
        id
        status
        createdAt
      }
      totalCount
    }
  }
}
    `) as unknown as TypedDocumentString<
	GetWorkflowDefinitionByIdQuery,
	GetWorkflowDefinitionByIdQueryVariables
>;
export const GetWorkflowInstancesDocument = new TypedDocumentString(`
    query GetWorkflowInstances($first: Int = 50) {
  allWorkflowInstances(first: $first) {
    nodes {
      id
      workflowDefinitionId
      triggerData
      contextData
      status
      completedAt
      startedAt
      createdAt
      updatedAt
      workflowDefinitionByWorkflowDefinitionId {
        id
        name
        category
      }
      userByTriggeredByUserId {
        id
        displayName
        email
      }
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<
	GetWorkflowInstancesQuery,
	GetWorkflowInstancesQueryVariables
>;
export const GetWorkflowTasksDocument = new TypedDocumentString(`
    query GetWorkflowTasks($first: Int = 50, $condition: WorkflowTaskCondition) {
  allWorkflowTasks(first: $first, condition: $condition) {
    nodes {
      id
      workflowInstanceId
      taskType
      title
      description
      assignedToId
      status
      priority
      dueDate
      completedAt
      createdAt
      workflowInstanceByWorkflowInstanceId {
        id
        workflowDefinitionByWorkflowDefinitionId {
          name
          category
        }
      }
      userByAssignedToId {
        id
        displayName
        email
      }
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<GetWorkflowTasksQuery, GetWorkflowTasksQueryVariables>;
export const CreateWorkflowDefinitionDocument = new TypedDocumentString(`
    mutation CreateWorkflowDefinition($input: CreateWorkflowDefinitionInput!) {
  createWorkflowDefinition(input: $input) {
    workflowDefinition {
      id
      name
      description
      category
      triggerType
      triggerConditions
      definition
      isTemplate
      timeoutMinutes
      maxRetries
      retryDelayMinutes
      status
      version
      createdAt
      userByCreatedBy {
        id
        displayName
        email
      }
    }
  }
}
    `) as unknown as TypedDocumentString<
	CreateWorkflowDefinitionMutation,
	CreateWorkflowDefinitionMutationVariables
>;
export const UpdateWorkflowDefinitionDocument = new TypedDocumentString(`
    mutation UpdateWorkflowDefinition($id: UUID!, $patch: WorkflowDefinitionPatch!) {
  updateWorkflowDefinitionById(input: {id: $id, workflowDefinitionPatch: $patch}) {
    workflowDefinition {
      id
      name
      description
      category
      triggerType
      triggerConditions
      definition
      status
      version
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<
	UpdateWorkflowDefinitionMutation,
	UpdateWorkflowDefinitionMutationVariables
>;
export const StartWorkflowInstanceDocument = new TypedDocumentString(`
    mutation StartWorkflowInstance($input: CreateWorkflowInstanceInput!) {
  createWorkflowInstance(input: $input) {
    workflowInstance {
      id
      workflowDefinitionId
      triggerData
      contextData
      status
      createdAt
      workflowDefinitionByWorkflowDefinitionId {
        name
        category
      }
    }
  }
}
    `) as unknown as TypedDocumentString<
	StartWorkflowInstanceMutation,
	StartWorkflowInstanceMutationVariables
>;
export const UpdateWorkflowTaskDocument = new TypedDocumentString(`
    mutation UpdateWorkflowTask($id: UUID!, $patch: WorkflowTaskPatch!) {
  updateWorkflowTaskById(input: {id: $id, workflowTaskPatch: $patch}) {
    workflowTask {
      id
      status
      completedAt
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<
	UpdateWorkflowTaskMutation,
	UpdateWorkflowTaskMutationVariables
>;
export const GetAuditLogsDocument = new TypedDocumentString(`
    query GetAuditLogs($first: Int = 50, $orderBy: [AuditLogsOrderBy!] = [ID_DESC]) {
  allAuditLogs(first: $first, orderBy: $orderBy) {
    nodes {
      id
      actionType
      tableName
      recordId
      oldValues
      newValues
      ipAddress
      userAgent
      createdAt
      userId
      sessionId
      userByUserId {
        id
        displayName
        email
      }
      userSessionBySessionId {
        id
        userAgent
        ipAddress
      }
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<GetAuditLogsQuery, GetAuditLogsQueryVariables>;
export const GetAuditLogByIdDocument = new TypedDocumentString(`
    query GetAuditLogById($id: UUID!) {
  auditLogById(id: $id) {
    id
    actionType
    tableName
    recordId
    oldValues
    newValues
    ipAddress
    userAgent
    createdAt
    userId
    sessionId
    changedFields
    containsPii
    dataClassification
    legalBasis
    userByUserId {
      id
      displayName
      email
    }
    userSessionBySessionId {
      id
      userAgent
      ipAddress
    }
  }
}
    `) as unknown as TypedDocumentString<GetAuditLogByIdQuery, GetAuditLogByIdQueryVariables>;
export const GetSecurityEventsDocument = new TypedDocumentString(`
    query GetSecurityEvents($first: Int = 50, $orderBy: [SecurityEventsOrderBy!] = [ID_DESC]) {
  allSecurityEvents(first: $first, orderBy: $orderBy) {
    nodes {
      id
      eventType
      eventMessage
      eventCategory
      ipAddress
      isSuspicious
      riskScore
      createdAt
      userId
      sessionId
      eventData
      requiresInvestigation
      autoResolved
      resolvedAt
      resolvedBy
      userAgent
      userByUserId {
        id
        displayName
        email
      }
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<GetSecurityEventsQuery, GetSecurityEventsQueryVariables>;
export const GetSuspiciousActivitiesDocument = new TypedDocumentString(`
    query GetSuspiciousActivities($first: Int = 50) {
  allSecurityEvents(first: $first, orderBy: [RISK_SCORE_DESC]) {
    nodes {
      id
      eventType
      eventMessage
      eventCategory
      ipAddress
      isSuspicious
      riskScore
      createdAt
      userId
      sessionId
      eventData
      requiresInvestigation
      userAgent
      userByUserId {
        id
        displayName
        email
      }
    }
    totalCount
  }
}
    `) as unknown as TypedDocumentString<
	GetSuspiciousActivitiesQuery,
	GetSuspiciousActivitiesQueryVariables
>;
export const GetUserActivityLogDocument = new TypedDocumentString(`
    query GetUserActivityLog($userId: UUID!, $first: Int = 50) {
  userById(id: $userId) {
    auditLogsByUserId(first: $first, orderBy: [ID_DESC]) {
      nodes {
        id
        actionType
        tableName
        recordId
        oldValues
        newValues
        ipAddress
        createdAt
        changedFields
        containsPii
      }
      totalCount
    }
  }
}
    `) as unknown as TypedDocumentString<GetUserActivityLogQuery, GetUserActivityLogQueryVariables>;
export const GetSecurityMetricsDocument = new TypedDocumentString(`
    query GetSecurityMetrics {
  totalUsers: allUsers {
    totalCount
  }
  recentSecurityEvents: allSecurityEvents(first: 1000) {
    totalCount
    nodes {
      eventType
      isSuspicious
      riskScore
      createdAt
    }
  }
  recentAuditLogs: allAuditLogs(first: 1000) {
    totalCount
    nodes {
      actionType
      tableName
      createdAt
      containsPii
    }
  }
}
    `) as unknown as TypedDocumentString<GetSecurityMetricsQuery, GetSecurityMetricsQueryVariables>;
