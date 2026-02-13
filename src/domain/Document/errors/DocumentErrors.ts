export class DocumentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DocumentError';
	}
}

export class DocumentTitleValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'DocumentTitleValidationError';
	}
}

export class DocumentTypeValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'DocumentTypeValidationError';
	}
}

export class FileSizeValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'FileSizeValidationError';
	}
}

export class MimeTypeValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'MimeTypeValidationError';
	}
}

export class UploadedByValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'UploadedByValidationError';
	}
}

export class DocumentStatusValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'DocumentStatusValidationError';
	}
}

export class DocumentValidationError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'DocumentValidationError';
	}
}

export class DocumentNotFoundError extends DocumentError {
	constructor(documentId: string) {
		super(`Document not found: ${documentId}`);
		this.name = 'DocumentNotFoundError';
	}
}

export class DocumentStatusTransitionError extends DocumentError {
	constructor(message: string) {
		super(message);
		this.name = 'DocumentStatusTransitionError';
	}
}
