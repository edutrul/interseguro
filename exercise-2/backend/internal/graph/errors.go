package graph

import "errors"

// ErrUnknownNode means a depot or the accident location was not found
// anywhere in the supplied graph. The caller gave the algorithm a node it
// never defined, which is a client input problem, not a routing outcome.
var ErrUnknownNode = errors.New("node not found in graph")

// ErrUnreachable means every node involved is valid, but no path connects
// any depot to the target. The PDF calls this out explicitly: "Si la
// ubicación del accidente no es alcanzable desde ninguna base, devolver
// error controlado."
var ErrUnreachable = errors.New("accident location is not reachable from any depot")
