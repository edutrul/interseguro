# ADR-003: The graph travels in the request, nothing is persisted

**Status:** Accepted

## Context
The PDF's own example sends `graph`, `depots` and `accidentLocation` together in one request body, and asks that "el grafo de Lima debe poder cambiar sin modificar la lógica central" (the extensibility criterion). Unlike exercise 1, nothing in this exercise's text asks for a database of graph configuration.

## Decision
The service is stateless: every request supplies its own graph. There is no database, no default graph baked into the binary, and no endpoint to manage one.

## Alternatives
- **A default graph seeded in a database or config file, request graph optional:** closer to how a real dispatch system would work (Lima's district graph does not change request to request), but it adds a persistence layer the PDF's example payload does not ask for, and a second thing to keep in sync with reality. Out of scope for this exercise; noted under "Not production-ready."
- **A graph baked into the binary as a Go literal:** fails the extensibility criterion outright — changing a district or a distance would require a rebuild.

## Consequences
- Extensibility is satisfied structurally: `graph.Nearest` only depends on the `Graph` interface, and the adjacency map comes straight from the request body, so adding, removing or reweighting districts never touches `internal/graph` or `internal/routing`.
- A production version would almost certainly cache or persist a canonical Lima graph and let the request override or reference it, rather than resending the whole graph every time; see "Not production-ready" in the README.
