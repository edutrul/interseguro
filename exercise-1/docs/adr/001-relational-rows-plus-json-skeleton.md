# ADR-001: Relational rows for what varies, a JSON skeleton for the shape

**Status:** Accepted

## Context
Labels, field order, defaults and events vary by product and endorsement type, and the PDF evaluates how the tables model them. The output's nesting also has to be reproduced exactly, but it changes far less often.

## Decision
Store fields and events as rows with constraints. Store the output shape as a JSON skeleton on the template, filled by a small generic mapper with two placeholder kinds and no logic.

## Alternatives
- **One JSON column for everything:** simplest, but the database can't enforce order, uniqueness or valid fields.
- **The whole output tree as rows:** the most relational, but needs recursive queries and is hard to edit, all to store something that rarely changes.
- **Columns or tables per product:** every new product needs a schema change, which breaks the core requirement.
- **An existing template or transformation language (JSONata, Handlebars):** more powerful, but it allows logic in configuration, and it's more than the current templates need.

## Consequences
- A new product or endorsement type is data only, proven by a test that adds one with SQL.
- Bad configuration is largely rejected by the database. What it can't express, such as placeholder syntax, is checked on import and on each translation (422).
- The skeleton can't express conditions, repetition or value transformations. If real templates need them, this decision should be revisited, probably in favor of an established language.
- Key order relies on JSON object order. JavaScript moves integer-like keys first, which doesn't affect this contract because it has none.
