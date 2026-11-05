package http_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"interseguro/exercise-2/backend/internal/config"
	"interseguro/exercise-2/backend/internal/routing"
	apphttp "interseguro/exercise-2/backend/internal/transport/http"
)

func testConfig() config.Config {
	return config.Config{
		Host: "0.0.0.0",
		Port: "8080",
		JWT: config.JWT{
			Secret:   "a-test-secret-at-least-32-characters-long",
			Issuer:   "tow-routing-service",
			Audience: "tow-routing-clients",
		},
	}
}

func signToken(t *testing.T, cfg config.Config, overrides func(*jwt.RegisteredClaims)) string {
	t.Helper()
	claims := jwt.RegisteredClaims{
		Issuer:    cfg.JWT.Issuer,
		Audience:  jwt.ClaimStrings{cfg.JWT.Audience},
		Subject:   "test-client",
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}
	if overrides != nil {
		overrides(&claims)
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

func newTestRouter(t *testing.T) (http.Handler, config.Config) {
	t.Helper()
	cfg := testConfig()
	return apphttp.NewRouter(cfg, apphttp.NewRouteHandler(routing.NewService())), cfg
}

// pdfExampleRequest is the exact input from the challenge PDF.
func pdfExampleRequest() map[string]any {
	return map[string]any{
		"accidentLocation": "San Isidro",
		"depots":           []string{"Miraflores", "Ate"},
		"graph": map[string]map[string]int{
			"Miraflores": {"San Isidro": 7, "Barranco": 3},
			"San Isidro": {"Miraflores": 7, "Lince": 4},
			"Barranco":   {"Miraflores": 3, "Surco": 5},
			"Lince":      {"San Isidro": 4, "Surco": 6},
			"Surco":      {"Barranco": 5, "Lince": 6, "Ate": 10},
			"Ate":        {"Surco": 10},
		},
	}
}

func TestRouter_EndToEnd_MatchesPDFExample(t *testing.T) {
	router, cfg := newTestRouter(t)
	payload, _ := json.Marshal(pdfExampleRequest())

	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/optimal", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+signToken(t, cfg, nil))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	want := map[string]any{
		"fromDepot": "Miraflores",
		"to":        "San Isidro",
		"path":      []any{"Miraflores", "San Isidro"},
		"distance":  float64(7),
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	gotJSON, _ := json.Marshal(got)
	wantJSON, _ := json.Marshal(want)
	if string(gotJSON) != string(wantJSON) {
		t.Errorf("got %s, want %s", gotJSON, wantJSON)
	}
}

func TestRouter_RequiresAuthentication(t *testing.T) {
	router, cfg := newTestRouter(t)
	payload, _ := json.Marshal(pdfExampleRequest())

	cases := map[string]func(*http.Request){
		"no header": func(r *http.Request) {},
		"malformed header": func(r *http.Request) {
			r.Header.Set("Authorization", "Token abc")
		},
		"wrong signature": func(r *http.Request) {
			r.Header.Set("Authorization", "Bearer "+mustSign(t, "a-completely-different-secret-32chars!!", cfg))
		},
		"expired": func(r *http.Request) {
			token := signToken(t, cfg, func(c *jwt.RegisteredClaims) {
				c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
			})
			r.Header.Set("Authorization", "Bearer "+token)
		},
		"wrong audience": func(r *http.Request) {
			token := signToken(t, cfg, func(c *jwt.RegisteredClaims) {
				c.Audience = jwt.ClaimStrings{"someone-else"}
			})
			r.Header.Set("Authorization", "Bearer "+token)
		},
	}

	for name, setup := range cases {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/optimal", bytes.NewReader(payload))
			setup(req)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != http.StatusUnauthorized {
				t.Errorf("status = %d, want 401", rec.Code)
			}
		})
	}
}

func TestRouter_UnversionedPathNotFound(t *testing.T) {
	router, _ := newTestRouter(t)
	req := httptest.NewRequest(http.MethodPost, "/routes/optimal", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestRouter_HealthIsPublic(t *testing.T) {
	router, _ := newTestRouter(t)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}

func TestRouter_UnreachableMapsTo422(t *testing.T) {
	router, cfg := newTestRouter(t)
	body := map[string]any{
		"accidentLocation": "Mainland",
		"depots":           []string{"IslandA"},
		"graph": map[string]map[string]int{
			"IslandA":  {},
			"Mainland": {},
		},
	}
	payload, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/routes/optimal", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+signToken(t, cfg, nil))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func mustSign(t *testing.T, secret string, cfg config.Config) string {
	t.Helper()
	claims := jwt.RegisteredClaims{
		Issuer:    cfg.JWT.Issuer,
		Audience:  jwt.ClaimStrings{cfg.JWT.Audience},
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}
