You are in EXECUTION mode.

Authoritative inputs:
- docs/01_requirements/requirements.inventory.md
- docs/02_objectives/objectives.md
- docs/03_architecture/solution_outline.md (if present)

Load and apply these evaluation references:
- resources/drawio-bpmn-guidelines.md
- resources/drawio-bpmn-layout-patterns.md
- resources/drawio-bpmn-anti-patterns.md
- resources/drawio-xml-integrity.md
- resources/drawio-bpmn-examples.md

Purpose:
Evaluate the BPMN diagram for:
- BPMN 2.0 semantic correctness
- scope alignment
- role/participant correctness
- sequence flow versus message flow correctness
- readability and layout quality
- XML integrity

Report generation policy:
1. Create timestamped report: docs/reports/diagram_inconsistencies/bpmn/YYYY-MM-DDTHH-MM_<reason>.md
2. Overwrite: docs/reports/diagram_inconsistencies/bpmn/latest.md

Return only the content of:
docs/reports/diagram_inconsistencies/bpmn/latest.md
