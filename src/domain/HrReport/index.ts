// Domain layer barrel export for HrReport module
export { HrReport } from './HrReport';
export type { CreateHrReportData } from './HrReport';
export { ReportStatus } from './value-objects/ReportStatus';
export type { ReportStatusValue } from './value-objects/ReportStatus';
export { ReportTitle } from './value-objects/ReportTitle';
export { ReportType } from './value-objects/ReportType';
export type { ReportTypeValue } from './value-objects/ReportType';
export { HrReportError, HrReportNotFoundError, InvalidHrReportError } from './errors/HrReportErrors';
