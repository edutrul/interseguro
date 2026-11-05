import type { InvalidField } from '../entities/errors';
import type { DataType, TemplateDefinition } from '../entities/template-definition.dto';
import type { FlatInput } from '../entities/translate-request.dto';
import { inputValue, isProvided, isRequired } from '../mappers/field-value';
import { collectPlaceholders } from '../mappers/skeleton';
import { matchesDataType } from './data-type';

export interface InputIssues {
  missingFields: string[];
  invalidFields: InvalidField[];
}

interface Rule {
  sourceField: string;
  required: boolean;
  dataType?: DataType;
}

/** Everything the client must satisfy comes from the template. All problems are reported at once. */
export function validateInput(template: TemplateDefinition, skeleton: unknown, input: FlatInput): InputIssues {
  const rules: Rule[] = [
    ...collectPlaceholders(skeleton).flatMap((placeholder) =>
      placeholder.kind === 'input'
        ? [{ sourceField: placeholder.sourceField, required: true, dataType: placeholder.dataType }]
        : [],
    ),
    ...template.fields.flatMap((field) =>
      field.sourceField === null
        ? []
        : [{ sourceField: field.sourceField, required: isRequired(field), dataType: field.dataType }],
    ),
  ];

  const missing = new Set<string>();
  const invalid = new Map<string, string>();
  for (const { sourceField, required, dataType } of rules) {
    const value = inputValue(input, sourceField);
    if (!isProvided(value)) {
      if (required) missing.add(sourceField);
    } else if (dataType && !matchesDataType(value, dataType)) {
      invalid.set(sourceField, dataType);
    }
  }
  return {
    missingFields: [...missing],
    invalidFields: [...invalid].map(([field, expected]) => ({ field, expected })),
  };
}
