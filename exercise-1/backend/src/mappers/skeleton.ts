import { DATA_TYPES, type DataType } from '../entities/template-definition.dto';

/**
 * A skeleton is plain JSON with two kinds of placeholder, each filling a whole value:
 *   {{source}} or {{source|number}}  a required value from the flat input
 *   {{$dynamicData}} / {{$events}}   the ordered lists built from the template's rows
 * Everything else is copied literally. There are deliberately no conditions or expressions.
 */
export type Placeholder =
  | { kind: 'input'; sourceField: string; dataType?: DataType }
  | { kind: 'dynamicData' }
  | { kind: 'events' };

const INPUT_TOKEN = /^\{\{([A-Za-z_]\w*)(?:\|(\w+))?\}\}$/;
const TOKEN_MARKER = '{{';

export function parsePlaceholder(value: string): Placeholder | null {
  if (value === '{{$dynamicData}}') return { kind: 'dynamicData' };
  if (value === '{{$events}}') return { kind: 'events' };
  const match = INPUT_TOKEN.exec(value);
  if (!match) return null;
  const [, sourceField, dataType] = match;
  if (dataType && !DATA_TYPES.includes(dataType as DataType)) return null;
  return { kind: 'input', sourceField, dataType: dataType as DataType | undefined };
}

export function isMalformedPlaceholder(value: string): boolean {
  return value.includes(TOKEN_MARKER) && parsePlaceholder(value) === null;
}

/** Rebuilds a JSON tree, replacing strings through `visit`. Key order is preserved. */
export function mapStrings(node: unknown, visit: (value: string) => unknown): unknown {
  if (typeof node === 'string') return visit(node);
  if (Array.isArray(node)) return node.map((item) => mapStrings(item, visit));
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, mapStrings(value, visit)]));
  }
  return node;
}

export function collectPlaceholders(skeleton: unknown): Placeholder[] {
  const placeholders: Placeholder[] = [];
  mapStrings(skeleton, (value) => {
    const placeholder = parsePlaceholder(value);
    if (placeholder) placeholders.push(placeholder);
    return value;
  });
  return placeholders;
}
