import type { DataType } from '../entities/template-definition.dto';
import type { FlatValue } from '../entities/translate-request.dto';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function matchesDataType(value: FlatValue, dataType: DataType): boolean {
  switch (dataType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'date':
      return typeof value === 'string' && isCalendarDate(value);
  }
}
