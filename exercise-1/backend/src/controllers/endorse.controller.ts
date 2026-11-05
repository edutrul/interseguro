import Boom from '@hapi/boom';
import type { Request, ResponseToolkit } from '@hapi/hapi';
import { log } from '../config/logger';
import { InputValidationError, InvalidTemplateError, TemplateNotFoundError } from '../entities/errors';
import type { TranslateRequest } from '../entities/translate-request.dto';
import type { TranslationService } from '../services/translation.service';

export class EndorseController {
  constructor(private readonly translationService: TranslationService) {}

  translate = async (request: Request, h: ResponseToolkit) => {
    try {
      const { coreRequest, templateVersion } = await this.translationService.translate(
        request.payload as TranslateRequest,
      );
      return h.response(coreRequest as object).header('X-Template-Version', String(templateVersion));
    } catch (error) {
      throw toHttpError(error, request.app.requestId);
    }
  };
}

function toHttpError(error: unknown, requestId: string): unknown {
  if (error instanceof InputValidationError) {
    const boom = Boom.badRequest(error.message);
    Object.assign(boom.output.payload, {
      missingFields: error.missingFields,
      invalidFields: error.invalidFields,
    });
    return boom;
  }
  if (error instanceof TemplateNotFoundError) {
    return Boom.notFound(error.message);
  }
  if (error instanceof InvalidTemplateError) {
    // The details are for operators, so they stay in the logs.
    log('error', 'invalid_template', { requestId, template: error.message, issues: error.issues });
    return Boom.badData('The template configured for this request is invalid');
  }
  return error;
}
