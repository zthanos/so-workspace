You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/solution_outline.md

Authoritative inputs:
- templates/solution_outline.template.md
- docs/02_objectives/objectives.md
- docs/03_architecture/diagrams/src/c4_context.puml
- docs/03_architecture/diagrams/src/c4_container.puml

Purpose:
Generate the Solution Outline document using the provided template as a strict contract.
Populate each section only with content supported by the Objectives and validated diagrams.

Rules:
- Follow the template headings and ordering exactly.
- Populate a section only if there is supporting information in objectives or diagrams.
- If a section has no supporting input, omit the entire section (do not leave empty headings).
- Do NOT introduce new requirements, scope, systems, integrations, or technologies.
- Do NOT introduce implementation or deployment details.
- Keep content architectural and descriptive.
- Reference diagrams explicitly by name and path where relevant.
- Do NOT evaluate, review, or correct content in this step.

Return only the content of:
docs/03_architecture/solution_outline.md
