// Command gentoken prints a development JWT signed with the configured
// secret. A real deployment would get tokens from an identity provider
// instead; this exists so the API and its frontend can be exercised locally.
package main

import (
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"interseguro/exercise-2/backend/internal/config"
)

const devTokenTTL = time.Hour

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    cfg.JWT.Issuer,
		Audience:  jwt.ClaimStrings{cfg.JWT.Audience},
		Subject:   "dev-client",
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(devTokenTTL)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(cfg.JWT.Secret))
	if err != nil {
		log.Fatalf("sign token: %v", err)
	}
	fmt.Println(signed)
}
