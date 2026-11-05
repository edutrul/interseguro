package graph_test

import (
	"testing"

	"interseguro/exercise-2/backend/internal/graph"
)

func TestAdjacencyGraph_Known(t *testing.T) {
	g := graph.NewAdjacencyGraph(map[string]map[string]int{
		"A": {"B": 1},
	})

	for _, node := range []string{"A", "B"} {
		if !g.Known(node) {
			t.Errorf("Known(%q) = false, want true", node)
		}
	}
	if g.Known("C") {
		t.Errorf("Known(%q) = true, want false", "C")
	}
}

func TestAdjacencyGraph_NeighborsOfUnknownNodeIsNil(t *testing.T) {
	g := graph.NewAdjacencyGraph(map[string]map[string]int{"A": {"B": 1}})
	if neighbors := g.Neighbors("ghost"); neighbors != nil {
		t.Errorf("Neighbors(ghost) = %v, want nil", neighbors)
	}
}
