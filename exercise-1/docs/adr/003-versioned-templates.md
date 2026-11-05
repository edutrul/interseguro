# ADR-003: Versioned templates with one active version

**Status:** Accepted

## Context
Editing a live template in place would make it impossible to tell what produced a past payload, and a bad edit would have no way back. Editing rows by hand in production is also risky.

## Decision
A change is a new version. Fields and events belong to a version, and a partial unique index allows one active version per product and endorsement type. Templates are published with an import script that validates a JSON file, then inserts it and switches the active version in one transaction. Each response returns `X-Template-Version`.

## Alternatives
- **Update in place:** simpler, but loses history and rollback.
- **An admin UI or API:** better for business users, but out of scope for this exercise.

## Consequences
- Rolling back means switching `is_active`, and old versions stay available. There's no rollback command yet.
- If the core rejects a payload, the template version can be traced from the response header.
- Publishing is still a technical task. An approval workflow or admin UI is the natural next step.
- Changes take effect immediately because templates aren't cached. A cache would need an invalidation strategy, so it should only be added if measurements call for it.
