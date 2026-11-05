import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DataSource } from 'typeorm';
import { EndorsementTemplate } from '../models/endorsement-template.model';
import { TemplateEvent } from '../models/template-event.model';
import { TemplateField } from '../models/template-field.model';
import { CreateTemplateSchema1730000000000 } from './migrations/1730000000000-create-template-schema';

/** Opens the database and applies pending migrations. Pass ':memory:' for tests. */
export async function openDatabase(databasePath: string): Promise<DataSource> {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: databasePath,
    entities: [EndorsementTemplate, TemplateField, TemplateEvent],
    migrations: [CreateTemplateSchema1730000000000],
    migrationsRun: true,
    synchronize: false,
  });
  return dataSource.initialize();
}
