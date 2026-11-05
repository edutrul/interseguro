import { existsSync } from 'node:fs';

export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
}

export interface AppConfig {
  host: string;
  port: number;
  databasePath: string;
  templatesDir: string;
  jwt: JwtConfig;
}

const MIN_SECRET_LENGTH = 32;

export function loadConfig(): AppConfig {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set and have at least ${MIN_SECRET_LENGTH} characters`);
  }
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 3000),
    databasePath: process.env.DATABASE_PATH ?? './data/endorsements.sqlite',
    templatesDir: process.env.TEMPLATES_DIR ?? './templates',
    jwt: {
      secret,
      issuer: process.env.JWT_ISSUER ?? 'endorsement-translator',
      audience: process.env.JWT_AUDIENCE ?? 'endorsement-clients',
    },
  };
}
