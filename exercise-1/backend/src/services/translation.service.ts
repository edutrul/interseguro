import { InputValidationError, InvalidTemplateError, TemplateNotFoundError } from '../entities/errors';
import type { TranslateRequest } from '../entities/translate-request.dto';
import { toCoreRequest } from '../mappers/core-request.mapper';
import type { TemplateReader } from '../repositories/template.repository';
import { validateInput } from './input-validator';
import { parseAndValidateTemplate } from './template-validator';

export interface TranslationResult {
  coreRequest: unknown;
  templateVersion: number;
}

export class TranslationService {
  constructor(private readonly templates: TemplateReader) {}

  async translate(request: TranslateRequest): Promise<TranslationResult> {
    const { producto: productCode, tipoEndoso: endorsementType } = request;

    const template = await this.templates.findActive(productCode, endorsementType);
    if (!template) {
      throw new TemplateNotFoundError(productCode, endorsementType);
    }

    const { skeleton, issues } = parseAndValidateTemplate(template);
    if (issues.length > 0) {
      throw new InvalidTemplateError(productCode, endorsementType, template.version, issues);
    }

    const { missingFields, invalidFields } = validateInput(template, skeleton, request);
    if (missingFields.length > 0 || invalidFields.length > 0) {
      throw new InputValidationError(missingFields, invalidFields);
    }

    return { coreRequest: toCoreRequest(template, skeleton, request), templateVersion: template.version };
  }
}
