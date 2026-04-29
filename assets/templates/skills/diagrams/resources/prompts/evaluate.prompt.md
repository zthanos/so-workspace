You are in EXECUTION mode.

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md

Diagram selection: use diagram_id from the EXECUTE message.

Supported diagram_ids:
- c4_context   -> docs/03_architecture/diagrams/src/c4_context.drawio
- c4_container -> docs/03_architecture/diagrams/src/c4_container.drawio

Use the report structure from this skill's report-template resource.

Purpose:
Evaluate the selected diagram for correctness, completeness, scope alignment,
and compliance with the official draw.io C4 shape standard (v29+).

Load and apply these evaluation references:
- resources/drawio-c4-guidelines.md
- resources/drawio-c4-layout-patterns.md
- resources/drawio-c4-anti-patterns.md
- resources/drawio-xml-integrity.md
- resources/drawio-c4-examples.md

Rules:
- Do NOT modify any files.
- Base findings strictly on objectives.md and requirements.inventory.md.
- Evidence must reference Objectives section / REQ-xx AND the diagram element.

Evaluation checks:

1) Missing Elements — actor/system/container/relationship required by objectives/inventory
2) Scope Creep — element not supported by objectives/inventory
3) Wrong Level — details beyond the diagram's C4 level
4) Tech Leakage — technology names in context diagrams; missing tech tags in container diagrams
5) Relationship Error — wrong direction, missing label, wrong responsibility
6) Naming Mismatch — terminology inconsistent with workspace artifacts
7) Ambiguity — diagram implies resolved policies that are still open
8) Visual Quality — poor spacing, unreadable labels, misaligned layers

9) Connector Crossing Violations — crossings that could have been avoided:
   - Check if any two connectors cross each other
   - For each crossing: determine if repositioning a shape OR adding a waypoint would eliminate it
   - Report avoidable crossings as issues: "Connector X crosses connector Y — can be eliminated by [specific action]"
   - Accept crossings only when genuinely unavoidable; verify they use jumpStyle=arc;jumpSize=16
   - Report unavoidable crossings without jumpStyle=arc as a minor issue

10) Exit/Entry Point Violations:
    - Downward flows (UI→API→Services→Data) should exit from bottom-centre (exitY=1) and enter top-centre (entryY=0)
    - Rightward flows (Services→External) should exit from right-centre (exitX=1) and enter left-centre (entryX=0)
    - Report connectors that attach to a wrong side of a shape, causing unnecessary detours or crossings

9) Shape Compliance (draw.io C4 v29 standard):
   - Every C4 element must use an <object placeholders="1"> wrapper with c4Name, c4Type, c4Description attributes
   - People must use shape=mxgraph.c4.person2
   - Internal elements: blue family (#083F75 person, #1061B0 system, #23A2D9 container)
   - External elements: grey/purple family (#6C6477 person, #8C8496 system)
   - Databases must use shape=cylinder3
   - Boundaries must use dashed=1; dashPattern=8 4; fillColor=none
   - Report any shape using generic rounded=1 without the <object> wrapper as a Stencil Violation

10) Boundary Placement:
    - At C4 Context: external systems must be OUTSIDE the SystemScopeBoundary
    - At C4 Container: external systems must be OUTSIDE the ContainerScopeBoundary
    - Report external systems placed inside any boundary as a Level Violation

11) Relationship Compliance:
    - All relationships must use edgeStyle=orthogonalEdgeStyle (no diagonal lines)
    - All relationships must carry at least c4Description
    - Container-level relationships should carry c4Technology
    - Report unlabelled or diagonal relationships

Report generation policy:
1) Create timestamped report: docs/reports/diagram_inconsistencies/<diagram_id>/YYYY-MM-DDTHH-MM_<reason>.md
2) Overwrite: docs/reports/diagram_inconsistencies/<diagram_id>/latest.md

Return only the content of:
docs/reports/diagram_inconsistencies/<diagram_id>/latest.md
