// Package graph holds the routing domain: a graph abstraction and the
// shortest-path algorithm that works against it. Nothing here knows about
// HTTP, JSON or JWT, so it can be unit tested in isolation and swapped onto
// a different data source later without touching the algorithm.
package graph

// Graph is the shape Dijkstra needs: given a node, which neighbors does it
// reach and at what cost. A new backing (a database-loaded graph, a cached
// graph, a graph restricted to a sub-region) only needs to satisfy this
// interface; nothing in the algorithm changes.
type Graph interface {
	// Neighbors returns the outgoing edges of node as neighbor -> weight.
	// A node with no outgoing edges, or one absent from the graph, returns nil.
	Neighbors(node string) map[string]int
	// Known reports whether node appears anywhere in the graph, either as a
	// source or as someone else's neighbor.
	Known(node string) bool
}

// AdjacencyGraph is a Graph backed by a plain adjacency map, which is also
// the exact shape the API accepts in the request body. It is the only
// implementation this service ships, but callers only ever depend on Graph.
type AdjacencyGraph struct {
	edges map[string]map[string]int
	nodes map[string]struct{}
}

// NewAdjacencyGraph builds a Graph from an adjacency map such as the one in
// the request payload. A node is "known" if it appears as a key or as a
// neighbor of some other node, so an asymmetric graph still recognizes
// every district it mentions.
func NewAdjacencyGraph(edges map[string]map[string]int) AdjacencyGraph {
	nodes := make(map[string]struct{}, len(edges))
	for node, neighbors := range edges {
		nodes[node] = struct{}{}
		for neighbor := range neighbors {
			nodes[neighbor] = struct{}{}
		}
	}
	return AdjacencyGraph{edges: edges, nodes: nodes}
}

func (g AdjacencyGraph) Neighbors(node string) map[string]int { return g.edges[node] }

func (g AdjacencyGraph) Known(node string) bool {
	_, ok := g.nodes[node]
	return ok
}
