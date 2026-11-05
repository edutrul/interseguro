import type { Lifecycle, Server } from '@hapi/hapi';
import type { EndorseController } from '../controllers/endorse.controller';
import { translateRequestSchema } from '../entities/translate-request.dto';

const exposeValidationError: Lifecycle.FailAction = (_request, _h, error) => {
  throw error;
};

export function registerEndorseRoutes(server: Server, controller: EndorseController): void {
  server.route({
    method: 'POST',
    path: '/endorse/translate',
    handler: controller.translate,
    options: {
      payload: { maxBytes: 64 * 1024 },
      validate: { payload: translateRequestSchema, failAction: exposeValidationError },
    },
  });
}
