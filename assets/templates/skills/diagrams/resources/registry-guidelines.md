# Registry Guidelines

The diagram registry is the source of truth for supported diagrams.

Each entry must define:
- diagram_id
- path
- level
- type
- title

Rules:
- `path` must point to a Structurizr DSL file under `docs/03_architecture/diagrams/src/`
- `diagram_id` must be stable and unique
- `level` must match the intended diagram abstraction
- `type` must be `structurizr_dsl`

The registry is used by:
- diagram generation
- evaluation
- patching
- recheck
- command routing