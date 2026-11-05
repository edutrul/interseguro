export const DATA_TYPES = ['string', 'number', 'date'] as const;
export type DataType = (typeof DATA_TYPES)[number];

export interface TemplateFieldDefinition {
  label: string;
  sourceField: string | null;
  defaultValue: string | null;
  dataType: DataType;
  order: number;
}

export interface TemplateEventDefinition {
  name: string;
  order: number;
}

/** A template as the service layer sees it, independent of the ORM. */
export interface TemplateDefinition {
  productCode: string;
  endorsementType: string;
  version: number;
  /** JSON text describing the output shape and key order. */
  outputSkeleton: string;
  fields: TemplateFieldDefinition[];
  events: TemplateEventDefinition[];
}
