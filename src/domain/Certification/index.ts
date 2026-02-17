// src/domain/Certification/index.ts
export { Certification } from './Certification';
export type { CreateCertificationData } from './Certification';
export { CertificationName } from './value-objects/CertificationName';
export { IssuingOrganization } from './value-objects/IssuingOrganization';
export { CredentialId } from './value-objects/CredentialId';
export {
	CertificationError,
	CertificationNotFoundError,
	InvalidCertificationError
} from './errors/CertificationErrors';
export type { CertificationError as CertificationErrorType } from './errors/CertificationErrors';
