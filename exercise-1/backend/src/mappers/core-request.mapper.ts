import type { TemplateDefinition } from '../entities/template-definition.dto';
import type { FlatInput } from '../entities/translate-request.dto';
import { inputValue, resolveFieldValue } from './field-value';
import { mapStrings, parsePlaceholder } from './skeleton';

const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

/**
 * Builds the core's JSON from a validated template and input. This is pure and
 * has no product knowledge: the only names here are the core contract's item keys.
 */
export function toCoreRequest(template: TemplateDefinition, skeleton: unknown, input: FlatInput): unknown {
  const dynamicData = [...template.fields]
    .sort(byOrder)
    .map((field) => ({ etiqueta: field.label, value: resolveFieldValue(field, input) }));

  const events = [...template.events]
    .sort(byOrder)
    .map((event) => ({ description: event.name, orderEvent: event.order }));

  return mapStrings(skeleton, (value) => {
    const placeholder = parsePlaceholder(value);
    switch (placeholder?.kind) {
      case 'input':
        return inputValue(input, placeholder.sourceField);
      case 'dynamicData':
        return dynamicData;
      case 'events':
        return events;
      default:
        return value;
    }
  });
}
