# draw.io C4 Layout Patterns

Use these patterns when generating or updating C4 diagrams in draw.io.

## Context Diagram Pattern

- Place the system of interest in the visual center.
- Place primary actors on the left or upper-left.
- Place external systems on the right or lower-right.
- Keep relationship flow mostly left-to-right.
- Use a single system boundary around the system of interest only.
- Preferred default coordinates:
  - boundary at roughly `x=540 y=150 w=500 h=520`
  - system at roughly `x=670 y=350 w=240 h=120`
  - actor column at `x=120`
  - external system column at `x=1100`
  - title block at the bottom-left page edge, not underneath actors
- When there are 4 actors, stack them vertically and leave at least 10-20px gap between actor boxes.
- When there are 2 external systems, stack them vertically with a clear vertical gap and keep both fully outside the boundary.
- Do not let the boundary label, title block, or relationship labels overlap any actor shape.

## Container Diagram Pattern

- Use one boundary for the software system.
- Inside the boundary, arrange containers in layers:
  1. UI
  2. API / Gateway
  3. Services
  4. Data / Messaging
- Put actors outside the boundary on the left.
- Put external systems outside the boundary on the right.
- Keep databases and buses on the lowest layer unless a stronger domain reason exists.

## Spacing and Alignment

- Snap all coordinates to a 10px grid.
- Keep horizontal gaps >= 80px.
- Keep vertical gaps >= 60px.
- Keep boundary padding >= 40px.
- Align peer containers to a shared baseline.
- Avoid “stair-step” layouts when a clean row or column is possible.

## Relationship Routing

- Use orthogonal connectors only.
- Prefer straight horizontal or vertical segments.
- Route actor-to-system links from actor right edge to system left edge.
- Route internal top-down flows from bottom center to top center.
- Route external service calls from right edge to left edge.
- Use waypoints only when they improve clarity.

## Title and Reading Order

- Add a title block at the lower-left or upper-left edge of the page.
- Ensure the diagram can be read in a predictable order:
  - actors
  - system boundary
  - externals
- Avoid decorative elements that compete with the architecture content.
