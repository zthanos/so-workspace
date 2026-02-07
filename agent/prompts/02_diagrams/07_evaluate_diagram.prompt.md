You are in EXECUTION mode.

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md

Diagram selection:
Use the diagram_id provided in the EXECUTE message (diagram_id: ...).

Supported diagram_ids and paths:
- c4_context   -> docs/03_architecture/diagrams/src/c4_context.puml
- c4_container -> docs/03_architecture/diagrams/src/c4_container.puml

Resolve:
- If diagram_id is not one of the supported values, STOP and report an error in the output.

Diagram under evaluation:
- diagram_id: <resolved from input>
- diagram_path: <resolved from mapping>

Template reference:
- build/reports/diagram_inconsistencies.template.md

Purpose:
Evaluate the selected diagram for correctness, completeness, and scope alignment
against Objectives + Requirements Inventory.

Rules:
- Do NOT modify any files.
- Base findings strictly on objectives.md and requirements.inventory.md.
- Do NOT suggest solution design; only diagram correctness and wording.
- Evidence must reference:
  - Objectives section titles and/or Requirement IDs (REQ-xx),
  - and the diagram element (name/label/relationship).

Evaluation checks:
1) Missing Elements (actor/system/container/relationship required by objectives/inventory)
2) Scope Creep (element not supported by objectives/inventory)
3) Wrong Level (details beyond diagram level)
4) Tech Leakage (technologies, products, protocols, cloud services)
5) Relationship Error (direction/responsibility/optionality)
6) Naming Mismatch (terminology)
7) Ambiguity Not Captured (diagram implies resolved policies that are open)

Report generation policy:
1) Create a new timestamped report under:
   build/reports/diagram_inconsistencies/<diagram_id>/

   Filename format:
   YYYY-MM-DDTHH-MM_<short_reason>.md

2) Also overwrite (or create):
   build/reports/diagram_inconsistencies/<diagram_id>/latest.md

Return only the content of:
build/reports/diagram_inconsistencies/<diagram_id>/latest.md
