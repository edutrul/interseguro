# ADR-001: `net/http` with no router dependency

**Status:** Accepted

## Context
The service exposes two routes: a public health check and one versioned, JWT-protected POST endpoint. Go 1.22 added method- and wildcard-aware patterns to the standard `http.ServeMux` (`mux.HandleFunc("POST /api/v1/routes/optimal", ...)`), which used to be the main reason to reach for a third-party router.

## Decision
Use `net/http`'s standard mux directly. No `chi`, `gin`, `echo`, or similar.

## Alternatives
- **chi:** nicer middleware composition for larger route trees, but this service has one protected route and one public one — not enough surface to justify a dependency.
- **gin:** brings its own JSON binding, validation and logging conventions, which would fight the layered structure instead of supporting it.

## Consequences
- One fewer dependency to audit, version-bump and trust.
- Middleware (JWT check, request logging) is three small `func(http.Handler) http.Handler` wrappers instead of router-specific middleware; see `internal/transport/http/auth.go` and `logging.go`.
- If the route tree grows substantially, revisit; a handful of handlers do not justify it.
