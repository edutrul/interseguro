export type FieldType = 'text' | 'number';

export interface FieldRow {
  id: number;
  key: string;
  value: string;
  type: FieldType;
}

let nextId = 1;

export function newRow(key = '', value = '', type: FieldType = 'text'): FieldRow {
  return { id: nextId++, key, value, type };
}

export function objectToRows(data: Record<string, unknown>): FieldRow[] {
  return Object.entries(data).map(([key, value]) =>
    newRow(key, value === null || value === undefined ? '' : String(value), typeof value === 'number' ? 'number' : 'text'),
  );
}

/** The type is explicit per row, so "08200000049" keeps its leading zero. */
export function rowsToObject(rows: FieldRow[]): Record<string, string | number> {
  const entries = rows
    .filter((row) => row.key.trim() !== '')
    .map((row): [string, string | number] => [
      row.key.trim(),
      row.type === 'number' && row.value.trim() !== '' && !Number.isNaN(Number(row.value))
        ? Number(row.value)
        : row.value,
    ]);
  return Object.fromEntries(entries);
}
