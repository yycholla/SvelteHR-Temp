/**
 * Function and Trigger Definition Types
 *
 * Type definitions for PostgreSQL functions, procedures, and triggers.
 */

export type FunctionLanguage = 'plpgsql' | 'sql' | 'c' | 'internal';

export type FunctionArgMode = 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';

export interface FunctionArgument {
	argName: string | null;
	argType: string;
	argMode: FunctionArgMode;
	defaultValue: string | null;
}

export interface FunctionDefinition {
	functionName: string;
	functionSchema: string;
	returnType: string;
	language: FunctionLanguage; // plpgsql | sql | c | internal
	functionDefinition: string; // Full CREATE FUNCTION statement
	arguments: FunctionArgument[];
}

export type TriggerTiming = 'BEFORE' | 'AFTER' | 'INSTEAD OF';

export type TriggerEvent = 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';

export type TriggerLevel = 'ROW' | 'STATEMENT';

export interface TriggerDefinition {
	triggerName: string;
	tableName: string;
	timing: TriggerTiming; // BEFORE | AFTER | INSTEAD OF
	events: TriggerEvent[]; // INSERT, UPDATE, DELETE, TRUNCATE
	level: TriggerLevel; // ROW | STATEMENT
	whenCondition: string | null;
	functionName: string; // Name of function to execute
	triggerDefinition: string; // Full CREATE TRIGGER statement
}

/**
 * Validation Functions
 */

const VALID_FUNCTION_LANGUAGES: FunctionLanguage[] = ['plpgsql', 'sql', 'c', 'internal'];

export function validateFunctionLanguage(language: string): language is FunctionLanguage {
	return VALID_FUNCTION_LANGUAGES.includes(language as FunctionLanguage);
}

export function validateFunctionDefinition(func: FunctionDefinition): string[] {
	const errors: string[] = [];

	if (!validateFunctionLanguage(func.language)) {
		errors.push(
			`language must be one of: ${VALID_FUNCTION_LANGUAGES.join(', ')}`
		);
	}

	if (!func.functionDefinition || func.functionDefinition.trim().length === 0) {
		errors.push('functionDefinition must be valid CREATE FUNCTION SQL');
	}

	if (!func.functionName || func.functionName.trim().length === 0) {
		errors.push('functionName must be non-empty');
	}

	return errors;
}

const VALID_TRIGGER_TIMINGS: TriggerTiming[] = ['BEFORE', 'AFTER', 'INSTEAD OF'];
const VALID_TRIGGER_EVENTS: TriggerEvent[] = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'];
const VALID_TRIGGER_LEVELS: TriggerLevel[] = ['ROW', 'STATEMENT'];

export function validateTriggerTiming(timing: string): timing is TriggerTiming {
	return VALID_TRIGGER_TIMINGS.includes(timing as TriggerTiming);
}

export function validateTriggerEvent(event: string): event is TriggerEvent {
	return VALID_TRIGGER_EVENTS.includes(event as TriggerEvent);
}

export function validateTriggerLevel(level: string): level is TriggerLevel {
	return VALID_TRIGGER_LEVELS.includes(level as TriggerLevel);
}

export function validateTriggerDefinition(trigger: TriggerDefinition): string[] {
	const errors: string[] = [];

	if (trigger.events.length === 0) {
		errors.push('events array must be non-empty');
	}

	for (const event of trigger.events) {
		if (!validateTriggerEvent(event)) {
			errors.push(
				`Invalid trigger event: ${event}. Must be one of: ${VALID_TRIGGER_EVENTS.join(', ')}`
			);
		}
	}

	if (!validateTriggerTiming(trigger.timing)) {
		errors.push(
			`timing must be one of: ${VALID_TRIGGER_TIMINGS.join(', ')}`
		);
	}

	if (!validateTriggerLevel(trigger.level)) {
		errors.push(
			`level must be one of: ${VALID_TRIGGER_LEVELS.join(', ')}`
		);
	}

	if (!trigger.functionName || trigger.functionName.trim().length === 0) {
		errors.push('functionName must reference existing function');
	}

	if (!trigger.tableName || trigger.tableName.trim().length === 0) {
		errors.push('tableName must reference existing table');
	}

	if (!trigger.triggerDefinition || trigger.triggerDefinition.trim().length === 0) {
		errors.push('triggerDefinition must be valid CREATE TRIGGER SQL');
	}

	return errors;
}

export function validateFunctionArgument(arg: FunctionArgument): string[] {
	const errors: string[] = [];

	const validArgModes: FunctionArgMode[] = ['IN', 'OUT', 'INOUT', 'VARIADIC'];
	if (!validArgModes.includes(arg.argMode)) {
		errors.push(`argMode must be one of: ${validArgModes.join(', ')}`);
	}

	if (!arg.argType || arg.argType.trim().length === 0) {
		errors.push('argType must be non-empty');
	}

	return errors;
}
