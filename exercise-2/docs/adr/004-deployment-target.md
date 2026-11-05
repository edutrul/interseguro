# ADR-004: Deployment target

**Status:** Accepted

## Context
The PDF asks to Dockerize and pick a cloud with a free tier, preferably GCP or AWS. The demo had to be online quickly, and an existing Linux VPS with Docker, Caddy and HTTPS was already available.

## Decision
Deploy with Docker Compose to the existing VPS, behind its shared Caddy, at `interseguro.eduardotelaya.com`. Each exercise has its own path. No container publishes a host port. The [root README](../../../README.md#deployment) has the steps.

## Alternatives
- **Free-tier AWS or GCP VM:** meets the criterion as written, but needs a new account setup and more time. The same Compose files would run there.
- **Managed containers (Cloud Run, Fargate):** less to operate, but their storage is temporary or needs a network filesystem, which doesn't suit SQLite in Exercise 1.

## Consequences
- **This is a deliberate deviation: the cloud part of the criterion isn't met.** Moving means repeating the root README's steps on a cloud VM and changing the DNS record.
- A single server is a single point of failure, and it's shared with unrelated sites. That's acceptable for a demo only.
- Tokens are signed with a shared secret by a development script, including the longer-lived demo tokens. Production needs an identity provider.
