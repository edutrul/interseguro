import type { DataType, TemplateDefinition } from '../entities/template-definition.dto';
import { collectPlaceholders, isMalformedPlaceholder, mapStrings } from '../mappers/skeleton';
import { matchesDataType } from './data-type';

export type SkeletonParseResult = { skeleton: unknown; issues: string[] };

/**
 * Checks what the database constraints cannot express. It runs when a template
 * is imported and on each translation, because rows can also be edited directly.
 */
export function parseAndValidateTemplate(template: TemplateDefinition): SkeletonParseResult {
  let skeleton: unknown;
  try {
    skeleton = JSON.parse(template.outputSkeleton);
  } catch {
    return { skeleton: undefined, issues: ['output skeleton is not valid JSON'] };
  }
  if (skeleton === null || typeof skeleton !== 'object' || Array.isArray(skeleton)) {
    return { skeleton: undefined, issues: ['output skeleton must be a JSON object'] };
  }

  const issues: string[] = [];
  mapStrings(skeleton, (value) => {
    if (isMalformedPlaceholder(value)) issues.push(`malformed placeholder: ${value}`);
    return value;
  });

  const placeholders = collectPlaceholders(skeleton);
  if (placeholders.some((p) => p.kind === 'dynamicData') && template.fields.length === 0) {
    issues.push('skeleton uses {{$dynamicData}} but the template has no fields');
  }
  if (placeholders.some((p) => p.kind === 'events') && template.events.length === 0) {
    issues.push('skeleton uses {{$events}} but the template has no events');
  }

  for (const field of template.fields) {
    if (field.sourceField === null && field.defaultValue === null) {
      issues.push(`field '${field.label}' has neither a source field nor a default value`);
    }
    if (field.defaultValue !== null && !defaultMatchesType(field.defaultValue, field.dataType)) {
      issues.push(`default value of field '${field.label}' is not a valid ${field.dataType}`);
    }
  }
  return { skeleton, issues };
}

function defaultMatchesType(defaultValue: string, dataType: DataType): boolean {
  if (dataType === 'string') return true;
  return matchesDataType(dataType === 'number' ? Number(defaultValue) : defaultValue, dataType);
}
