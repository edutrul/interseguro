// Package config loads settings from the environment, optionally seeded
// from a local .env file for development. Docker Compose injects the real
// environment directly, so the .env file is only read when present.
package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

const minSecretLength = 32

type JWT struct {
	Secret   string
	Issuer   string
	Audience string
}

type Config struct {
	Host string
	Port string
	JWT  JWT
}

// Load reads configuration from the environment. If a .env file exists in
// the working directory, it seeds any variable not already set.
func Load() (Config, error) {
	loadDotEnv(".env")

	secret := os.Getenv("JWT_SECRET")
	if len(secret) < minSecretLength {
		return Config{}, fmt.Errorf("JWT_SECRET must be set and have at least %d characters", minSecretLength)
	}

	return Config{
		Host: getOrDefault("HOST", "0.0.0.0"),
		Port: getOrDefault("PORT", "8080"),
		JWT: JWT{
			Secret:   secret,
			Issuer:   getOrDefault("JWT_ISSUER", "tow-routing-service"),
			Audience: getOrDefault("JWT_AUDIENCE", "tow-routing-clients"),
		},
	}, nil
}

func getOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// loadDotEnv is a minimal KEY=VALUE reader, deliberately not a dependency:
// this service has exactly one simple env file to parse. Existing
// environment variables always win, matching how Docker Compose and real
// deployments behave.
func loadDotEnv(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}
		key = strings.TrimSpace(key)
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		os.Setenv(key, strings.TrimSpace(value))
	}
}
