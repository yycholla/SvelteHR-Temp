// src/domain/Skill/index.ts
export { Skill } from './Skill';
export type { CreateSkillData } from './Skill';
export { SkillName } from './value-objects/SkillName';
export { ProficiencyLevel } from './value-objects/ProficiencyLevel';
export { SkillCategory } from './value-objects/SkillCategory';
export { SkillError, SkillNotFoundError, InvalidSkillError } from './errors/SkillErrors';
export type { SkillError as SkillErrorType } from './errors/SkillErrors';
