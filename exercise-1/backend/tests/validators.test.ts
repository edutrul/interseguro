import { describe, expect, it } from 'vitest';
import type { TemplateDefinition } from '../src/entities/template-definition.dto';
import { validateInput } from '../src/services/input-validator';
import { parseAndValidateTemplate } from '../src/services/template-validator';

const baseTemplate: TemplateDefinition = {
  productCode: 'P',
  endorsementType: 'T',
  version: 1,
  outputSkeleton: '{"list":"{{$dynamicData}}","id":"{{id|number}}"}',
  fields: [
    { label: 'Required', sourceField: 'req', defaultValue: null, dataType: 'string', order: 1 },
    { label: 'Optional', sourceField: 'opt', defaultValue: 'x', dataType: 'string', order: 2 },
    { label: 'Fixed', sourceField: null, defaultValue: 'y', dataType: 'string', order: 3 },
    { label: 'When', sourceField: 'when', defaultValue: '2025-01-01', dataType: 'date', order: 4 },
  ],
  events: [],
};
const skeleton = JSON.parse(baseTemplate.outputSkeleton);

describe('validateInput', () => {
  it('derives required fields from the template and reports them all at once', () => {
    expect(validateInput(baseTemplate, skeleton, {}).missingFields).toEqual(['id', 'req']);
  });

  it('does not require fields that have a default', () => {
    expect(validateInput(baseTemplate, skeleton, { id: 1, req: 'r' })).toEqual({
      missingFields: [],
      invalidFields: [],
    });
  });

  it.each([null, '', '   '])('treats %j as not sent', (value) => {
    expect(validateInput(baseTemplate, skeleton, { id: 1, req: value }).missingFields).toEqual(['req']);
  });

  it.each([
    ['id', '5984', 'number'],
    ['req', 123, 'string'],
    ['when', '27/08/2025', 'date'],
    ['when', '2025-02-30', 'date'],
  ])('rejects %s=%j as not a %s', (field, value, expected) => {
    const input = { id: 1, req: 'r', [field]: value };
    expect(validateInput(baseTemplate, skeleton, input).invalidFields).toEqual([{ field, expected }]);
  });
});

describe('parseAndValidateTemplate', () => {
  const issuesFor = (overrides: Partial<TemplateDefinition>) =>
    parseAndValidateTemplate({ ...baseTemplate, ...overrides }).issues;

  it('accepts a valid template', () => {
    expect(issuesFor({})).toEqual([]);
  });

  it.each([
    ['not json', 'not valid JSON'],
    ['[]', 'must be a JSON object'],
    ['{"a":"{{unknown|type}}"}', 'malformed placeholder'],
    ['{"a":"prefix {{b}}"}', 'malformed placeholder'],
    ['{"a":"{{$events}}"}', 'no events'],
  ])('rejects the skeleton %s', (outputSkeleton, message) => {
    expect(issuesFor({ outputSkeleton }).join()).toContain(message);
  });

  it('rejects a field with no way of getting a value', () => {
    const fields = [{ label: 'X', sourceField: null, defaultValue: null, dataType: 'string' as const, order: 1 }];
    expect(issuesFor({ fields }).join()).toContain('neither a source field nor a default');
  });

  it('rejects a default that does not match its data type', () => {
    const fields = [{ label: 'X', sourceField: null, defaultValue: 'soon', dataType: 'date' as const, order: 1 }];
    expect(issuesFor({ fields }).join()).toContain('not a valid date');
  });
});
