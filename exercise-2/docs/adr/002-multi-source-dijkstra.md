# ADR-002: Multi-source Dijkstra via a shared start set, not one search per depot

**Status:** Accepted

## Context
The service must return the nearest of **N** depots to a single accident location. The naive approach runs Dijkstra once per depot and keeps the best result, costing `O(N · (V + E) log V)`.

## Decision
Run a single Dijkstra pass seeded with every depot at distance 0 simultaneously (`internal/graph/dijkstra.go`, `Nearest`). The min-heap always expands the globally closest unvisited node next, so the first time the target is popped, it has been reached by whichever depot is actually nearest — no need to compare N separate runs. Cost is `O((V + E) log V)` regardless of how many depots are supplied.

The predecessor map built during the search is walked backward from the target until a node with no predecessor is found — that node is one of the seeded depots, which also recovers `fromDepot` and the full `path` for free.

## Alternatives
- **One Dijkstra per depot, keep the minimum:** simpler to read, but its cost scales with the number of depots. For a fixed small depot count this would be fine in practice, but it does more work for no benefit.
- **Floyd-Warshall (all-pairs shortest paths):** `O(V³)`, useful if arbitrary pairs were queried repeatedly against a stable graph. Here the graph arrives fresh on every request, so precomputing all pairs is wasted work.

## Consequences
- Ties (two depots equidistant from the target) resolve to whichever one the heap settles first; this is deterministic for a given input but not meaningful as a tiebreak rule, and is covered by `TestNearest_PicksShorterOfTwoDepots` rather than a tie-specific test.
- The algorithm depends only on the `Graph` interface (`Neighbors`, `Known`), not on `AdjacencyGraph` directly, so a different graph source can be substituted without touching `Nearest`.
