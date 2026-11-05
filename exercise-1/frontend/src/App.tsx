import { useState } from 'react';
import { translate, type TranslateOutcome } from './api';
import { newRow, objectToRows, rowsToObject, type FieldRow, type FieldType } from './fields';
import { SAMPLE_REQUEST } from './sample';

type Mode = 'form' | 'json';

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

export function App() {
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<Mode>('form');
  const [rows, setRows] = useState<FieldRow[]>(() => objectToRows(SAMPLE_REQUEST));
  const [jsonText, setJsonText] = useState(() => toJson(SAMPLE_REQUEST));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<TranslateOutcome | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Returns the object in the JSON editor, or null after reporting why it can't be used. */
  const parseJsonText = (): Record<string, unknown> | null => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('The request must be a JSON object.');
        return null;
      }
      setJsonError(null);
      return parsed as Record<string, unknown>;
    } catch (error) {
      setJsonError(`Invalid JSON: ${(error as Error).message}`);
      return null;
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'json') {
      setJsonText(toJson(rowsToObject(rows)));
      setJsonError(null);
    } else {
      const parsed = parseJsonText();
      if (!parsed) return;
      setRows(objectToRows(parsed));
    }
    setMode(next);
  };

  const loadSample = () => {
    setRows(objectToRows(SAMPLE_REQUEST));
    setJsonText(toJson(SAMPLE_REQUEST));
    setJsonError(null);
    setOutcome(null);
    setNetworkError(null);
  };

  const updateRow = (id: number, change: Partial<FieldRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const submit = async () => {
    const payload = mode === 'form' ? rowsToObject(rows) : parseJsonText();
    if (!payload) return;
    setLoading(true);
    setOutcome(null);
    setNetworkError(null);
    setCopied(false);
    try {
      setOutcome(await translate(payload, token.trim()));
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
        <h1>Endorsement Translator</h1>
        <p>Sends a flat endorsement request to the API and shows the JSON structured for the insurance core.</p>
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
              {rows.map((row) => (
                <div className="row" key={row.id}>
                  <input
                    aria-label="Field name"
                    placeholder="Field"
                    value={row.key}
                    onChange={(event) => updateRow(row.id, { key: event.target.value })}
                  />
                  <input
                    aria-label={`Value of ${row.key || 'field'}`}
                    placeholder="Value"
                    value={row.value}
                    onChange={(event) => updateRow(row.id, { value: event.target.value })}
                  />
                  <select
                    aria-label={`Type of ${row.key || 'field'}`}
                    value={row.type}
                    onChange={(event) => updateRow(row.id, { type: event.target.value as FieldType })}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                  <button
                    className="ghost"
                    aria-label={`Remove ${row.key || 'field'}`}
                    onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button className="ghost add" onClick={() => setRows((current) => [...current, newRow()])}>
                + Add field
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
              {loading ? 'Translating…' : 'Translate'}
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

function Result({ outcome, networkError }: { outcome: TranslateOutcome | null; networkError: string | null }) {
  if (networkError) {
    return <div className="alert">{networkError}</div>;
  }
  if (!outcome) {
    return <p className="empty">The translated JSON will appear here.</p>;
  }
  if (outcome.ok) {
    return (
      <>
        <p className="meta">
          <span className="badge success">200</span> Template version {outcome.templateVersion ?? 'unknown'}
        </p>
        <pre>{toJson(outcome.body)}</pre>
      </>
    );
  }
  const { statusCode, message, missingFields, invalidFields } = outcome.error;
  return (
    <div className="alert" role="alert">
      <p className="meta">
        <span className="badge danger">{statusCode}</span> {message}
      </p>
      {statusCode === 401 && <p>Paste a valid JWT above and try again.</p>}
      {!!missingFields?.length && (
        <>
          <h3>Missing fields</h3>
          <ul>
            {missingFields.map((field) => (
              <li key={field}>
                <code>{field}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      {!!invalidFields?.length && (
        <>
          <h3>Invalid fields</h3>
          <ul>
            {invalidFields.map(({ field, expected }) => (
              <li key={field}>
                <code>{field}</code> must be a {expected}
              </li>
            ))}
          </ul>
        </>
      )}
      {outcome.requestId && <p className="request-id">Request ID: {outcome.requestId}</p>}
    </div>
  );
}
