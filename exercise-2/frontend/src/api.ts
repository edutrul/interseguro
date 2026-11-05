export interface ApiError {
  statusCode: number;
  message: string;
}

export interface OptimalRouteBody {
  fromDepot: string;
  to: string;
  path: string[];
  distance: number;
}

export type RouteOutcome =
  | { ok: true; body: OptimalRouteBody; requestId: string | null }
  | { ok: false; error: ApiError; requestId: string | null };

const OPTIMAL_ROUTE_URL = `${import.meta.env.BASE_URL}api/v1/routes/optimal`;

export async function findOptimalRoute(payload: unknown, token: string): Promise<RouteOutcome> {
  const response = await fetch(OPTIMAL_ROUTE_URL, {
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
    return { ok: true, body, requestId };
  }
  const error: ApiError = body?.message
    ? { message: body.message, statusCode: response.status }
    : { statusCode: response.status, message: `The server responded with status ${response.status}` };
  return { ok: false, error, requestId };
}
