# Exercise 2: Optimal Routing Service

Given an accident location, a set of candidate tow-truck depots, and a weighted graph of Lima districts, finds the nearest depot and the shortest path to the accident. A new district, connection or depot needs a request, not code.

```
React UI -> nginx -> POST /api/v1/routes/optimal (JWT) -> validate -> multi-source Dijkstra -> nearest depot JSON
```

## Run it

Requires Docker with Compose.

```bash
cd exercise-2
cp .env.example .env
# Set JWT_SECRET in .env: openssl rand -base64 48
docker compose up -d --build
```

The UI is at <http://localhost:8081> (change it with `FRONTEND_PORT`). The API isn't published; everything goes through the nginx proxy.

Generate a development token (valid for one hour, or set `TOKEN_TTL_SECONDS`) and paste it into the UI:

```bash
docker compose exec backend /gentoken
```

Or call the API directly:

```bash
TOKEN=$(docker compose exec -T backend /gentoken)
curl -X POST http://localhost:8081/api/v1/routes/optimal \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "accidentLocation": "San Isidro",
    "depots": ["Miraflores", "Ate"],
    "graph": {
      "Miraflores": { "San Isidro": 7, "Barranco": 3 },
      "San Isidro": { "Miraflores": 7, "Lince": 4 },
      "Barranco": { "Miraflores": 3, "Surco": 5 },
      "Lince": { "San Isidro": 4, "Surco": 6 },
      "Surco": { "Barranco": 5, "Lince": 6, "Ate": 10 },
      "Ate": { "Surco": 10 }
    }
  }'
```

### Local development

```bash
cd backend && cp .env.example .env   # then set JWT_SECRET
go test ./...
go run ./cmd/api                     # API on :8080
go run ./cmd/gentoken

cd ../frontend && npm ci && npm run dev   # UI on :5173, proxies /api to :8080
```

## Change the graph without touching code

The graph, depots and accident location are all part of the request body — there is nothing to redeploy. Add a district, change a distance, or add a depot by sending a different `graph` and `depots` in the next request. See [ADR-003](docs/adr/003-graph-in-request-payload.md) for why this, rather than a database table, satisfies the extensibility criterion here.

## API

| Status | Meaning | Body |
|---|---|---|
| 200 | Nearest depot found | `fromDepot`, `to`, `path`, `distance`, with an `X-Request-Id` header |
| 400 | Invalid request: missing fields, a negative weight, or a depot/location not present in the graph | `message` |
| 401 | Missing, invalid or expired JWT | `message` |
| 422 | Well-formed request, but no path connects any depot to the accident location | `message` |
| 500 | Unexpected error, with no internals exposed | `message` |

`GET /health` is public.

## Evaluation criteria

| Criterion | Implementation | Proof |
|---|---|---|
| **Efficient shortest-path implementation** | Single multi-source Dijkstra seeded from every depot at once: [`dijkstra.go`](backend/internal/graph/dijkstra.go), [ADR-002](docs/adr/002-multi-source-dijkstra.md) | `TestNearest_*` in [`dijkstra_test.go`](backend/internal/graph/dijkstra_test.go) |
| **API clarity** | Request/response match the PDF's example exactly: [`dto.go`](backend/internal/transport/http/dto.go) | `TestRouter_EndToEnd_MatchesPDFExample` |
| **Extensibility** | Graph arrives in the request; `Nearest` depends only on the `Graph` interface: [`graph.go`](backend/internal/graph/graph.go), [ADR-003](docs/adr/003-graph-in-request-payload.md) | Any request can define a new graph with no rebuild |
| **API versioning** | `/api/v1` prefix in [`router.go`](backend/internal/transport/http/router.go) | `TestRouter_UnversionedPathNotFound` |
| **Unit tests** | `go test ./...`: pure-algorithm tests, service validation tests, HTTP handler and auth tests | 35 tests across `internal/graph`, `internal/routing`, `internal/transport/http` |
| **Maintainability / SOLID** | `Nearest` depends on the `Graph` interface, not a concrete type (DIP); handlers depend on the `RouteFinder` interface, not `*routing.Service` (DIP, testable in isolation); [ADR-001](docs/adr/001-standard-library-router.md) | Code structure; `fakeFinder` in [`handler_test.go`](backend/internal/transport/http/handler_test.go) |
| **Deployment** | Dockerfiles and Compose, distroless non-root backend image, self-probing health check, no published backend port. Live on a VPS, which isn't the free-tier cloud the PDF asks for: [ADR-004](docs/adr/004-deployment-target.md) | `docker compose up -d --build` |
| **Security** | JWT verified in the API (signature, issuer, audience, required expiry), routes protected by default, secret from the environment | 401 tests in [`router_test.go`](backend/internal/transport/http/router_test.go) |
| **Frontend (Part 2)** | [React + Vite](frontend/src/App.tsx): edit by fields (depots, graph edges) or raw JSON, PDF sample, JWT input, path/distance view, clear errors | Manual and scripted browser run |

## Layers

| Layer | Package | Responsibility |
|---|---|---|
| `graph` | `internal/graph` | Pure domain: the `Graph` interface, `AdjacencyGraph`, and the multi-source Dijkstra algorithm. No HTTP, no JSON. |
| `routing` | `internal/routing` | Use case: validates the request, then calls into `graph`. Transport-agnostic. |
| `transport/http` | `internal/transport/http` | Routes, JSON decoding/encoding, JWT middleware, request logging, error-to-status mapping. |
| `config` | `internal/config` | Environment loading. |

No `repository` or `model` layer: there is nothing to persist (see [ADR-003](docs/adr/003-graph-in-request-payload.md)). No `integration` or `publisher` layer: this service calls no external API and publishes to no broker. The PDF asks for only the layers a given service needs.

## Decisions and assumptions

- [Assumptions](docs/assumptions.md)
- ADRs: [001 Standard library router](docs/adr/001-standard-library-router.md), [002 Multi-source Dijkstra](docs/adr/002-multi-source-dijkstra.md), [003 Graph in the request payload](docs/adr/003-graph-in-request-payload.md), [004 Deployment target](docs/adr/004-deployment-target.md)

## Not production-ready

- **Hosting:** a single shared VPS rather than the free-tier cloud the PDF asks for, see [ADR-004](docs/adr/004-deployment-target.md).
- **Token issuing:** tokens come from a development binary with a shared secret. Production needs an identity provider with client credentials and key rotation.
- **No canonical Lima graph:** every request resends the full graph. A real dispatch system would persist Lima's district graph and let a request reference or override it, rather than resend it each time.
- **Observability:** structured logs with request IDs only, no metrics or tracing. There's no rate limiting.
- **Depot metadata:** the service only knows a depot's name and position in the graph, not its real-world capacity or whether a truck is actually available there.
