package http

// optimalRouteRequest mirrors the PDF's example payload exactly.
type optimalRouteRequest struct {
	AccidentLocation string                    `json:"accidentLocation"`
	Depots           []string                  `json:"depots"`
	Graph            map[string]map[string]int `json:"graph"`
}

// optimalRouteResponse mirrors the PDF's example response exactly.
type optimalRouteResponse struct {
	FromDepot string   `json:"fromDepot"`
	To        string   `json:"to"`
	Path      []string `json:"path"`
	Distance  int      `json:"distance"`
}

type errorResponse struct {
	Message string `json:"message"`
}
