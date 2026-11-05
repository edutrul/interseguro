package http

import "net/http"

// Health is public: there is no database to check, so a 200 response means
// the process is up and serving.
func Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
