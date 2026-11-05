import { describe, expect, it } from 'vitest';
import type { TemplateDefinition } from '../src/entities/template-definition.dto';
import { toCoreRequest } from '../src/mappers/core-request.mapper';

const template: TemplateDefinition = {
  productCode: 'P',
  endorsementType: 'T',
  version: 1,
  outputSkeleton: '{}',
  fields: [
    { label: 'Third', sourceField: null, defaultValue: 'c', dataType: 'string', order: 3 },
    { label: 'First', sourceField: 'a', defaultValue: 'fallback', dataType: 'string', order: 1 },
    { label: 'Second', sourceField: null, defaultValue: '', dataType: 'string', order: 2 },
  ],
  events: [
    { name: 'Later', order: 2 },
    { name: 'Earlier', order: 1 },
  ],
};
const skeleton = { data: '{{$dynamicData}}', events: '{{$events}}', id: '{{id|number}}', fixed: 'literal' };

describe('toCoreRequest', () => {
  it('orders dynamicData and events by their configured order, whatever the row order', () => {
    const result = toCoreRequest(template, skeleton, { id: 1 }) as { data: unknown; events: unknown };
    expect(result.data).toEqual([
      { etiqueta: 'First', value: 'fallback' },
      { etiqueta: 'Second', value: '' },
      { etiqueta: 'Third', value: 'c' },
    ]);
    expect(result.events).toEqual([
      { description: 'Earlier', orderEvent: 1 },
      { description: 'Later', orderEvent: 2 },
    ]);
  });

  it('prefers a sent value over the default and treats blank input as not sent', () => {
    const data = (input: Record<string, string | number>) =>
      (toCoreRequest(template, skeleton, input) as { data: { value: unknown }[] }).data[0].value;
    expect(data({ id: 1, a: 'sent' })).toBe('sent');
    expect(data({ id: 1, a: '   ' })).toBe('fallback');
  });

  it('keeps the input type and leaves literals untouched', () => {
    const result = toCoreRequest(template, skeleton, { id: 42 }) as { id: unknown; fixed: unknown };
    expect(result.id).toBe(42);
    expect(result.fixed).toBe('literal');
  });

  it('preserves the skeleton key order', () => {
    expect(Object.keys(toCoreRequest(template, skeleton, { id: 1 }) as object)).toEqual([
      'data',
      'events',
      'id',
      'fixed',
    ]);
  });

  it('does not read inherited properties as input', () => {
    const result = toCoreRequest(template, { x: '{{constructor}}' }, {}) as { x: unknown };
    expect(result.x).toBeUndefined();
  });
});
