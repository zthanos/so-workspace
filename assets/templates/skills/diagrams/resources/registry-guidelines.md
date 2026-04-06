# Registry Guidelines

The diagram registry is the source of truth for supported diagrams.

Each entry must define:
- diagram_id
- path
- level
- type
- title

Rules:
- `path` must point to the correct diagram source file under `docs/03_architecture/diagrams/src/`
- `diagram_id` must be stable and unique
- `level` must match the intended diagram abstraction
- `type` must match the notation used by the diagram (`drawio_xml`, `mermaid`, etc.)

The registry is used by:
- diagram generation
- evaluation
- patching
- recheck
- command routing
