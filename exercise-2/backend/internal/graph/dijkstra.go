package graph

import "container/heap"

// Result is the answer to "which depot, and by which path, reaches the
// accident fastest."
type Result struct {
	FromDepot string
	To        string
	Path      []string
	Distance  int
}

// Nearest runs a single multi-source Dijkstra search seeded from every depot
// at once, rather than one search per depot, so the cost stays
// O((V+E) log V) regardless of how many depots are supplied. It returns the
// depot, path and distance for whichever depot reaches target first.
//
// If depots or target reference a node the graph never mentions,
// ErrUnknownNode is returned. If every node is valid but no edge sequence
// connects any depot to target, ErrUnreachable is returned.
func Nearest(g Graph, depots []string, target string) (Result, error) {
	if !g.Known(target) {
		return Result{}, ErrUnknownNode
	}
	for _, depot := range depots {
		if !g.Known(depot) {
			return Result{}, ErrUnknownNode
		}
	}

	dist := make(map[string]int, len(depots))
	prev := make(map[string]string, len(depots))
	visited := make(map[string]bool, len(depots))

	pq := make(priorityQueue, 0, len(depots))
	heap.Init(&pq)
	for _, depot := range depots {
		if existing, seen := dist[depot]; !seen || existing > 0 {
			dist[depot] = 0
			heap.Push(&pq, item{node: depot, dist: 0})
		}
	}

	for pq.Len() > 0 {
		current := heap.Pop(&pq).(item)
		if visited[current.node] {
			continue
		}
		visited[current.node] = true
		if current.node == target {
			break
		}

		for neighbor, weight := range g.Neighbors(current.node) {
			if visited[neighbor] {
				continue
			}
			candidate := current.dist + weight
			if existing, seen := dist[neighbor]; !seen || candidate < existing {
				dist[neighbor] = candidate
				prev[neighbor] = current.node
				heap.Push(&pq, item{node: neighbor, dist: candidate})
			}
		}
	}

	distance, reached := dist[target]
	if !reached {
		return Result{}, ErrUnreachable
	}

	path := []string{target}
	for node := target; ; {
		parent, hasParent := prev[node]
		if !hasParent {
			break // node is itself one of the depots: the search's origin.
		}
		path = append(path, parent)
		node = parent
	}
	for left, right := 0, len(path)-1; left < right; left, right = left+1, right-1 {
		path[left], path[right] = path[right], path[left]
	}

	return Result{FromDepot: path[0], To: target, Path: path, Distance: distance}, nil
}

type item struct {
	node string
	dist int
}

type priorityQueue []item

func (pq priorityQueue) Len() int           { return len(pq) }
func (pq priorityQueue) Less(i, j int) bool { return pq[i].dist < pq[j].dist }
func (pq priorityQueue) Swap(i, j int)      { pq[i], pq[j] = pq[j], pq[i] }
func (pq *priorityQueue) Push(x any)        { *pq = append(*pq, x.(item)) }
func (pq *priorityQueue) Pop() any {
	old := *pq
	n := len(old)
	popped := old[n-1]
	*pq = old[:n-1]
	return popped
}
