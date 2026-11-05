package graph_test

import (
	"errors"
	"testing"

	"interseguro/exercise-2/backend/internal/graph"
)

// pdfExampleGraph is the Lima district graph from the challenge PDF.
func pdfExampleGraph() map[string]map[string]int {
	return map[string]map[string]int{
		"Miraflores": {"San Isidro": 7, "Barranco": 3},
		"San Isidro": {"Miraflores": 7, "Lince": 4},
		"Barranco":   {"Miraflores": 3, "Surco": 5},
		"Lince":      {"San Isidro": 4, "Surco": 6},
		"Surco":      {"Barranco": 5, "Lince": 6, "Ate": 10},
		"Ate":        {"Surco": 10},
	}
}

func TestNearest_MatchesPDFExample(t *testing.T) {
	g := graph.NewAdjacencyGraph(pdfExampleGraph())

	result, err := graph.Nearest(g, []string{"Miraflores", "Ate"}, "San Isidro")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.FromDepot != "Miraflores" {
		t.Errorf("fromDepot = %q, want Miraflores", result.FromDepot)
	}
	if result.To != "San Isidro" {
		t.Errorf("to = %q, want San Isidro", result.To)
	}
	if result.Distance != 7 {
		t.Errorf("distance = %d, want 7", result.Distance)
	}
	wantPath := []string{"Miraflores", "San Isidro"}
	if !equalPaths(result.Path, wantPath) {
		t.Errorf("path = %v, want %v", result.Path, wantPath)
	}
}

func TestNearest_PicksShorterOfTwoDepots(t *testing.T) {
	// Ate -> Surco -> Lince -> San Isidro = 10+6+4 = 20, much farther than
	// Miraflores' direct 7. The nearer depot must win even though Ate is
	// listed last would not matter since we check both are candidates.
	g := graph.NewAdjacencyGraph(pdfExampleGraph())

	result, err := graph.Nearest(g, []string{"Ate", "Miraflores"}, "San Isidro")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.FromDepot != "Miraflores" || result.Distance != 7 {
		t.Errorf("got depot %q distance %d, want Miraflores distance 7", result.FromDepot, result.Distance)
	}
}

func TestNearest_DepotIsTheAccidentLocation(t *testing.T) {
	g := graph.NewAdjacencyGraph(pdfExampleGraph())

	result, err := graph.Nearest(g, []string{"San Isidro", "Ate"}, "San Isidro")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.FromDepot != "San Isidro" || result.Distance != 0 {
		t.Errorf("got depot %q distance %d, want San Isidro distance 0", result.FromDepot, result.Distance)
	}
	if !equalPaths(result.Path, []string{"San Isidro"}) {
		t.Errorf("path = %v, want [San Isidro]", result.Path)
	}
}

func TestNearest_UnreachableReturnsControlledError(t *testing.T) {
	g := graph.NewAdjacencyGraph(map[string]map[string]int{
		"IslandA":  {"IslandB": 1},
		"IslandB":  {"IslandA": 1},
		"Mainland": {},
	})

	_, err := graph.Nearest(g, []string{"IslandA"}, "Mainland")
	if !errors.Is(err, graph.ErrUnreachable) {
		t.Fatalf("err = %v, want ErrUnreachable", err)
	}
}

func TestNearest_UnknownTargetIsAValidationError(t *testing.T) {
	g := graph.NewAdjacencyGraph(pdfExampleGraph())

	_, err := graph.Nearest(g, []string{"Miraflores"}, "Chorrillos")
	if !errors.Is(err, graph.ErrUnknownNode) {
		t.Fatalf("err = %v, want ErrUnknownNode", err)
	}
}

func TestNearest_UnknownDepotIsAValidationError(t *testing.T) {
	g := graph.NewAdjacencyGraph(pdfExampleGraph())

	_, err := graph.Nearest(g, []string{"Chorrillos"}, "San Isidro")
	if !errors.Is(err, graph.ErrUnknownNode) {
		t.Fatalf("err = %v, want ErrUnknownNode", err)
	}
}

func TestNearest_RecognizesNodesOnlyMentionedAsNeighbors(t *testing.T) {
	// "Remote" only ever appears as someone else's neighbor, never as a
	// top-level key, but it is still a known node of the graph.
	g := graph.NewAdjacencyGraph(map[string]map[string]int{
		"Base": {"Remote": 9},
	})

	result, err := graph.Nearest(g, []string{"Base"}, "Remote")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Distance != 9 {
		t.Errorf("distance = %d, want 9", result.Distance)
	}
}

func TestNearest_PrefersMultiHopShortcutOverDirectLongEdge(t *testing.T) {
	g := graph.NewAdjacencyGraph(map[string]map[string]int{
		"Depot": {"Target": 100, "Mid": 1},
		"Mid":   {"Target": 1},
	})

	result, err := graph.Nearest(g, []string{"Depot"}, "Target")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Distance != 2 {
		t.Errorf("distance = %d, want 2 (via Mid)", result.Distance)
	}
	if !equalPaths(result.Path, []string{"Depot", "Mid", "Target"}) {
		t.Errorf("path = %v, want [Depot Mid Target]", result.Path)
	}
}

func equalPaths(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
