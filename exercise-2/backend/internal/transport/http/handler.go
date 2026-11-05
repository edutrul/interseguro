package http

import (
	"encoding/json"
	"errors"
	"net/http"

	appgraph "interseguro/exercise-2/backend/internal/graph"
	"interseguro/exercise-2/backend/internal/routing"
)

// RouteFinder is the slice of routing.Service this layer depends on, so
// handler tests can use a fake instead of running the real algorithm.
type RouteFinder interface {
	FindNearestDepot(req routing.Request) (appgraph.Result, error)
}

type RouteHandler struct {
	service RouteFinder
}

func NewRouteHandler(service RouteFinder) *RouteHandler {
	return &RouteHandler{service: service}
}

func (h *RouteHandler) OptimalRoute(w http.ResponseWriter, r *http.Request) {
	var body optimalRouteRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "request body must be valid JSON")
		return
	}

	result, err := h.service.FindNearestDepot(routing.Request{
		AccidentLocation: body.AccidentLocation,
		Depots:           body.Depots,
		Graph:            body.Graph,
	})
	if err != nil {
		status := statusFor(err)
		if status == http.StatusInternalServerError {
			logLine("error", "unhandled_error", map[string]any{
				"requestId": requestIDFrom(r.Context()),
				"message":   err.Error(),
			})
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, optimalRouteResponse{
		FromDepot: result.FromDepot,
		To:        result.To,
		Path:      result.Path,
		Distance:  result.Distance,
	})
}

func statusFor(err error) int {
	var validationErr *routing.ValidationError
	switch {
	case errors.As(err, &validationErr):
		return http.StatusBadRequest
	case errors.Is(err, appgraph.ErrUnknownNode):
		return http.StatusBadRequest
	case errors.Is(err, appgraph.ErrUnreachable):
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	if status == http.StatusInternalServerError {
		message = "internal server error"
	}
	writeJSON(w, status, errorResponse{Message: message})
}
