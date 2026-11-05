import { randomUUID } from 'node:crypto';
import Hapi, { type Server } from '@hapi/hapi';
import HapiJwt from '@hapi/jwt';
import type { DataSource } from 'typeorm';
import type { JwtConfig } from './config/env';
import { log } from './config/logger';
import { EndorseController } from './controllers/endorse.controller';
import { TypeOrmTemplateRepository } from './repositories/template.repository';
import { registerEndorseRoutes } from './routes/endorse.routes';
import { registerHealthRoutes } from './routes/health.routes';
import { TranslationService } from './services/translation.service';

export interface AppOptions {
  dataSource: DataSource;
  jwt: JwtConfig;
  host?: string;
  port?: number;
}

const API_V1_PREFIX = '/api/v1';

declare module '@hapi/hapi' {
  interface RequestApplicationState {
    requestId: string;
  }
}

/** The composition root: the only place that wires concrete classes together. */
export async function createApp({ dataSource, jwt, host, port }: AppOptions): Promise<Server> {
  const server = Hapi.server({ host, port, routes: { security: true } });

  await server.register(HapiJwt);
  server.auth.strategy('jwt', 'jwt', {
    keys: { key: jwt.secret, algorithms: ['HS256'] },
    verify: { aud: jwt.audience, iss: jwt.issuer, sub: false, nbf: true, exp: true },
    validate: () => ({ isValid: true }),
  });
  // Routes are protected unless they explicitly opt out.
  server.auth.default('jwt');

  const controller = new EndorseController(new TranslationService(new TypeOrmTemplateRepository(dataSource)));
  await server.register(
    {
      name: 'api-v1',
      register: (api: Server) => registerEndorseRoutes(api, controller),
    },
    { routes: { prefix: API_V1_PREFIX } },
  );
  registerHealthRoutes(server, dataSource);

  // Hapi's built-in request id contains the hostname, which clients should not see.
  server.ext('onRequest', (request, h) => {
    request.app.requestId = randomUUID();
    return h.continue;
  });

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;
    if ('isBoom' in response) {
      response.output.headers['X-Request-Id'] = request.app.requestId;
    } else {
      response.header('X-Request-Id', request.app.requestId);
    }
    return h.continue;
  });

  server.events.on({ name: 'request', channels: 'error' }, (request, event) => {
    log('error', 'unhandled_error', { requestId: request.app.requestId, message: (event.error as Error)?.message });
  });
  server.events.on('response', (request) => {
    const { response } = request;
    log('info', 'request', {
      requestId: request.app.requestId,
      method: request.method,
      path: request.path,
      status: 'isBoom' in response ? response.output.statusCode : response.statusCode,
      durationMs: request.info.completed - request.info.received,
    });
  });

  return server;
}
