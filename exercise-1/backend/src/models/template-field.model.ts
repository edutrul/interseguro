import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { DataType } from '../entities/template-definition.dto';
import { EndorsementTemplate } from './endorsement-template.model';

@Entity('template_fields')
export class TemplateField {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EndorsementTemplate, (template) => template.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: EndorsementTemplate;

  @Column({ type: 'text' })
  label: string;

  @Column({ name: 'source_field', type: 'text', nullable: true })
  sourceField: string | null;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue: string | null;

  @Column({ name: 'data_type', type: 'text', default: 'string' })
  dataType: DataType;

  @Column({ name: 'field_order', type: 'integer' })
  fieldOrder: number;
}
