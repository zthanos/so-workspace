You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_context.drawio

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md

Load and follow: resources/drawio-c4-guidelines.md (official draw.io C4 v29 shapes)

Purpose:
Generate a C4 Model Level 1 (System Context) diagram using the official draw.io C4 shape
library with placeholders=1 and c4Name/c4Type/c4Description metadata attributes.

## Key rules

SHAPES: Use <object placeholders="1" ...> wrappers with c4* attributes and %placeholder% labels.
DO NOT use plain mxCell with hardcoded text labels for C4 elements.

### Shape styles to use:

Person (internal) — fillColor=#083F75; strokeColor=#06315C; shape=mxgraph.c4.person2; size 200x180
Person (external) — fillColor=#6C6477; strokeColor=#4D4D4D; shape=mxgraph.c4.person2; size 200x180
Software System (internal) — fillColor=#1061B0; strokeColor=#0D5091; rounded=1; size 240x120
Software System (external) — fillColor=#8C8496; strokeColor=#736782; rounded=1; size 240x120
SystemScopeBoundary — fillColor=none; strokeColor=#666666; dashed=1; dashPattern=8 4

### Relationship style:
endArrow=blockThin; endFill=1; strokeColor=#828282; edgeStyle=orthogonalEdgeStyle
Use c4Description for the verb label; add c4Technology when protocol matters.

## C4 Level 1 rules

Include ONLY:
- People (internal + external)
- The system of interest (one Software System, internal blue)
- External systems (grey)
- A SystemScopeBoundary around the system of interest

Do NOT include: containers, APIs, databases, protocols, cloud product names.

## Layout
- Canvas: pageWidth=1400 pageHeight=900
- Boundary centred; actors above/left; external systems below/right
- All connectors: orthogonalEdgeStyle; arrow direction consumer→provider
- Every relationship must carry c4Description

## Output

Return only the content of:
docs/03_architecture/diagrams/src/c4_context.drawio

The file must be valid mxfile XML, fully editable in draw.io 29+.

## Connector crossing avoidance

Before finalising coordinates, apply this layout strategy:

1. Position actors directly left/above their connection targets — connectors flow straight right or down, no crossings needed.
2. Position external systems directly right of the system they connect to — connectors flow straight right.
3. Use explicit exit/entry points:
   - Actor → System: exitX=1;exitY=0.5 on actor, entryX=0;entryY=0.5 on system
4. If a crossing cannot be avoided, add jumpStyle=arc;jumpSize=16; to the connector style.
5. If connectors must detour, add <Array as="points"><mxPoint x="..." y="..."/></Array> waypoints inside <mxGeometry>.

Never let two connectors cross without a jump arc.
