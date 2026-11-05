import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TemplateEvent } from './template-event.model';
import { TemplateField } from './template-field.model';

@Entity('endorsement_templates')
export class EndorsementTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_code', type: 'text' })
  productCode: string;

  @Column({ name: 'endorsement_type', type: 'text' })
  endorsementType: string;

  @Column({ type: 'integer' })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'output_skeleton', type: 'text' })
  outputSkeleton: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => TemplateField, (field) => field.template, { cascade: true })
  fields: TemplateField[];

  @OneToMany(() => TemplateEvent, (event) => event.template, { cascade: true })
  events: TemplateEvent[];
}
