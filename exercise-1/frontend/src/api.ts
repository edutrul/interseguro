export interface ApiError {
  statusCode: number;
  message: string;
  missingFields?: string[];
  invalidFields?: { field: string; expected: string }[];
}

export type TranslateOutcome =
  | { ok: true; body: unknown; templateVersion: string | null; requestId: string | null }
  | { ok: false; error: ApiError; requestId: string | null };

const TRANSLATE_URL = `${import.meta.env.BASE_URL}api/v1/endorse/translate`;

export async function translate(payload: unknown, token: string): Promise<TranslateOutcome> {
  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const requestId = response.headers.get('X-Request-Id');
  const body = await response.json().catch(() => null);

  if (response.ok) {
    return { ok: true, body, templateVersion: response.headers.get('X-Template-Version'), requestId };
  }
  const error: ApiError = body?.message
    ? { ...body, statusCode: response.status }
    : { statusCode: response.status, message: `The server responded with status ${response.status}` };
  return { ok: false, error, requestId };
}
