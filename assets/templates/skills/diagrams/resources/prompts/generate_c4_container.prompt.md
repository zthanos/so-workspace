You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_container.drawio

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md
- docs/03_architecture/diagrams/src/c4_context.drawio (for context, if present)

Load and follow these resources before generating:
- resources/drawio-c4-guidelines.md
- resources/drawio-c4-layout-patterns.md
- resources/drawio-c4-anti-patterns.md
- resources/drawio-xml-integrity.md
- resources/drawio-c4-examples.md

Purpose:
Generate a C4 Model Level 2 (Container) diagram using the official draw.io C4 shape
library with placeholders=1 and c4Name/c4Type/c4Technology/c4Description metadata attributes.

## Key rules

SHAPES: Use <object placeholders="1" ...> wrappers with c4* attributes and %placeholder% labels.
DO NOT use plain mxCell with hardcoded text labels for C4 elements.
Use only approved C4 stencil families from the guidance resources.

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

### Label discipline:
- Use a 3-line C4 label pattern through placeholders:
  - line 1: c4Name
  - line 2: [c4Type: c4Technology] when technology is known
  - line 3: c4Description
- Labels must remain inside shapes and be readable at normal zoom.
- Do not place descriptive text outside the container shape.

## C4 Level 2 rules

Include ONLY:
- People/actors OUTSIDE the boundary
- Internal containers INSIDE the ContainerScopeBoundary
  - Layer order top→bottom: UI → API → Services → Data
- External systems OUTSIDE the boundary (right/below)

CRITICAL: External systems (payment, notifications, etc.) must be OUTSIDE the boundary.

Do NOT include: components, code detail, infrastructure annotations.
Do NOT mix component-level detail into a container diagram.

## Layout
- Canvas: pageWidth=1600 pageHeight=1200
- Boundary centred; actors left; external systems right
- All connectors: orthogonalEdgeStyle; arrow direction consumer→provider
- Every relationship must carry c4Description and c4Technology
- Follow the container-diagram placement pattern from resources/drawio-c4-layout-patterns.md
- Prefer clean left-to-right and top-to-bottom flow over dense packing

## Output

Return only the content of:
docs/03_architecture/diagrams/src/c4_container.drawio

The file must be valid mxfile XML, fully editable in draw.io 29+.
It must comply with the XML integrity rules and remain uncompressed/editable.

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

## Anti-patterns to avoid

- Do not use a generic rounded rectangle where a browser, database, microservice, or message-bus stencil is more appropriate.
- Do not place external systems inside the ContainerScopeBoundary.
- Do not omit c4Technology on container relationships when the interaction style is known.
- Do not route connectors diagonally.
