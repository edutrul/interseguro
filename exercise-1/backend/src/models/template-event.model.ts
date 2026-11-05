import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EndorsementTemplate } from './endorsement-template.model';

@Entity('template_events')
export class TemplateEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => EndorsementTemplate, (template) => template.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: EndorsementTemplate;

  @Column({ name: 'event_name', type: 'text' })
  eventName: string;

  @Column({ name: 'event_order', type: 'integer' })
  eventOrder: number;
}
