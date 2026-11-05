# ADR-002: SQLite as the database

**Status:** Accepted

## Context
The exercise needs a real relational model and easy deployment. The workload is read-heavy: templates change rarely and translations only read.

## Decision
Use SQLite on a persistent Docker volume, through TypeORM, with a hand-written migration.

## Alternatives
- **PostgreSQL or MySQL:** the right choice for a production service, but an extra container and operational work that this exercise doesn't benefit from.

## Consequences
- One file, no database server, and it's never exposed publicly.
- It ties the service to a single instance: it can't scale horizontally on shared storage. This is the first thing to change for production.
- Moving means rewriting one small migration, because services only see the `TemplateReader` interface. The partial unique index and `CHECK` constraints also exist in PostgreSQL.
