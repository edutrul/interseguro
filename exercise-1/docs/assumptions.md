# Assumptions

What the PDF leaves open. Decisions we made on purpose are in [the ADRs](adr/).

| ID | Assumption |
|---|---|
| **A-001 Core contract** | The PDF gives an example of the structured JSON, but not the core's technology or full API. Its example output is treated as the reference contract. |
| **A-002 Service responsibility** | The translator transforms and returns JSON. It doesn't send anything to the core or execute endorsements. |
| **A-003 Dynamic configuration** | Templates and their transformation rules are stored in SQLite. |
| **A-004 External compatibility** | Internal code uses English. External field names follow the PDF exactly ([ADR-005](adr/005-keep-the-external-contract-verbatim.md)). |
| **A-005 Deployment** | The PDF asks for a cloud with a free tier, preferably GCP or AWS. **That deployment isn't done yet**: it's planned as the last step, and today the stack runs locally with Docker Compose ([ADR-004](adr/004-deployment-target.md)). |
| **A-006 Required fields** | The PDF doesn't say which fields are required. Every sample value that comes from the input is treated as required, because none shows a default. |
| **A-007 Selectors** | `producto` and `tipoEndoso` choose the template and match exactly, including case. |
| **A-008 Not sent** | Absent, `null` and blank (`""`, whitespace) input all count as not sent, so defaults apply and required fields fail. |
| **A-009 Date format** | Dates must be real calendar dates in `YYYY-MM-DD`, the only format in the sample. |
| **A-010 Strict types** | Values aren't coerced: `"5984"` is rejected where a number is expected, and a number is rejected where a string is expected, which protects `policyNumber`'s leading zero. |
| **A-011 Allowed values** | Business values such as `frecuencia` aren't checked against a list, because the PDF defines no catalog. They pass through to the core. |
| **A-012 Extra fields** | Flat fields the template doesn't use are ignored. Nested objects and arrays are rejected, since the input is defined as flat. |
| **A-013 Error language** | Error text is in English, but field names stay as the client sends them. |
| **A-014 Sample quoting** | The PDF sample uses curly quotes around `tipoEndoso` and `plan`. That's treated as a word-processor artifact, and the fixtures use valid JSON. |
| **A-015 Second template** | `DemoVida / CambioDireccion` is fictional. It exists only to demonstrate extensibility and the optional-field case. |
