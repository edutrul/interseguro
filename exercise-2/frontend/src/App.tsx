import { useState } from 'react';
import { findOptimalRoute, type RouteOutcome } from './api';
import {
  depotsToRows,
  edgeRowsToGraph,
  graphToEdgeRows,
  newDepotRow,
  newEdgeRow,
  rowsToDepots,
  type DepotRow,
  type EdgeRow,
} from './fields';
import { SAMPLE_REQUEST } from './sample';

type Mode = 'form' | 'json';

interface RequestBody {
  accidentLocation: string;
  depots: string[];
  graph: Record<string, Record<string, number>>;
}

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

export function App() {
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<Mode>('form');
  const [accidentLocation, setAccidentLocation] = useState(SAMPLE_REQUEST.accidentLocation);
  const [depotRows, setDepotRows] = useState<DepotRow[]>(() => depotsToRows(SAMPLE_REQUEST.depots));
  const [edgeRows, setEdgeRows] = useState<EdgeRow[]>(() => graphToEdgeRows(SAMPLE_REQUEST.graph));
  const [jsonText, setJsonText] = useState(() => toJson(SAMPLE_REQUEST));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const formToBody = (): RequestBody => ({
    accidentLocation: accidentLocation.trim(),
    depots: rowsToDepots(depotRows),
    graph: edgeRowsToGraph(edgeRows),
  });

  const parseJsonText = (): RequestBody | null => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('The request must be a JSON object.');
        return null;
      }
      setJsonError(null);
      return parsed as RequestBody;
    } catch (error) {
      setJsonError(`Invalid JSON: ${(error as Error).message}`);
      return null;
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'json') {
      setJsonText(toJson(formToBody()));
      setJsonError(null);
    } else {
      const parsed = parseJsonText();
      if (!parsed) return;
      setAccidentLocation(parsed.accidentLocation ?? '');
      setDepotRows(depotsToRows(parsed.depots ?? []));
      setEdgeRows(graphToEdgeRows(parsed.graph ?? {}));
    }
    setMode(next);
  };

  const loadSample = () => {
    setAccidentLocation(SAMPLE_REQUEST.accidentLocation);
    setDepotRows(depotsToRows(SAMPLE_REQUEST.depots));
    setEdgeRows(graphToEdgeRows(SAMPLE_REQUEST.graph));
    setJsonText(toJson(SAMPLE_REQUEST));
    setJsonError(null);
    setOutcome(null);
    setNetworkError(null);
  };

  const updateDepot = (id: number, value: string) =>
    setDepotRows((current) => current.map((row) => (row.id === id ? { ...row, value } : row)));

  const updateEdge = (id: number, change: Partial<EdgeRow>) =>
    setEdgeRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const submit = async () => {
    const payload = mode === 'form' ? formToBody() : parseJsonText();
    if (!payload) return;
    setLoading(true);
    setOutcome(null);
    setNetworkError(null);
    setCopied(false);
    try {
      setOutcome(await findOptimalRoute(payload, token.trim()));
    } catch {
      setNetworkError('Could not reach the API. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (outcome?.ok) {
      await navigator.clipboard.writeText(toJson(outcome.body));
      setCopied(true);
    }
  };

  return (
    <main className="page">
      <header className="header">
        <h1>Tow Routing Service</h1>
        <p>Finds the nearest tow-truck depot to an accident, with the shortest path and distance between them.</p>
      </header>

      <section className="panel token">
        <label htmlFor="token">JWT</label>
        <input
          id="token"
          type="password"
          autoComplete="off"
          placeholder="Paste a development token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </section>

      <div className="columns">
        <section className="panel">
          <div className="panel-header">
            <h2>Request</h2>
            <div className="tabs" role="tablist">
              {(['form', 'json'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={mode === tab}
                  className={mode === tab ? 'tab active' : 'tab'}
                  onClick={() => switchMode(tab)}
                >
                  {tab === 'form' ? 'Fields' : 'JSON'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'form' ? (
            <div className="rows">
              <label className="field-label" htmlFor="accidentLocation">
                Accident location
              </label>
              <input
                id="accidentLocation"
                placeholder="San Isidro"
                value={accidentLocation}
                onChange={(event) => setAccidentLocation(event.target.value)}
              />

              <h3 className="section-title">Depots</h3>
              {depotRows.map((row) => (
                <div className="row depot-row" key={row.id}>
                  <input
                    aria-label="Depot district"
                    placeholder="Miraflores"
                    value={row.value}
                    onChange={(event) => updateDepot(row.id, event.target.value)}
                  />
                  <button
                    className="ghost"
                    aria-label="Remove depot"
                    onClick={() => setDepotRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="ghost add" onClick={() => setDepotRows((current) => [...current, newDepotRow()])}>
                + Add depot
              </button>

              <h3 className="section-title">Graph (district connections and distances)</h3>
              {edgeRows.map((row) => (
                <div className="row edge-row" key={row.id}>
                  <input
                    aria-label="From district"
                    placeholder="From"
                    value={row.from}
                    onChange={(event) => updateEdge(row.id, { from: event.target.value })}
                  />
                  <input
                    aria-label="To district"
                    placeholder="To"
                    value={row.to}
                    onChange={(event) => updateEdge(row.id, { to: event.target.value })}
                  />
                  <input
                    aria-label="Distance"
                    placeholder="Weight"
                    inputMode="numeric"
                    value={row.weight}
                    onChange={(event) => updateEdge(row.id, { weight: event.target.value })}
                  />
                  <button
                    className="ghost"
                    aria-label="Remove edge"
                    onClick={() => setEdgeRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="ghost add" onClick={() => setEdgeRows((current) => [...current, newEdgeRow()])}>
                + Add edge
              </button>
            </div>
          ) : (
            <textarea
              aria-label="Request JSON"
              spellCheck={false}
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
            />
          )}

          {jsonError && <p className="inline-error">{jsonError}</p>}

          <div className="actions">
            <button className="primary" onClick={submit} disabled={loading}>
              {loading ? 'Finding route…' : 'Find nearest depot'}
            </button>
            <button className="secondary" onClick={loadSample}>
              Load PDF sample
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Response</h2>
            {outcome?.ok && (
              <button className="secondary small" onClick={copyResult}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <Result outcome={outcome} networkError={networkError} />
        </section>
      </div>
    </main>
  );
}

function Result({ outcome, networkError }: { outcome: RouteOutcome | null; networkError: string | null }) {
  if (networkError) {
    return <div className="alert">{networkError}</div>;
  }
  if (!outcome) {
    return <p className="empty">The nearest depot, path and distance will appear here.</p>;
  }
  if (outcome.ok) {
    return (
      <>
        <p className="meta">
          <span className="badge success">200</span> {outcome.body.distance} units from {outcome.body.fromDepot}
        </p>
        <p className="path">{outcome.body.path.join(' → ')}</p>
        <pre>{toJson(outcome.body)}</pre>
      </>
    );
  }
  const { statusCode, message } = outcome.error;
  return (
    <div className="alert" role="alert">
      <p className="meta">
        <span className="badge danger">{statusCode}</span> {message}
      </p>
      {statusCode === 401 && <p>Paste a valid JWT above and try again.</p>}
      {statusCode === 422 && <p>No edge sequence connects any depot to the accident location.</p>}
      {statusCode === 400 && <p>Check that every depot and the accident location are nodes of the graph.</p>}
      {outcome.requestId && <p className="request-id">Request ID: {outcome.requestId}</p>}
    </div>
  );
}
