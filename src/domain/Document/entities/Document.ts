import { Result } from '$domain/Result';
import { DocumentTitle } from '../value-objects/DocumentTitle';
import { DocumentType } from '../value-objects/DocumentType';
import { FileSize } from '../value-objects/FileSize';
import { MimeType } from '../value-objects/MimeType';
import { UploadedBy } from '../value-objects/UploadedBy';
import { DocumentStatus } from '../value-objects/DocumentStatus';
import { DocumentValidationError } from '../errors/DocumentErrors';

export interface DocumentProps {
	id: string;
	title: DocumentTitle;
	type: DocumentType;
	fileSize: FileSize;
	mimeType: MimeType;
	uploadedBy: UploadedBy;
	status: DocumentStatus;
	filePath: string;
	uploadedAt: Date;
	updatedAt: Date;
}

export class Document {
	private constructor(private readonly props: DocumentProps) {}

	static create(props: DocumentProps): Result<Document, DocumentValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new DocumentValidationError('ID is required'));
		}

		if (!props.filePath?.trim()) {
			return Result.error(new DocumentValidationError('File path is required'));
		}

		// Defensive copies for dates
		const safeProps: DocumentProps = {
			...props,
			uploadedAt: new Date(props.uploadedAt.getTime()),
			updatedAt: new Date(props.updatedAt.getTime())
		};

		return Result.ok(new Document(safeProps));
	}

	// Getters with defensive copies where needed
	get id(): string {
		return this.props.id;
	}

	get title(): DocumentTitle {
		return this.props.title;
	}

	get type(): DocumentType {
		return this.props.type;
	}

	get fileSize(): FileSize {
		return this.props.fileSize;
	}

	get mimeType(): MimeType {
		return this.props.mimeType;
	}

	get uploadedBy(): UploadedBy {
		return this.props.uploadedBy;
	}

	get status(): DocumentStatus {
		return this.props.status;
	}

	get filePath(): string {
		return this.props.filePath;
	}

	get uploadedAt(): Date {
		return new Date(this.props.uploadedAt.getTime());
	}

	get updatedAt(): Date {
		return new Date(this.props.updatedAt.getTime());
	}

	// Status transition methods (immutable pattern)
	publish(): Document {
		const publishedStatus = DocumentStatus.create('published').value!;
		return new Document({
			...this.props,
			status: publishedStatus,
			updatedAt: new Date()
		});
	}

	archive(): Document {
		const archivedStatus = DocumentStatus.create('archived').value!;
		return new Document({
			...this.props,
			status: archivedStatus,
			updatedAt: new Date()
		});
	}

	delete(): Document {
		const deletedStatus = DocumentStatus.create('deleted').value!;
		return new Document({
			...this.props,
			status: deletedStatus,
			updatedAt: new Date()
		});
	}

	// Update methods (immutable pattern)
	updateTitle(title: DocumentTitle): Document {
		return new Document({
			...this.props,
			title,
			updatedAt: new Date()
		});
	}

	equals(other: Document): boolean {
		return this.props.id === other.props.id;
	}
}
