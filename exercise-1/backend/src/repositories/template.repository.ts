import type { DataSource } from 'typeorm';
import type { TemplateDefinition } from '../entities/template-definition.dto';
import { EndorsementTemplate } from '../models/endorsement-template.model';
import { TemplateEvent } from '../models/template-event.model';
import { TemplateField } from '../models/template-field.model';

export interface TemplateReader {
  findActive(productCode: string, endorsementType: string): Promise<TemplateDefinition | null>;
}

export interface TemplateWriter {
  exists(productCode: string, endorsementType: string, version: number): Promise<boolean>;
  insertAsActive(template: TemplateDefinition): Promise<void>;
}

export class TypeOrmTemplateRepository implements TemplateReader, TemplateWriter {
  constructor(private readonly dataSource: DataSource) {}

  async findActive(productCode: string, endorsementType: string): Promise<TemplateDefinition | null> {
    const template = await this.dataSource.getRepository(EndorsementTemplate).findOne({
      where: { productCode, endorsementType, isActive: true },
      relations: { fields: true, events: true },
    });
    return template && toDefinition(template);
  }

  exists(productCode: string, endorsementType: string, version: number): Promise<boolean> {
    return this.dataSource.getRepository(EndorsementTemplate).existsBy({ productCode, endorsementType, version });
  }

  async insertAsActive(template: TemplateDefinition): Promise<void> {
    const { productCode, endorsementType, version, outputSkeleton } = template;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(EndorsementTemplate, { productCode, endorsementType, isActive: true }, { isActive: false });
      await manager.save(
        manager.create(EndorsementTemplate, {
          productCode,
          endorsementType,
          version,
          outputSkeleton,
          isActive: true,
          fields: template.fields.map((field) =>
            manager.create(TemplateField, {
              label: field.label,
              sourceField: field.sourceField,
              defaultValue: field.defaultValue,
              dataType: field.dataType,
              fieldOrder: field.order,
            }),
          ),
          events: template.events.map((event) =>
            manager.create(TemplateEvent, { eventName: event.name, eventOrder: event.order }),
          ),
        }),
      );
    });
  }
}

function toDefinition(template: EndorsementTemplate): TemplateDefinition {
  return {
    productCode: template.productCode,
    endorsementType: template.endorsementType,
    version: template.version,
    outputSkeleton: template.outputSkeleton,
    fields: template.fields.map((field) => ({
      label: field.label,
      sourceField: field.sourceField,
      defaultValue: field.defaultValue,
      dataType: field.dataType,
      order: field.fieldOrder,
    })),
    events: template.events.map((event) => ({ name: event.eventName, order: event.eventOrder })),
  };
}
