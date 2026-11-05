# Assumptions

- **Endpoint path:** the PDF doesn't name one for this exercise (only for exercise 1). Chose `POST /api/v1/routes/optimal`, versioned the same way as exercise 1.
- **Directed graph:** edges are read exactly as declared (`graph[from][to] = weight`). The PDF's sample graph happens to list every edge in both directions, but nothing requires that, and the algorithm doesn't assume it.
- **Non-negative weights only:** Dijkstra is only correct for non-negative weights. A negative weight is rejected as a 400 validation error rather than silently producing a wrong "shortest" path.
- **Unknown nodes are a client error, not a routing outcome:** if a depot or the accident location isn't a node the submitted graph mentions (as a key or as someone else's neighbor), that's 400, distinct from the PDF's "not reachable" case, which is 422 for a request that was well-formed but has no connecting path.
- **No persistence for the graph:** see [ADR-003](adr/003-graph-in-request-payload.md). The request supplies its own graph every time, matching the PDF's example payload.
- **Separate JWT audience from exercise 1:** `tow-routing-clients` vs. `endorsement-clients`, so a token minted for one service doesn't work against the other even if both happened to share a secret.
- **Tie-breaking between equidistant depots:** not specified by the PDF. Whichever depot the search settles on first wins; deterministic for a given input, but not meant to encode a business rule (e.g., "prefer the depot with more capacity"). See [ADR-002](adr/002-multi-source-dijkstra.md).
