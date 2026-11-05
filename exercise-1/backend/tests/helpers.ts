import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import HapiJwt from '@hapi/jwt';
import type { Server } from '@hapi/hapi';
import type { DataSource } from 'typeorm';
import { createApp } from '../src/app';
import { openDatabase } from '../src/database/data-source';
import { TypeOrmTemplateRepository } from '../src/repositories/template.repository';
import { TemplateImportService } from '../src/services/template-import.service';

export const TEST_JWT = {
  secret: 'test-only-secret-that-is-at-least-32-characters',
  issuer: 'test-issuer',
  audience: 'test-audience',
};

export const TRANSLATE_URL = '/api/v1/endorse/translate';

export const readJson = (path: string) => JSON.parse(readFileSync(join(__dirname, '..', path), 'utf8'));
export const rumboInput = () => readJson('tests/fixtures/rumbo-input.json');
export const rumboExpected = () => readJson('tests/fixtures/rumbo-expected-output.json');
export const rumboTemplateFile = () => readJson('templates/rumbo-cambio-frecuencia.json');

export function signToken(overrides: { secret?: string; audience?: string; ttlSec?: number } = {}): string {
  return HapiJwt.token.generate(
    { aud: overrides.audience ?? TEST_JWT.audience, iss: TEST_JWT.issuer, sub: 'test-client' },
    { key: overrides.secret ?? TEST_JWT.secret, algorithm: 'HS256' },
    { ttlSec: overrides.ttlSec ?? 60 },
  );
}

export interface TestApp {
  server: Server;
  dataSource: DataSource;
  importer: TemplateImportService;
  post(payload: unknown, token?: string | null): ReturnType<Server['inject']>;
}

/** The real app on an in-memory database, seeded with the Rumbo template only. */
export async function startTestApp(): Promise<TestApp> {
  const dataSource = await openDatabase(':memory:');
  const importer = new TemplateImportService(new TypeOrmTemplateRepository(dataSource));
  await importer.import(rumboTemplateFile());
  const server = await createApp({ dataSource, jwt: TEST_JWT });
  return {
    server,
    dataSource,
    importer,
    post: (payload, token = signToken()) =>
      server.inject({
        method: 'POST',
        url: TRANSLATE_URL,
        payload: payload as object,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
  };
}
