import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hand-written so the constraints that protect template configuration are
 * explicit. See docs/database-model.md.
 */
export class CreateTemplateSchema1730000000000 implements MigrationInterface {
  name = 'CreateTemplateSchema1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE endorsement_templates (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code     TEXT     NOT NULL,
        endorsement_type TEXT     NOT NULL,
        version          INTEGER  NOT NULL CHECK (version >= 1),
        is_active        BOOLEAN  NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        output_skeleton  TEXT     NOT NULL CHECK (json_valid(output_skeleton)),
        created_at       DATETIME NOT NULL DEFAULT (datetime('now')),
        updated_at       DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT uq_template_version UNIQUE (product_code, endorsement_type, version)
      )`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_one_active_template
        ON endorsement_templates (product_code, endorsement_type)
        WHERE is_active = 1`);
    await queryRunner.query(`
      CREATE TABLE template_fields (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id   INTEGER NOT NULL REFERENCES endorsement_templates (id) ON DELETE CASCADE,
        label         TEXT    NOT NULL,
        source_field  TEXT,
        default_value TEXT,
        data_type     TEXT    NOT NULL DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'date')),
        field_order   INTEGER NOT NULL CHECK (field_order >= 1),
        CONSTRAINT ck_field_has_value_source CHECK (source_field IS NOT NULL OR default_value IS NOT NULL),
        CONSTRAINT uq_field_order UNIQUE (template_id, field_order),
        CONSTRAINT uq_field_label UNIQUE (template_id, label)
      )`);
    await queryRunner.query(`
      CREATE TABLE template_events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES endorsement_templates (id) ON DELETE CASCADE,
        event_name  TEXT    NOT NULL,
        event_order INTEGER NOT NULL CHECK (event_order >= 1),
        CONSTRAINT uq_event_order UNIQUE (template_id, event_order)
      )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE template_events');
    await queryRunner.query('DROP TABLE template_fields');
    await queryRunner.query('DROP TABLE endorsement_templates');
  }
}
