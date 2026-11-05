import { createApp } from './app';
import { loadConfig } from './config/env';
import { log } from './config/logger';
import { openDatabase } from './database/data-source';

async function main(): Promise<void> {
  const config = loadConfig();
  const dataSource = await openDatabase(config.databasePath);
  const server = await createApp({ dataSource, jwt: config.jwt, host: config.host, port: config.port });
  await server.start();
  log('info', 'server_started', { uri: server.info.uri });

  const shutdown = async () => {
    await server.stop({ timeout: 5000 });
    await dataSource.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error: Error) => {
  log('error', 'startup_failed', { message: error.message });
  process.exit(1);
});
