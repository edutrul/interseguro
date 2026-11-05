import { readFileSync } from 'node:fs';
import { loadConfig } from '../config/env';
import { openDatabase } from '../database/data-source';
import { TypeOrmTemplateRepository } from '../repositories/template.repository';
import { TemplateImportService } from '../services/template-import.service';

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: template:import <path-to-template.json>');
  }
  const dataSource = await openDatabase(loadConfig().databasePath);
  const outcome = await new TemplateImportService(new TypeOrmTemplateRepository(dataSource)).import(
    JSON.parse(readFileSync(file, 'utf8')),
  );
  console.log(`${file}: ${outcome}`);
  await dataSource.destroy();
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
