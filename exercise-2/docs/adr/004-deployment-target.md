# ADR-004: Deployment target — Cloud Run, not a VM

**Status:** Accepted, with deployment pending

## Context
The PDF asks to Dockerize and pick a cloud with a free tier, preferably GCP or AWS. Exercise 1 picked a free-tier VM (see its ADR-004) because SQLite needs a persistent disk. This service has no database — per [ADR-003](003-graph-in-request-payload.md) the graph arrives in the request itself — so that constraint does not apply here.

## Decision
Package with Docker Compose for local use, and deploy the backend and frontend containers to **Google Cloud Run** (free tier: 2 million requests/month, scales to zero) as the final step, rather than reusing exercise 1's VM.

## Alternatives
- **The same free-tier VM as exercise 1:** would work, but pays for idle capacity around the clock for a service that, being stateless, has no reason not to scale to zero between requests.
- **AWS Fargate:** comparable managed-container fit, but its free tier is smaller and less friendly to a side-project deployment than Cloud Run's.

## Consequences
- **The cloud part of the criterion isn't met until the deployment happens.**
- Cloud Run terminates idle instances, so a cold start adds latency to the first request after a quiet period; acceptable for this exercise, worth a warm-up ping in a real deployment.
- No TLS is configured in this repo; Cloud Run terminates TLS at its own edge, so a real deployment gets it for free, unlike exercise 1's bare VM.
