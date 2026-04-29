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

Collaboration modeling rules:
- If the workflow crosses independent participants such as customer, coach, partner, provider, or platform, model them as separate pools by default.
- Use lanes only for internal responsibility partitions within the same participant or organization.
- Do not place customer/player actions, coach actions, and platform processing in one shared lane stack unless the workspace artifacts explicitly describe a single internal process owner.
- Put interacting tasks roughly opposite each other across pools so message flows stay short and obvious.

Event and task rules:
- Use a BPMN start event for process entry and a BPMN end event for completion.
- Do not label start or end events with long business phrases; put business meaning on tasks and message labels.
- Use verb-noun task names such as "Request Session Closure", "Confirm Session Closure", and "Record Session Closure".
- If a participant sends a request to another participant, represent the send/receive interaction with message flows between the relevant tasks.

Preferred default layout:
- Pools stacked vertically
- Primary happy path flowing left-to-right
- External requestor pool at the top
- Internal processing pool(s) in the middle
- Supporting platform/provider pool(s) below or to the side when needed

Output:
Return only the content of:
docs/03_architecture/diagrams/src/bpmn_process.drawio
