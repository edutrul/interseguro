package http_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	appgraph "interseguro/exercise-2/backend/internal/graph"
	"interseguro/exercise-2/backend/internal/routing"
	apphttp "interseguro/exercise-2/backend/internal/transport/http"
)

type fakeFinder struct {
	result appgraph.Result
	err    error
}

func (f fakeFinder) FindNearestDepot(routing.Request) (appgraph.Result, error) {
	return f.result, f.err
}

func doRequest(t *testing.T, handler http.Handler, body any) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/optimal", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestOptimalRoute_Success(t *testing.T) {
	h := apphttp.NewRouteHandler(fakeFinder{result: appgraph.Result{
		FromDepot: "Miraflores",
		To:        "San Isidro",
		Path:      []string{"Miraflores", "San Isidro"},
		Distance:  7,
	}})

	rec := doRequest(t, http.HandlerFunc(h.OptimalRoute), map[string]any{
		"accidentLocation": "San Isidro",
		"depots":           []string{"Miraflores", "Ate"},
		"graph":            map[string]map[string]int{"Miraflores": {"San Isidro": 7}},
	})

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %s", rec.Code, rec.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if got["fromDepot"] != "Miraflores" || got["distance"] != float64(7) {
		t.Errorf("unexpected body: %v", got)
	}
}

func TestOptimalRoute_InvalidJSON(t *testing.T) {
	h := apphttp.NewRouteHandler(fakeFinder{})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/optimal", bytes.NewReader([]byte("{not json")))
	rec := httptest.NewRecorder()
	h.OptimalRoute(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestOptimalRoute_ValidationErrorMapsTo400(t *testing.T) {
	h := apphttp.NewRouteHandler(fakeFinder{err: &routing.ValidationError{Message: "accidentLocation is required"}})

	rec := doRequest(t, http.HandlerFunc(h.OptimalRoute), map[string]any{})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestOptimalRoute_UnknownNodeMapsTo400(t *testing.T) {
	h := apphttp.NewRouteHandler(fakeFinder{err: appgraph.ErrUnknownNode})

	rec := doRequest(t, http.HandlerFunc(h.OptimalRoute), map[string]any{})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestOptimalRoute_UnreachableMapsTo422(t *testing.T) {
	h := apphttp.NewRouteHandler(fakeFinder{err: appgraph.ErrUnreachable})

	rec := doRequest(t, http.HandlerFunc(h.OptimalRoute), map[string]any{})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rec.Code)
	}
}

func TestOptimalRoute_UnexpectedErrorMapsTo500AndHidesDetails(t *testing.T) {
	h := apphttp.NewRouteHandler(fakeFinder{err: errUnexpected{}})

	rec := doRequest(t, http.HandlerFunc(h.OptimalRoute), map[string]any{})
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if bytes.Contains(rec.Body.Bytes(), []byte("boom")) {
		t.Errorf("response leaked internal error details: %s", rec.Body.String())
	}
}

type errUnexpected struct{}

func (errUnexpected) Error() string { return "boom: disk on fire" }
