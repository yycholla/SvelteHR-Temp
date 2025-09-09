export interface Department {
	id: string;
	name: string;
	color: string;
}

export interface Position {
	id: string;
	title: string;
	level: string;
}

export interface Employee {
	id: string;
	employeeId: string;
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	avatar?: string;
	position: Position;
	department: Department;
	status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
	hireDate: string;
	managerId?: string;
	salary?: number;
	location: string;
}

export const departments: Department[] = [
	{ id: '1', name: 'Engineering', color: 'blue' },
	{ id: '2', name: 'Human Resources', color: 'green' },
	{ id: '3', name: 'Marketing', color: 'purple' },
	{ id: '4', name: 'Sales', color: 'orange' },
	{ id: '5', name: 'Finance', color: 'emerald' },
	{ id: '6', name: 'Operations', color: 'indigo' },
	{ id: '7', name: 'Design', color: 'pink' },
	{ id: '8', name: 'Legal', color: 'slate' }
];

export const positions: Position[] = [
	{ id: '1', title: 'Software Engineer', level: 'Mid' },
	{ id: '2', title: 'Senior Software Engineer', level: 'Senior' },
	{ id: '3', title: 'Staff Engineer', level: 'Staff' },
	{ id: '4', title: 'Engineering Manager', level: 'Manager' },
	{ id: '5', title: 'Product Manager', level: 'Manager' },
	{ id: '6', title: 'Designer', level: 'Mid' },
	{ id: '7', title: 'Senior Designer', level: 'Senior' },
	{ id: '8', title: 'Design Manager', level: 'Manager' },
	{ id: '9', title: 'Marketing Specialist', level: 'Mid' },
	{ id: '10', title: 'Marketing Manager', level: 'Manager' },
	{ id: '11', title: 'Sales Representative', level: 'Mid' },
	{ id: '12', title: 'Sales Manager', level: 'Manager' },
	{ id: '13', title: 'HR Specialist', level: 'Mid' },
	{ id: '14', title: 'HR Manager', level: 'Manager' },
	{ id: '15', title: 'Financial Analyst', level: 'Mid' },
	{ id: '16', title: 'Finance Manager', level: 'Manager' },
	{ id: '17', title: 'Operations Coordinator', level: 'Junior' },
	{ id: '18', title: 'Operations Manager', level: 'Manager' },
	{ id: '19', title: 'Legal Counsel', level: 'Senior' },
	{ id: '20', title: 'Chief Technology Officer', level: 'Executive' }
];

export const mockEmployees: Employee[] = [
	{
		id: '1',
		employeeId: 'EMP001',
		firstName: 'Sarah',
		lastName: 'Johnson',
		email: 'sarah.johnson@company.com',
		phone: '+1 (555) 123-4567',
		avatar:
			'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
		position: positions[1], // Senior Software Engineer
		department: departments[0], // Engineering
		status: 'ACTIVE',
		hireDate: '2022-03-15',
		location: 'San Francisco, CA',
		salary: 125000
	},
	{
		id: '2',
		employeeId: 'EMP002',
		firstName: 'Michael',
		lastName: 'Chen',
		email: 'michael.chen@company.com',
		phone: '+1 (555) 234-5678',
		avatar:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
		position: positions[3], // Engineering Manager
		department: departments[0], // Engineering
		status: 'ACTIVE',
		hireDate: '2020-01-20',
		location: 'San Francisco, CA',
		salary: 160000
	},
	{
		id: '3',
		employeeId: 'EMP003',
		firstName: 'Emily',
		lastName: 'Davis',
		email: 'emily.davis@company.com',
		phone: '+1 (555) 345-6789',
		avatar:
			'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
		position: positions[13], // HR Manager
		department: departments[1], // Human Resources
		status: 'ACTIVE',
		hireDate: '2021-06-10',
		location: 'New York, NY',
		salary: 95000
	},
	{
		id: '4',
		employeeId: 'EMP004',
		firstName: 'David',
		lastName: 'Wilson',
		email: 'david.wilson@company.com',
		phone: '+1 (555) 456-7890',
		avatar:
			'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
		position: positions[6], // Senior Designer
		department: departments[6], // Design
		status: 'ACTIVE',
		hireDate: '2021-09-05',
		location: 'Austin, TX',
		salary: 115000
	},
	{
		id: '5',
		employeeId: 'EMP005',
		firstName: 'Jessica',
		lastName: 'Martinez',
		email: 'jessica.martinez@company.com',
		phone: '+1 (555) 567-8901',
		avatar:
			'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
		position: positions[9], // Marketing Manager
		department: departments[2], // Marketing
		status: 'ON_LEAVE',
		hireDate: '2020-11-12',
		location: 'Los Angeles, CA',
		salary: 105000
	},
	{
		id: '6',
		employeeId: 'EMP006',
		firstName: 'Robert',
		lastName: 'Brown',
		email: 'robert.brown@company.com',
		phone: '+1 (555) 678-9012',
		avatar:
			'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
		position: positions[11], // Sales Manager
		department: departments[3], // Sales
		status: 'ACTIVE',
		hireDate: '2019-04-22',
		location: 'Chicago, IL',
		salary: 130000
	},
	{
		id: '7',
		employeeId: 'EMP007',
		firstName: 'Amanda',
		lastName: 'Thompson',
		email: 'amanda.thompson@company.com',
		phone: '+1 (555) 789-0123',
		avatar:
			'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face',
		position: positions[14], // Financial Analyst
		department: departments[4], // Finance
		status: 'ACTIVE',
		hireDate: '2022-07-18',
		location: 'New York, NY',
		salary: 85000
	},
	{
		id: '8',
		employeeId: 'EMP008',
		firstName: 'Kevin',
		lastName: 'Lee',
		email: 'kevin.lee@company.com',
		phone: '+1 (555) 890-1234',
		avatar:
			'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face',
		position: positions[0], // Software Engineer
		department: departments[0], // Engineering
		status: 'ACTIVE',
		hireDate: '2023-01-09',
		location: 'Seattle, WA',
		salary: 100000
	},
	{
		id: '9',
		employeeId: 'EMP009',
		firstName: 'Lisa',
		lastName: 'Garcia',
		email: 'lisa.garcia@company.com',
		phone: '+1 (555) 901-2345',
		avatar:
			'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
		position: positions[17], // Operations Manager
		department: departments[5], // Operations
		status: 'ACTIVE',
		hireDate: '2021-02-28',
		location: 'Denver, CO',
		salary: 110000
	},
	{
		id: '10',
		employeeId: 'EMP010',
		firstName: 'James',
		lastName: 'Anderson',
		email: 'james.anderson@company.com',
		phone: '+1 (555) 012-3456',
		avatar:
			'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
		position: positions[4], // Product Manager
		department: departments[0], // Engineering
		status: 'ACTIVE',
		hireDate: '2020-08-14',
		location: 'San Francisco, CA',
		salary: 140000
	},
	{
		id: '11',
		employeeId: 'EMP011',
		firstName: 'Sophia',
		lastName: 'White',
		email: 'sophia.white@company.com',
		phone: '+1 (555) 123-4567',
		avatar:
			'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
		position: positions[5], // Designer
		department: departments[6], // Design
		status: 'ACTIVE',
		hireDate: '2022-11-07',
		location: 'Portland, OR',
		salary: 90000
	},
	{
		id: '12',
		employeeId: 'EMP012',
		firstName: 'Daniel',
		lastName: 'Taylor',
		email: 'daniel.taylor@company.com',
		phone: '+1 (555) 234-5678',
		position: positions[10], // Sales Representative
		department: departments[3], // Sales
		status: 'INACTIVE',
		hireDate: '2021-12-03',
		location: 'Miami, FL',
		salary: 70000
	}
];
