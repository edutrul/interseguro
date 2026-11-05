import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../config/env';
import { openDatabase } from '../database/data-source';
import { TypeOrmTemplateRepository } from '../repositories/template.repository';
import { TemplateImportService } from '../services/template-import.service';

/** Imports every file in the templates directory. Safe to run on every start. */
async function main(): Promise<void> {
  const { databasePath, templatesDir } = loadConfig();
  const dataSource = await openDatabase(databasePath);
  const importer = new TemplateImportService(new TypeOrmTemplateRepository(dataSource));
  for (const file of readdirSync(templatesDir).filter((name) => name.endsWith('.json')).sort()) {
    const outcome = await importer.import(JSON.parse(readFileSync(join(templatesDir, file), 'utf8')));
    console.log(`${file}: ${outcome}`);
  }
  await dataSource.destroy();
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
