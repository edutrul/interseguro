package http

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type contextKey int

const requestIDKey contextKey = iota

// withLogging assigns a request ID, exposes it as X-Request-Id on the
// response (useful for correlating a client-reported error with server
// logs), and logs one structured line per request.
func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		id := newRequestID()
		w.Header().Set("X-Request-Id", id)

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))

		logLine("info", "request", map[string]any{
			"requestId":  id,
			"method":     r.Method,
			"path":       r.URL.Path,
			"status":     rec.status,
			"durationMs": time.Since(start).Milliseconds(),
		})
	})
}

func requestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func logLine(level, event string, fields map[string]any) {
	fields["level"] = level
	fields["event"] = event
	line, err := json.Marshal(fields)
	if err != nil {
		log.Printf("%s %s (fields not encodable)", level, event)
		return
	}
	log.Println(string(line))
}

// newRequestID generates a random UUID v4 without pulling in a dependency.
func newRequestID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16])
}
