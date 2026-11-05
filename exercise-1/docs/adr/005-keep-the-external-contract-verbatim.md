# ADR-005: Keep the external contract verbatim, English internally

**Status:** Accepted

## Context
The contract mixes Spanish and English, even within one object: `{ "etiqueta": ..., "value": ... }`, and `policyNumber` next to `idEnvio`. We don't own this contract, and the core depends on it.

## Decision
External names stay exactly as written, and internal code and the database use English. Translation happens at the edges:

| External | Internal |
|---|---|
| `producto` | `productCode` / `product_code` |
| `tipoEndoso` | `endorsementType` / `endorsement_type` |
| `etiqueta` | `label` |
| `orderEvent` | `event_order` |

External names appear in code in only two places: the selectors in the request DTO, and the list item keys in the mapper. All others live in template data.

## Alternatives
- **Normalize the contract to one language:** tidier, but it breaks the integration.
- **Spanish internally:** matches the contract, but mixes languages through the code without removing the inconsistency.

## Consequences
- A reader sees both languages at the boundaries, on purpose.
- If the core renames a list item key, that's a small code change, because those keys are part of the core's contract and not per-product configuration.
