package routing_test

import (
	"errors"
	"testing"

	appgraph "interseguro/exercise-2/backend/internal/graph"
	"interseguro/exercise-2/backend/internal/routing"
)

func sampleGraph() map[string]map[string]int {
	return map[string]map[string]int{
		"Miraflores": {"San Isidro": 7},
		"San Isidro": {"Miraflores": 7},
	}
}

func TestFindNearestDepot_Success(t *testing.T) {
	svc := routing.NewService()

	result, err := svc.FindNearestDepot(routing.Request{
		AccidentLocation: "San Isidro",
		Depots:           []string{"Miraflores"},
		Graph:            sampleGraph(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.FromDepot != "Miraflores" || result.Distance != 7 {
		t.Errorf("got %+v", result)
	}
}

func TestFindNearestDepot_Validation(t *testing.T) {
	svc := routing.NewService()

	cases := map[string]routing.Request{
		"missing accidentLocation": {Depots: []string{"Miraflores"}, Graph: sampleGraph()},
		"missing depots":           {AccidentLocation: "San Isidro", Graph: sampleGraph()},
		"empty depot entry":        {AccidentLocation: "San Isidro", Depots: []string{""}, Graph: sampleGraph()},
		"missing graph":            {AccidentLocation: "San Isidro", Depots: []string{"Miraflores"}},
		"negative weight": {
			AccidentLocation: "San Isidro",
			Depots:           []string{"Miraflores"},
			Graph:            map[string]map[string]int{"Miraflores": {"San Isidro": -1}},
		},
	}

	for name, req := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := svc.FindNearestDepot(req)
			var validationErr *routing.ValidationError
			if !errors.As(err, &validationErr) {
				t.Fatalf("err = %v, want *routing.ValidationError", err)
			}
		})
	}
}

func TestFindNearestDepot_PropagatesUnreachable(t *testing.T) {
	svc := routing.NewService()

	_, err := svc.FindNearestDepot(routing.Request{
		AccidentLocation: "San Isidro",
		Depots:           []string{"Miraflores"},
		Graph: map[string]map[string]int{
			"Miraflores": {},
			"San Isidro": {},
		},
	})
	if !errors.Is(err, appgraph.ErrUnreachable) {
		t.Fatalf("err = %v, want ErrUnreachable", err)
	}
}

func TestFindNearestDepot_PropagatesUnknownNode(t *testing.T) {
	svc := routing.NewService()

	_, err := svc.FindNearestDepot(routing.Request{
		AccidentLocation: "Chorrillos",
		Depots:           []string{"Miraflores"},
		Graph:            sampleGraph(),
	})
	if !errors.Is(err, appgraph.ErrUnknownNode) {
		t.Fatalf("err = %v, want ErrUnknownNode", err)
	}
}
