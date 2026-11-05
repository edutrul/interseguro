# ADR-004: Deployment target

**Status:** Accepted, with deployment pending

## Context
The PDF asks to Dockerize and pick a cloud with a free tier, preferably GCP or AWS. SQLite needs a persistent disk.

## Decision
Package everything with Docker Compose, then deploy that same setup to a small free-tier AWS or GCP VM as the final step.

## Alternatives
- **Managed containers (Cloud Run, Fargate):** less to operate, but their storage is temporary or needs a network filesystem, which doesn't suit SQLite.
- **An existing VPS:** faster, but doesn't meet the criterion as written.

## Consequences
- **The cloud part of the criterion isn't met until the deployment happens.**
- A single VM is a single point of failure, which is acceptable for this exercise only.
- TLS isn't included. A real deployment needs a reverse proxy or load balancer in front, because JWTs must not travel over plain HTTP.
