import Joi from 'joi';
import { DATA_TYPES, type TemplateDefinition } from '../entities/template-definition.dto';
import type { TemplateWriter } from '../repositories/template.repository';
import { parseAndValidateTemplate } from './template-validator';

/** The file format people edit. List position defines field and event order. */
export interface TemplateFile {
  productCode: string;
  endorsementType: string;
  version: number;
  outputSkeleton: Record<string, unknown>;
  fields: { label: string; sourceField?: string | null; defaultValue?: string | null; dataType?: string }[];
  events: string[];
}

const templateFileSchema = Joi.object({
  productCode: Joi.string().required(),
  endorsementType: Joi.string().required(),
  version: Joi.number().integer().min(1).required(),
  outputSkeleton: Joi.object().required(),
  fields: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().required(),
        sourceField: Joi.string().allow(null),
        defaultValue: Joi.string().allow('', null),
        dataType: Joi.string().valid(...DATA_TYPES),
      }),
    )
    .required(),
  events: Joi.array().items(Joi.string()).required(),
});

export type ImportOutcome = 'imported' | 'already-exists';

export class TemplateImportService {
  constructor(private readonly templates: TemplateWriter) {}

  /** Validates, then atomically stores the version and makes it the active one. */
  async import(file: unknown): Promise<ImportOutcome> {
    const template = toDefinition(file);
    const { issues } = parseAndValidateTemplate(template);
    if (issues.length > 0) {
      throw new Error(`Invalid template:\n- ${issues.join('\n- ')}`);
    }
    if (await this.templates.exists(template.productCode, template.endorsementType, template.version)) {
      return 'already-exists';
    }
    await this.templates.insertAsActive(template);
    return 'imported';
  }
}

function toDefinition(file: unknown): TemplateDefinition {
  const { error, value } = templateFileSchema.validate(file, { abortEarly: false });
  if (error) {
    throw new Error(`Invalid template file: ${error.message}`);
  }
  const parsed = value as TemplateFile;
  return {
    productCode: parsed.productCode,
    endorsementType: parsed.endorsementType,
    version: parsed.version,
    outputSkeleton: JSON.stringify(parsed.outputSkeleton),
    fields: parsed.fields.map((field, index) => ({
      label: field.label,
      sourceField: field.sourceField ?? null,
      defaultValue: field.defaultValue ?? null,
      dataType: (field.dataType ?? 'string') as TemplateDefinition['fields'][number]['dataType'],
      order: index + 1,
    })),
    events: parsed.events.map((name, index) => ({ name, order: index + 1 })),
  };
}
