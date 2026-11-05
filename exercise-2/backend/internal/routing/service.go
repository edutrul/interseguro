// Package routing orchestrates the use case: validate a route request, then
// delegate the actual pathfinding to the graph package. It knows nothing
// about HTTP or JSON, so it is reusable from any transport.
package routing

import (
	"errors"
	"fmt"

	"interseguro/exercise-2/backend/internal/graph"
)

// ValidationError means the request itself is malformed, independent of
// whether a route exists. The transport layer maps it to 400.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

// Request is the use case's input, already decoded from whatever transport
// carried it.
type Request struct {
	AccidentLocation string
	Depots           []string
	Graph            map[string]map[string]int
}

// Service finds the nearest tow-truck depot to an accident.
type Service struct{}

func NewService() *Service { return &Service{} }

// FindNearestDepot validates req and returns the nearest depot's path and
// distance to the accident location. Errors are either *ValidationError
// (bad request), graph.ErrUnknownNode, or graph.ErrUnreachable.
func (s *Service) FindNearestDepot(req Request) (graph.Result, error) {
	if req.AccidentLocation == "" {
		return graph.Result{}, &ValidationError{Message: "accidentLocation is required"}
	}
	if len(req.Depots) == 0 {
		return graph.Result{}, &ValidationError{Message: "depots must contain at least one depot"}
	}
	for i, depot := range req.Depots {
		if depot == "" {
			return graph.Result{}, &ValidationError{Message: fmt.Sprintf("depots[%d] must not be empty", i)}
		}
	}
	if len(req.Graph) == 0 {
		return graph.Result{}, &ValidationError{Message: "graph must contain at least one node"}
	}
	for node, neighbors := range req.Graph {
		for neighbor, weight := range neighbors {
			if weight < 0 {
				return graph.Result{}, &ValidationError{
					Message: fmt.Sprintf("graph[%q][%q] must not be negative: Dijkstra requires non-negative weights", node, neighbor),
				}
			}
		}
	}

	g := graph.NewAdjacencyGraph(req.Graph)
	result, err := graph.Nearest(g, req.Depots, req.AccidentLocation)
	if err != nil {
		if errors.Is(err, graph.ErrUnknownNode) || errors.Is(err, graph.ErrUnreachable) {
			return graph.Result{}, err
		}
		return graph.Result{}, fmt.Errorf("find nearest depot: %w", err)
	}
	return result, nil
}
