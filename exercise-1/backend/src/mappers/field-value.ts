import type { TemplateFieldDefinition } from '../entities/template-definition.dto';
import type { FlatInput, FlatValue } from '../entities/translate-request.dto';

/** Absent, null and blank input all count as "not sent", so defaults apply to them. */
export function isProvided(value: FlatValue | undefined): value is Exclude<FlatValue, null> {
  if (value === undefined || value === null) return false;
  return typeof value !== 'string' || value.trim() !== '';
}

export function inputValue(input: FlatInput, sourceField: string): FlatValue | undefined {
  return Object.hasOwn(input, sourceField) ? input[sourceField] : undefined;
}

/** Whether a field must come from the client: it reads the input and has no fallback. */
export function isRequired(field: TemplateFieldDefinition): boolean {
  return field.sourceField !== null && field.defaultValue === null;
}

/** Input value if sent, otherwise the template default. An empty default is a real value. */
export function resolveFieldValue(field: TemplateFieldDefinition, input: FlatInput): FlatValue {
  if (field.sourceField !== null) {
    const value = inputValue(input, field.sourceField);
    if (isProvided(value)) return value;
  }
  return field.dataType === 'number' ? Number(field.defaultValue) : field.defaultValue;
}
