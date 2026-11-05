package http

import (
	"net/http"

	"interseguro/exercise-2/backend/internal/config"
)

const apiV1Prefix = "/api/v1"

// NewRouter wires routes to handlers and middleware. It is the only place
// that depends on both config and the route handler, matching the "one
// composition root" shape used in exercise-1's app.ts.
func NewRouter(cfg config.Config, routeHandler *RouteHandler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", Health)

	protected := requireJWT(cfg.JWT.Secret, cfg.JWT.Issuer, cfg.JWT.Audience)
	mux.Handle("POST "+apiV1Prefix+"/routes/optimal", protected(http.HandlerFunc(routeHandler.OptimalRoute)))

	return withLogging(mux)
}
