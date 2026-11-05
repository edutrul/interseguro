// Command api runs the tow-truck optimal-routing HTTP service.
package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"interseguro/exercise-2/backend/internal/config"
	"interseguro/exercise-2/backend/internal/routing"
	apphttp "interseguro/exercise-2/backend/internal/transport/http"
)

func main() {
	// The production image is distroless, with no shell and no curl, so
	// Docker's HEALTHCHECK runs this binary against itself instead.
	healthcheck := flag.Bool("healthcheck", false, "probe the local /health endpoint and exit 0 or 1")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if *healthcheck {
		os.Exit(runHealthcheck(cfg.Port))
	}

	handler := apphttp.NewRouter(cfg, apphttp.NewRouteHandler(routing.NewService()))
	server := &http.Server{
		Addr:              cfg.Host + ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func runHealthcheck(port string) int {
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%s/health", port))
	if err != nil {
		return 1
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
