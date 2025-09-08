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
	Date: { input: string; output: string };
	DateTime: { input: string; output: string };
	JSON: { input: Record<string, any>; output: Record<string, any> };
};

export type AuthPayload = {
	__typename?: 'AuthPayload';
	expiresAt: Scalars['DateTime']['output'];
	refreshToken: Scalars['String']['output'];
	token: Scalars['String']['output'];
	user: User;
};

export enum CommSortField {
	CREATED_AT = 'CREATED_AT',
	PRIORITY = 'PRIORITY',
	SENDER = 'SENDER',
	SUBJECT = 'SUBJECT'
}

export type Communication = {
	__typename?: 'Communication';
	attachments: Array<Document>;
	content: Scalars['String']['output'];
	createdAt: Scalars['DateTime']['output'];
	id: Scalars['ID']['output'];
	isRead: Scalars['Boolean']['output'];
	priority: Priority;
	recipients: Array<User>;
	sender: User;
	subject: Scalars['String']['output'];
	type: MessageType;
	updatedAt: Scalars['DateTime']['output'];
};

export type CommunicationPage = {
	__typename?: 'CommunicationPage';
	communications: Array<Communication>;
	hasNextPage: Scalars['Boolean']['output'];
	hasPreviousPage: Scalars['Boolean']['output'];
	limit: Scalars['Int']['output'];
	page: Scalars['Int']['output'];
	total: Scalars['Int']['output'];
};

export type CreateEmployeeInput = {
	address?: InputMaybe<Scalars['String']['input']>;
	departmentId: Scalars['ID']['input'];
	email: Scalars['String']['input'];
	employeeId: Scalars['String']['input'];
	firstName: Scalars['String']['input'];
	hireDate: Scalars['Date']['input'];
	lastName: Scalars['String']['input'];
	managerId?: InputMaybe<Scalars['ID']['input']>;
	phone?: InputMaybe<Scalars['String']['input']>;
	position: Scalars['String']['input'];
	salary?: InputMaybe<Scalars['Float']['input']>;
};

export type Department = {
	__typename?: 'Department';
	budget: Maybe<Scalars['Float']['output']>;
	description: Maybe<Scalars['String']['output']>;
	employees: Array<Employee>;
	head: Maybe<Employee>;
	id: Scalars['ID']['output'];
	name: Scalars['String']['output'];
};

export type Document = {
	__typename?: 'Document';
	contentType: Scalars['String']['output'];
	filename: Scalars['String']['output'];
	id: Scalars['ID']['output'];
	size: Scalars['Int']['output'];
	uploadedAt: Scalars['DateTime']['output'];
	uploadedBy: User;
	url: Scalars['String']['output'];
};

export type DocumentInput = {
	contentType: Scalars['String']['input'];
	data: Scalars['String']['input'];
	filename: Scalars['String']['input'];
	size: Scalars['Int']['input'];
};

export type Employee = {
	__typename?: 'Employee';
	address: Maybe<Scalars['String']['output']>;
	createdAt: Scalars['DateTime']['output'];
	department: Department;
	directReports: Array<Employee>;
	documents: Array<Document>;
	employeeId: Scalars['String']['output'];
	hireDate: Scalars['Date']['output'];
	id: Scalars['ID']['output'];
	leaveRequests: Array<LeaveRequest>;
	manager: Maybe<Employee>;
	phone: Maybe<Scalars['String']['output']>;
	position: Scalars['String']['output'];
	salary: Maybe<Scalars['Float']['output']>;
	status: EmployeeStatus;
	updatedAt: Scalars['DateTime']['output'];
	user: User;
};

export type EmployeePage = {
	__typename?: 'EmployeePage';
	employees: Array<Employee>;
	hasNextPage: Scalars['Boolean']['output'];
	hasPreviousPage: Scalars['Boolean']['output'];
	limit: Scalars['Int']['output'];
	page: Scalars['Int']['output'];
	total: Scalars['Int']['output'];
};

export enum EmployeeSortField {
	DEPARTMENT = 'DEPARTMENT',
	EMPLOYEE_ID = 'EMPLOYEE_ID',
	FIRST_NAME = 'FIRST_NAME',
	HIRE_DATE = 'HIRE_DATE',
	LAST_NAME = 'LAST_NAME',
	POSITION = 'POSITION'
}

export enum EmployeeStatus {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
	ON_LEAVE = 'ON_LEAVE',
	TERMINATED = 'TERMINATED'
}

export type ExpenseClaimData = {
	__typename?: 'ExpenseClaimData';
	amount: Scalars['Float']['output'];
	category: Scalars['String']['output'];
	currency: Scalars['String']['output'];
	description: Scalars['String']['output'];
	expenseDate: Scalars['Date']['output'];
	receiptUrl: Maybe<Scalars['String']['output']>;
};

export type HrProcess = {
	__typename?: 'HRProcess';
	approver: Maybe<Employee>;
	comments: Array<ProcessComment>;
	completedAt: Maybe<Scalars['DateTime']['output']>;
	createdAt: Scalars['DateTime']['output'];
	data: Scalars['JSON']['output'];
	id: Scalars['ID']['output'];
	requester: Employee;
	status: ProcessStatus;
	title: Scalars['String']['output'];
	type: ProcessType;
	updatedAt: Scalars['DateTime']['output'];
};

export type LeaveRequest = {
	__typename?: 'LeaveRequest';
	createdAt: Scalars['DateTime']['output'];
	employee: Employee;
	endDate: Scalars['Date']['output'];
	id: Scalars['ID']['output'];
	leaveType: Scalars['String']['output'];
	reason: Maybe<Scalars['String']['output']>;
	startDate: Scalars['Date']['output'];
	status: Scalars['String']['output'];
};

export type LeaveRequestData = {
	__typename?: 'LeaveRequestData';
	endDate: Scalars['Date']['output'];
	leaveType: LeaveType;
	reason: Maybe<Scalars['String']['output']>;
	startDate: Scalars['Date']['output'];
	totalDays: Scalars['Float']['output'];
};

export enum LeaveType {
	ANNUAL_LEAVE = 'ANNUAL_LEAVE',
	BEREAVEMENT_LEAVE = 'BEREAVEMENT_LEAVE',
	MATERNITY_LEAVE = 'MATERNITY_LEAVE',
	PATERNITY_LEAVE = 'PATERNITY_LEAVE',
	PERSONAL_LEAVE = 'PERSONAL_LEAVE',
	SICK_LEAVE = 'SICK_LEAVE'
}

export type LoginInput = {
	email: Scalars['String']['input'];
	password: Scalars['String']['input'];
	rememberMe?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum MessageType {
	ANNOUNCEMENT = 'ANNOUNCEMENT',
	DIRECT_MESSAGE = 'DIRECT_MESSAGE',
	NOTIFICATION = 'NOTIFICATION',
	REMINDER = 'REMINDER'
}

export type Mutation = {
	__typename?: 'Mutation';
	addProcessComment: ProcessComment;
	approveProcess: HrProcess;
	cancelProcess: HrProcess;
	createEmployee: Employee;
	deactivateEmployee: Employee;
	deleteCommunication: Scalars['Boolean']['output'];
	login: AuthPayload;
	logout: Scalars['Boolean']['output'];
	markAllAsRead: Scalars['Boolean']['output'];
	markAsRead: Communication;
	reactivateEmployee: Employee;
	refreshToken: AuthPayload;
	rejectProcess: HrProcess;
	requestMoreInfo: HrProcess;
	requestPasswordReset: Scalars['Boolean']['output'];
	resetPassword: Scalars['Boolean']['output'];
	sendCommunication: Communication;
	submitProcess: HrProcess;
	updateEmployee: Employee;
	updateMyProfile: Employee;
};

export type MutationAddProcessCommentArgs = {
	comment: Scalars['String']['input'];
	id: Scalars['ID']['input'];
};

export type MutationApproveProcessArgs = {
	comment: InputMaybe<Scalars['String']['input']>;
	id: Scalars['ID']['input'];
};

export type MutationCancelProcessArgs = {
	id: Scalars['ID']['input'];
};

export type MutationCreateEmployeeArgs = {
	input: CreateEmployeeInput;
};

export type MutationDeactivateEmployeeArgs = {
	id: Scalars['ID']['input'];
	reason: InputMaybe<Scalars['String']['input']>;
};

export type MutationDeleteCommunicationArgs = {
	id: Scalars['ID']['input'];
};

export type MutationLoginArgs = {
	input: LoginInput;
};

export type MutationMarkAsReadArgs = {
	id: Scalars['ID']['input'];
};

export type MutationReactivateEmployeeArgs = {
	id: Scalars['ID']['input'];
};

export type MutationRefreshTokenArgs = {
	refreshToken: Scalars['String']['input'];
};

export type MutationRejectProcessArgs = {
	id: Scalars['ID']['input'];
	reason: Scalars['String']['input'];
};

export type MutationRequestMoreInfoArgs = {
	id: Scalars['ID']['input'];
	message: Scalars['String']['input'];
};

export type MutationRequestPasswordResetArgs = {
	email: Scalars['String']['input'];
};

export type MutationResetPasswordArgs = {
	input: ResetPasswordInput;
};

export type MutationSendCommunicationArgs = {
	input: SendCommunicationInput;
};

export type MutationSubmitProcessArgs = {
	input: SubmitProcessInput;
};

export type MutationUpdateEmployeeArgs = {
	id: Scalars['ID']['input'];
	input: UpdateEmployeeInput;
};

export type MutationUpdateMyProfileArgs = {
	input: UpdateMyProfileInput;
};

export type Page = {
	hasNextPage: Scalars['Boolean']['output'];
	hasPreviousPage: Scalars['Boolean']['output'];
	limit: Scalars['Int']['output'];
	page: Scalars['Int']['output'];
	total: Scalars['Int']['output'];
};

export type Permission = {
	__typename?: 'Permission';
	action: Scalars['String']['output'];
	id: Scalars['ID']['output'];
	resource: Scalars['String']['output'];
	scope: Maybe<Scalars['String']['output']>;
};

export enum Priority {
	HIGH = 'HIGH',
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	URGENT = 'URGENT'
}

export type ProcessComment = {
	__typename?: 'ProcessComment';
	author: User;
	comment: Scalars['String']['output'];
	createdAt: Scalars['DateTime']['output'];
	id: Scalars['ID']['output'];
	process: HrProcess;
};

export type ProcessPage = {
	__typename?: 'ProcessPage';
	hasNextPage: Scalars['Boolean']['output'];
	hasPreviousPage: Scalars['Boolean']['output'];
	limit: Scalars['Int']['output'];
	page: Scalars['Int']['output'];
	processes: Array<HrProcess>;
	total: Scalars['Int']['output'];
};

export enum ProcessSortField {
	CREATED_AT = 'CREATED_AT',
	REQUESTER = 'REQUESTER',
	STATUS = 'STATUS',
	TITLE = 'TITLE',
	TYPE = 'TYPE'
}

export enum ProcessStatus {
	APPROVED = 'APPROVED',
	CANCELLED = 'CANCELLED',
	MORE_INFO_NEEDED = 'MORE_INFO_NEEDED',
	PENDING = 'PENDING',
	REJECTED = 'REJECTED',
	SUBMITTED = 'SUBMITTED'
}

export enum ProcessType {
	DOCUMENT_APPROVAL = 'DOCUMENT_APPROVAL',
	EXPENSE_CLAIM = 'EXPENSE_CLAIM',
	LEAVE_REQUEST = 'LEAVE_REQUEST',
	PERFORMANCE_REVIEW = 'PERFORMANCE_REVIEW',
	TRANSFER_REQUEST = 'TRANSFER_REQUEST'
}

export type Query = {
	__typename?: 'Query';
	communication: Communication;
	communications: CommunicationPage;
	employee: Maybe<Employee>;
	employeeByEmployeeId: Maybe<Employee>;
	employees: EmployeePage;
	me: Maybe<User>;
	myApprovals: ProcessPage;
	myProcesses: ProcessPage;
	myProfile: Maybe<Employee>;
	process: HrProcess;
	processes: ProcessPage;
	unreadCount: Scalars['Int']['output'];
	verifyToken: Scalars['Boolean']['output'];
};

export type QueryCommunicationArgs = {
	id: Scalars['ID']['input'];
};

export type QueryCommunicationsArgs = {
	limit?: InputMaybe<Scalars['Int']['input']>;
	page?: InputMaybe<Scalars['Int']['input']>;
	sortBy?: InputMaybe<CommSortField>;
	sortOrder?: InputMaybe<SortOrder>;
	type: InputMaybe<MessageType>;
	unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

export type QueryEmployeeArgs = {
	id: Scalars['ID']['input'];
};

export type QueryEmployeeByEmployeeIdArgs = {
	employeeId: Scalars['String']['input'];
};

export type QueryEmployeesArgs = {
	department: InputMaybe<Scalars['ID']['input']>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	page?: InputMaybe<Scalars['Int']['input']>;
	search: InputMaybe<Scalars['String']['input']>;
	sortBy?: InputMaybe<EmployeeSortField>;
	sortOrder?: InputMaybe<SortOrder>;
	status: InputMaybe<EmployeeStatus>;
};

export type QueryMyApprovalsArgs = {
	limit?: InputMaybe<Scalars['Int']['input']>;
	page?: InputMaybe<Scalars['Int']['input']>;
	status?: InputMaybe<ProcessStatus>;
};

export type QueryMyProcessesArgs = {
	limit?: InputMaybe<Scalars['Int']['input']>;
	page?: InputMaybe<Scalars['Int']['input']>;
	status: InputMaybe<ProcessStatus>;
	type: InputMaybe<ProcessType>;
};

export type QueryProcessArgs = {
	id: Scalars['ID']['input'];
};

export type QueryProcessesArgs = {
	approverId: InputMaybe<Scalars['ID']['input']>;
	limit?: InputMaybe<Scalars['Int']['input']>;
	page?: InputMaybe<Scalars['Int']['input']>;
	requesterId: InputMaybe<Scalars['ID']['input']>;
	sortBy?: InputMaybe<ProcessSortField>;
	sortOrder?: InputMaybe<SortOrder>;
	status: InputMaybe<ProcessStatus>;
	type: InputMaybe<ProcessType>;
};

export type ResetPasswordInput = {
	newPassword: Scalars['String']['input'];
	token: Scalars['String']['input'];
};

export type Role = {
	__typename?: 'Role';
	description: Maybe<Scalars['String']['output']>;
	id: Scalars['ID']['output'];
	level: Scalars['Int']['output'];
	name: Scalars['String']['output'];
	permissions: Array<Permission>;
};

export type SendCommunicationInput = {
	attachmentIds?: InputMaybe<Array<Scalars['ID']['input']>>;
	content: Scalars['String']['input'];
	priority?: InputMaybe<Priority>;
	recipientIds: Array<Scalars['ID']['input']>;
	subject: Scalars['String']['input'];
	type: MessageType;
};

export enum SortOrder {
	ASC = 'ASC',
	DESC = 'DESC'
}

export type SubmitProcessInput = {
	approverId?: InputMaybe<Scalars['ID']['input']>;
	data: Scalars['JSON']['input'];
	title: Scalars['String']['input'];
	type: ProcessType;
};

export type Subscription = {
	__typename?: 'Subscription';
	communicationUpdated: Communication;
	newCommunication: Communication;
	processCommentAdded: ProcessComment;
	processUpdated: HrProcess;
};

export type UpdateEmployeeInput = {
	address?: InputMaybe<Scalars['String']['input']>;
	departmentId?: InputMaybe<Scalars['ID']['input']>;
	firstName?: InputMaybe<Scalars['String']['input']>;
	lastName?: InputMaybe<Scalars['String']['input']>;
	managerId?: InputMaybe<Scalars['ID']['input']>;
	phone?: InputMaybe<Scalars['String']['input']>;
	position?: InputMaybe<Scalars['String']['input']>;
	salary?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateMyProfileInput = {
	address?: InputMaybe<Scalars['String']['input']>;
	phone?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
	__typename?: 'User';
	createdAt: Scalars['DateTime']['output'];
	email: Scalars['String']['output'];
	employee: Maybe<Employee>;
	firstName: Scalars['String']['output'];
	id: Scalars['ID']['output'];
	isActive: Scalars['Boolean']['output'];
	lastName: Scalars['String']['output'];
	permissions: Array<Scalars['String']['output']>;
	roles: Array<Role>;
	updatedAt: Scalars['DateTime']['output'];
};

export type LoginMutationVariables = Exact<{
	input: LoginInput;
}>;

export type LoginMutation = {
	__typename?: 'Mutation';
	login: {
		__typename?: 'AuthPayload';
		token: string;
		refreshToken: string;
		expiresAt: string;
		user: {
			__typename?: 'User';
			id: string;
			email: string;
			firstName: string;
			lastName: string;
			roles: Array<{ __typename?: 'Role'; id: string; name: string; level: number }>;
		};
	};
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = {
	__typename?: 'Query';
	me:
		| {
				__typename?: 'User';
				id: string;
				email: string;
				firstName: string;
				lastName: string;
				isActive: boolean;
				roles: Array<{
					__typename?: 'Role';
					id: string;
					name: string;
					level: number;
					permissions: Array<{
						__typename?: 'Permission';
						resource: string;
						action: string;
						scope: string | null | undefined;
					}>;
				}>;
				employee:
					| {
							__typename?: 'Employee';
							id: string;
							employeeId: string;
							position: string;
							department: { __typename?: 'Department'; id: string; name: string };
					  }
					| null
					| undefined;
		  }
		| null
		| undefined;
};

export type RefreshTokenMutationVariables = Exact<{
	refreshToken: Scalars['String']['input'];
}>;

export type RefreshTokenMutation = {
	__typename?: 'Mutation';
	refreshToken: {
		__typename?: 'AuthPayload';
		token: string;
		refreshToken: string;
		expiresAt: string;
	};
};
