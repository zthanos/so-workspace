You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_container.drawio

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md
- docs/03_architecture/diagrams/src/c4_context.drawio (for context, if present)

Load and follow: resources/drawio-c4-guidelines.md (official draw.io C4 v29 shapes)

Purpose:
Generate a C4 Model Level 2 (Container) diagram using the official draw.io C4 shape
library with placeholders=1 and c4Name/c4Type/c4Technology/c4Description metadata attributes.

## Key rules

SHAPES: Use <object placeholders="1" ...> wrappers with c4* attributes and %placeholder% labels.
DO NOT use plain mxCell with hardcoded text labels for C4 elements.

### Shape styles:

Person (internal) — fillColor=#083F75; strokeColor=#06315C; shape=mxgraph.c4.person2; size 200x180
Person (external) — fillColor=#6C6477; strokeColor=#4D4D4D; shape=mxgraph.c4.person2; size 200x180
Container (app/service) — fillColor=#23A2D9; strokeColor=#0E7DAD; rounded=1; size 240x120
Container (database) — fillColor=#23A2D9; strokeColor=#0E7DAD; shape=cylinder3; size 240x120
Container (microservice) — fillColor=#23A2D9; strokeColor=#0E7DAD; shape=hexagon; size 200x170
Container (message bus) — fillColor=#23A2D9; strokeColor=#0E7DAD; shape=cylinder3 direction=south; size 240x120
Container (web browser) — fillColor=#23A2D9; shape=mxgraph.c4.webBrowserContainer2; size 240x160
External Software System — fillColor=#8C8496; strokeColor=#736782; rounded=1; size 240x120
ContainerScopeBoundary — fillColor=none; strokeColor=#666666; dashed=1; dashPattern=8 4

### Relationship style:
endArrow=blockThin; endFill=1; strokeColor=#828282; edgeStyle=orthogonalEdgeStyle
Use c4Description + c4Technology on all relationships.

## C4 Level 2 rules

Include ONLY:
- People/actors OUTSIDE the boundary
- Internal containers INSIDE the ContainerScopeBoundary
  - Layer order top→bottom: UI → API → Services → Data
- External systems OUTSIDE the boundary (right/below)

CRITICAL: External systems (payment, notifications, etc.) must be OUTSIDE the boundary.

Do NOT include: components, code detail, infrastructure annotations.

## Layout
- Canvas: pageWidth=1600 pageHeight=1200
- Boundary centred; actors left; external systems right
- All connectors: orthogonalEdgeStyle; arrow direction consumer→provider
- Every relationship must carry c4Description and c4Technology

## Output

Return only the content of:
docs/03_architecture/diagrams/src/c4_container.drawio

The file must be valid mxfile XML, fully editable in draw.io 29+.

## Connector crossing avoidance

Before finalising coordinates, apply this layout strategy:

1. Stack actors vertically on the left — one actor per row, aligned with the UI container it connects to. Connectors flow straight right, no crossings.
2. Stack external systems vertically on the right — each at the same vertical level as the service that calls it. Connectors flow straight right, no crossings.
3. Inside the boundary, all vertical flows go straight down: UI (top) → API → Services → Data (bottom). Connectors exit bottom-centre (exitY=1) and enter top-centre (entryY=0).
4. Use explicit exit/entry points on every connector:
   - Downward: exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0
   - Rightward: exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0
5. If a crossing cannot be avoided structurally, add waypoints:
   <mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="X" y="Y"/></Array></mxGeometry>
6. As a last resort, add jumpStyle=arc;jumpSize=16; to the crossing connector's style.

Never let two connectors cross without a jump arc. Prefer structural avoidance over jump arcs.
