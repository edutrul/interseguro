import Boom from '@hapi/boom';
import type { Server } from '@hapi/hapi';
import type { DataSource } from 'typeorm';

export function registerHealthRoutes(server: Server, dataSource: DataSource): void {
  server.route({
    method: 'GET',
    path: '/health',
    options: { auth: false },
    handler: async () => {
      try {
        await dataSource.query('SELECT 1');
        return { status: 'ok' };
      } catch {
        throw Boom.serverUnavailable('Database unavailable');
      }
    },
  });
}
