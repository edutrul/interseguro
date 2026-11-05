export interface EdgeRow {
  id: number;
  from: string;
  to: string;
  weight: string;
}

export interface DepotRow {
  id: number;
  value: string;
}

let nextId = 1;

export function newEdgeRow(): EdgeRow {
  return { id: nextId++, from: '', to: '', weight: '' };
}

export function newDepotRow(value = ''): DepotRow {
  return { id: nextId++, value };
}

export function graphToEdgeRows(graph: Record<string, Record<string, number>>): EdgeRow[] {
  const rows: EdgeRow[] = [];
  for (const [from, neighbors] of Object.entries(graph)) {
    for (const [to, weight] of Object.entries(neighbors)) {
      rows.push({ id: nextId++, from, to, weight: String(weight) });
    }
  }
  return rows.length ? rows : [newEdgeRow()];
}

/** Rows with a blank side are silently dropped: that is how a row gets "deleted" in the UI. */
export function edgeRowsToGraph(rows: EdgeRow[]): Record<string, Record<string, number>> {
  const graph: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const from = row.from.trim();
    const to = row.to.trim();
    const weight = Number(row.weight);
    if (!from || !to || !Number.isFinite(weight)) continue;
    graph[from] = { ...graph[from], [to]: weight };
  }
  return graph;
}

export function depotsToRows(depots: string[]): DepotRow[] {
  return depots.length ? depots.map((value) => ({ id: nextId++, value })) : [newDepotRow()];
}

export function rowsToDepots(rows: DepotRow[]): string[] {
  return rows.map((row) => row.value.trim()).filter(Boolean);
}
