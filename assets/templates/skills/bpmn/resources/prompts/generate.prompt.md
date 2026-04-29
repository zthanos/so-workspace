You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/bpmn_process.drawio

Authoritative inputs:
- docs/01_requirements/requirements.inventory.md
- docs/02_objectives/objectives.md
- docs/03_architecture/solution_outline.md (if present)

Load and follow these resources before generating:
- resources/drawio-bpmn-guidelines.md
- resources/drawio-bpmn-layout-patterns.md
- resources/drawio-bpmn-anti-patterns.md
- resources/drawio-xml-integrity.md
- resources/drawio-bpmn-examples.md

Purpose:
Generate a BPMN 2.0 business process diagram in editable draw.io XML.

Rules:
- Use BPMN semantics, not a generic flowchart.
- Use pools and lanes when multiple participants or responsibility boundaries are involved.
- Use sequence flows only within a single pool.
- Use message flows only between pools.
- Label outgoing branches from exclusive and inclusive gateways.
- Keep labels business-oriented and concise.
- Keep the layout readable and enterprise-grade.

Output:
Return only the content of:
docs/03_architecture/diagrams/src/bpmn_process.drawio
