export const CREATE_TRAINING_MUTATION = `
    mutation CreateTraining($input: CreateTrainingInput!) {
        training {
            createTraining(input: $input) {
                id
                title
                metaTitle
                metaDescription
                tags
                authorId
            }
        }
    }
`;

export const UPDATE_TRAINING_MUTATION = `
    mutation UpdateTraining($id: UUID!, $input: UpdateTrainingInput!) {
        training {
            updateTraining(id: $id, input: $input) {
                id
                title
                metaTitle
                metaDescription
                tags
                authorId
            }
        }
    }
`;

export const CREATE_CONTENT_MUTATION = `
    mutation CreateContent($input: CreateTrainingContentInput!) {
        training {
            createTrainingContent(input: $input) {
                id
                title
                type
                data
                sequenceOrder
            }
        }
    }
`;

export const UPDATE_CONTENT_MUTATION = `
    mutation UpdateContent($id: UUID!, $input: UpdateTrainingContentInput!) {
        training {
            updateTrainingContent(id: $id, input: $input) {
                id
                title
                type
                data
                sequenceOrder
            }
        }
    }
    `;

export const DELETE_CONTENT_MUTATION = `
    mutation DeleteContent($id: UUID!) {
        training {
            deleteTrainingContent(id: $id)
        }
    }
`;

export const DELETE_TRAINING_MUTATION = `
    mutation DeleteTraining($id: UUID!) {
        training {
            deleteTraining(id: $id)
        }
    }
`;

// Training Assignments Operations
export const GET_ALL_USERS_QUERY = `
    query GetAllUsers {
        users {
            id
            email
            displayName
        }
    }
`;

export const GET_ALL_DEPARTMENTS_QUERY = `
    query GetAllDepartments {
        departments(limit: 200, offset: 0) {
            items {
                id
                name
                employeeCount
            }
        }
    }
`;

export const GET_TRAINING_ASSIGNMENTS_QUERY = `
    query GetTrainingAssignments($trainingId: UUID!) {
        trainingAssignments(trainingId: $trainingId) {
            id
            userId
            trainingId
            assignedAt
            dueDate
            user {
                id
                email
                displayName
            }
        }
    }
`;

export const CREATE_ASSIGNMENT_MUTATION = `
    mutation CreateAssignment($input: CreateTrainingAssignmentInput!) {
        training {
            assignTraining(input: $input) {
                id
                userId
                trainingId
                assignedAt
                dueDate
            }
        }
    }
`;

export const DELETE_ASSIGNMENT_MUTATION = `
    mutation DeleteAssignment($id: UUID!) {
        training {
            deleteTrainingAssignment(id: $id)
        }
    }
`;

// Bulk assignment mutations
export const ASSIGN_TO_DEPARTMENT_MUTATION = `
    mutation AssignToDepartment($trainingId: UUID!, $departmentId: UUID!, $dueDate: DateTime) {
        training {
            assignTrainingToDepartment(trainingId: $trainingId, departmentId: $departmentId, dueDate: $dueDate)
        }
    }
`;

export const ASSIGN_TO_ALL_EMPLOYEES_MUTATION = `
    mutation AssignToAllEmployees($trainingId: UUID!, $dueDate: DateTime) {
        training {
            assignTrainingToAllEmployees(trainingId: $trainingId, dueDate: $dueDate)
        }
    }
`;

export const GET_ALL_TRAINING_ASSIGNMENTS_QUERY = `
    query GetAllTrainingAssignments {
        allTrainingAssignments {
            id
            trainingId
            userId
            user {
                id
                displayName
                email
            }
        }
    }
`;

export const GET_MY_TRAININGS_QUERY = `
    query GetMyTrainings {
        myTrainings {
            id
            title
            description
            startDate
            endDate
            tags
        }
    }
`;

export const GET_TRAINING_DETAILS_QUERY = `
    query GetTrainingDetails($id: UUID!) {
        training(id: $id) {
            id
            title
            description
        }
        trainingContents(trainingId: $id) {
            id
            title
            type
            data
            sequenceOrder
        }
        myTrainingProgress(trainingId: $id) {
            id
            trainingContentId
            status
            completedAt
        }
    }
`;

export const GET_TRAINING_PROGRESS_QUERY = `
    query GetTrainingProgress($trainingId: UUID!, $userId: UUID!) {
        trainingProgress(trainingId: $trainingId, userId: $userId) {
            id
            trainingContentId
            status
            completedAt
        }
    }
`;

export const UPDATE_PROGRESS_MUTATION = `
    mutation UpdateProgress($contentId: UUID!, $input: UpdateTrainingProgressInput!) {
        training {
            updateProgress(contentId: $contentId, input: $input) {
                id
                status
                completedAt
            }
        }
    }
`;
