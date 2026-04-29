You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_context.drawio

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md

Load and follow these resources before generating:
- resources/drawio-c4-guidelines.md
- resources/drawio-c4-layout-patterns.md
- resources/drawio-c4-anti-patterns.md
- resources/drawio-xml-integrity.md
- resources/drawio-c4-examples.md

Purpose:
Generate a C4 Model Level 1 (System Context) diagram using the official draw.io C4 shape
library with placeholders=1 and c4Name/c4Type/c4Description metadata attributes.

## Key rules

SHAPES: Use <object placeholders="1" ...> wrappers with c4* attributes and %placeholder% labels.
DO NOT use plain mxCell with hardcoded text labels for C4 elements.
Use only approved C4 stencil families from the guidance resources.

### Shape styles to use:

Person (internal) — fillColor=#083F75; strokeColor=#06315C; shape=mxgraph.c4.person2; size 200x180
Person (external) — fillColor=#6C6477; strokeColor=#4D4D4D; shape=mxgraph.c4.person2; size 200x180
Software System (internal) — fillColor=#1061B0; strokeColor=#0D5091; rounded=1; size 240x120
Software System (external) — fillColor=#8C8496; strokeColor=#736782; rounded=1; size 240x120
SystemScopeBoundary — fillColor=none; strokeColor=#666666; dashed=1; dashPattern=8 4

### Relationship style:
endArrow=blockThin; endFill=1; strokeColor=#828282; edgeStyle=orthogonalEdgeStyle
Use c4Description for the verb label; add c4Technology when protocol matters.

### Label discipline:
- Use a 3-line C4 label pattern through placeholders:
  - line 1: c4Name
  - line 2: [c4Type]
  - line 3: c4Description
- Labels must remain centred, wrapped, and readable inside the rendered shape.
- Do not place descriptive text outside the shape.
- For filled internal/external shapes, `c4Name` and `c4Type` must be high-contrast white or near-white.
- Do not use low-contrast grey text for metadata on dark blue or grey filled shapes.

## C4 Level 1 rules

Include ONLY:
- People (internal + external)
- The system of interest (one Software System, internal blue)
- External systems (grey)
- A SystemScopeBoundary around the system of interest

Do NOT include: containers, APIs, databases, protocols, cloud product names.
Do NOT mix C4 levels or introduce implementation detail.

## Layout
- Canvas: pageWidth=1400 pageHeight=900
- Boundary centred; actors above/left; external systems below/right
- All connectors: orthogonalEdgeStyle; arrow direction consumer→provider
- Every relationship must carry c4Description
- Follow the context-diagram placement pattern from resources/drawio-c4-layout-patterns.md
- Keep even spacing and avoid cramped boundaries, overlapping labels, or floating orphan elements

### Preferred coordinate pattern

Use this as the default placement pattern unless the workspace artifacts require a clearly better variation:

- System boundary:
  - x=540 y=150 width=500 height=520
- System of interest:
  - x=670 y=350 width=240 height=120
- Actors on the left, vertically stacked:
  - x=120 and y=120 / 310 / 500 / 690
- External systems on the right, vertically stacked:
  - x=1100 and y=220 / 460
- Title block:
  - x=40 y=820 width≈360 height≈40

Do not place the system of interest partly outside the boundary.
Do not place the title underneath actors or overlapping the left column.
Do not place external systems so close that they collide with the internal system or its relationship labels.

## Output

Return only the content of:
docs/03_architecture/diagrams/src/c4_context.drawio

The file must be valid mxfile XML, fully editable in draw.io 29+.
It must comply with the XML integrity rules and remain uncompressed/editable.

## Connector crossing avoidance

Before finalising coordinates, apply this layout strategy:

1. Position actors directly left/above their connection targets — connectors flow straight right or down, no crossings needed.
2. Position external systems directly right of the system they connect to — connectors flow straight right.
3. Use explicit exit/entry points:
   - Actor → System: exitX=1;exitY=0.5 on actor, entryX=0;entryY=0.5 on system
   - System → External System: exitX=1;exitY=0.5 on system, entryX=0;entryY=0.5 on external system
4. If a crossing cannot be avoided, add jumpStyle=arc;jumpSize=16; to the connector style.
5. If connectors must detour, add <Array as="points"><mxPoint x="..." y="..."/></Array> waypoints inside <mxGeometry>.

Never let two connectors cross without a jump arc.

## Anti-patterns to avoid

- Do not use generic rounded rectangles when a specific C4 stencil exists.
- Do not place external actors or systems inside the SystemScopeBoundary.
- Do not hardcode free-text labels directly in mxCell value fields for C4 elements.
- Do not leave relationships unlabeled.
