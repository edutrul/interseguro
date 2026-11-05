# Exercise 1: Endorsement Translation Service

[![Exercise 1 CI](https://github.com/edutrul/interseguro/actions/workflows/exercise-1-ci.yml/badge.svg)](https://github.com/edutrul/interseguro/actions/workflows/exercise-1-ci.yml)

Translates a flat endorsement request into the structured JSON the insurance core expects, using templates stored in the database. A new product or endorsement type needs data, not code.

```
React UI -> nginx -> POST /api/v1/endorse/translate (JWT) -> template lookup -> validate -> map -> core JSON
```

## Run it

Requires Docker with Compose. The second command creates `.env` with a random secret, and leaves an existing one alone.

```bash
cd exercise-1
[ -f .env ] || sed "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env.example > .env
docker compose up -d --build
```

The UI is at <http://localhost:8080> (change it with `FRONTEND_PORT`). Migrations and seeding run on every start and are safe to repeat. Data lives in the `sqlite-data` volume and survives restarts and `docker compose down`. Only `docker compose down -v` deletes it. The API and database aren't published, and everything goes through the nginx proxy.

Generate a development token (valid for one hour) and paste it into the UI:

```bash
docker compose exec backend node dist/scripts/generate-token.js
```

Or call the API directly:

```bash
TOKEN=$(docker compose exec -T backend node dist/scripts/generate-token.js)
curl -X POST http://localhost:8080/api/v1/endorse/translate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d @backend/tests/fixtures/rumbo-input.json
```

### Local development

Backend, which serves the API on port 3100:

```bash
cd exercise-1/backend
[ -f .env ] || sed "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env.example > .env
npm ci
npm test
npm run seed
npm run dev
```

Frontend, in a second terminal, which serves the UI on port 5173 and proxies `/api` to port 3100:

```bash
cd exercise-1/frontend
npm ci
npm run dev
```

Generate a token with `npm run token` from `exercise-1/backend`.

## Add a product without touching code

Write a template file, using [the Rumbo one](backend/templates/rumbo-cambio-frecuencia.json) as a guide, then import it:

```bash
docker compose cp my-template.json backend:/tmp/my-template.json
docker compose exec backend node dist/scripts/import-template.js /tmp/my-template.json
```

The next request can use it, with no rebuild or restart. A higher `version` for an existing template becomes the active one, and the old version is kept. For a change to survive a volume reset, also keep the file in `backend/templates/`.

## API

| Status | Meaning | Body |
|---|---|---|
| 200 | Translated | Core JSON, with `X-Template-Version` and `X-Request-Id` headers |
| 400 | Invalid request or fields the template requires | `message`, `missingFields`, `invalidFields` |
| 401 | Missing or invalid JWT | `message` |
| 404 | No active template for that product and endorsement type | `message` |
| 422 | The stored template is invalid; details go to the logs only | `message` |
| 500 | Unexpected error, with no internals exposed | `message` |

`GET /health` is public and checks the database.

## Evaluation criteria

| Criterion | Implementation | Proof |
|---|---|---|
| **DB modeling** | Three tables with constraints: [ER diagram and rules](docs/database-model.md), [migration](backend/src/database/migrations/1730000000000-create-template-schema.ts) | "database constraints" tests |
| **Data transformation** | [`core-request.mapper.ts`](backend/src/mappers/core-request.mapper.ts) fills the skeleton | Test comparing serialized output with the PDF, including key order |
| **Extensibility** | No product rules in code, plus [import script](backend/src/scripts/import-template.ts) | Test adding a product with SQL only |
| **Validation** | Rules come from the template: [`input-validator.ts`](backend/src/services/input-validator.ts), [`template-validator.ts`](backend/src/services/template-validator.ts) | 400, 404 and 422 tests |
| **API versioning** | `/api/v1` prefix in [`app.ts`](backend/src/app.ts) | Test that the unversioned path returns 404 |
| **Unit tests** | [`backend/tests`](backend/tests): mapper, validators, and API tests on a real in-memory database | `npm test`, and on every PR through [CI](../.github/workflows/exercise-1-ci.yml) |
| **Maintainability / SOLID** | Layers from the PDF; the service depends on `TemplateReader`; the mapper is pure; [ADRs](docs/adr/) | Code structure |
| **Deployment** | Dockerfiles and Compose, non-root backend, health check, persistent volume. **Cloud deployment pending**: [ADR-004](docs/adr/004-deployment-target.md) | `docker compose up -d --build`, also smoke-tested in [CI](../.github/workflows/exercise-1-ci.yml) |
| **Security** | JWT verified in the API (signature, issuer, audience, expiry), routes protected by default, secret from the environment | 401 tests |
| **Frontend (Part 2)** | [React + Vite](frontend/src/App.tsx): edit by fields or JSON, PDF sample, JWT input, clear errors | Manual and scripted browser run |

## Layers

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `routes/` | HTTP paths and request validation |
| Controller | `controllers/` | Calls the service and maps errors to HTTP |
| Service | `services/` | Selects the template, validates, orchestrates, imports |
| Mapper | `mappers/` | Pure transformation to the core's JSON |
| Repository | `repositories/` | Data access behind `TemplateReader` and `TemplateWriter` |
| Model | `models/` | TypeORM tables |
| Entity | `entities/` | DTOs and domain errors (the PDF's Entity layer follows the DTO pattern) |

Integration and Publisher aren't included, because this service neither calls external APIs nor publishes to a broker. The PDF asks for only the layers needed.

## Decisions and assumptions

- [Assumptions](docs/assumptions.md)
- ADRs: [001 Rows plus skeleton](docs/adr/001-relational-rows-plus-json-skeleton.md), [002 SQLite](docs/adr/002-sqlite.md), [003 Versioned templates](docs/adr/003-versioned-templates.md), [004 Deployment](docs/adr/004-deployment-target.md), [005 External contract](docs/adr/005-keep-the-external-contract-verbatim.md)

## Not production-ready

- **Cloud deployment and TLS:** pending, see [ADR-004](docs/adr/004-deployment-target.md).
- **Token issuing:** tokens come from a development script with a shared secret. Production needs an identity provider with client credentials and key rotation.
- **Template management:** there's an import script, but no admin UI, approval flow or rollback command.
- **Scale:** SQLite means a single instance, see [ADR-002](docs/adr/002-sqlite.md).
- **Observability:** structured logs with request IDs only, no metrics or tracing. There's no rate limiting.
- **Dependency audit:** `npm audit` reports 3 moderate findings in `glob` and `minimatch`, through TypeORM. We pass classes rather than file patterns to TypeORM, and the suggested fix is a TypeORM downgrade, so they're accepted for now.
