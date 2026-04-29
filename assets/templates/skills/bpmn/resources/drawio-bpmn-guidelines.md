# draw.io BPMN 2.0 Guidelines

Use these rules when generating BPMN 2.0 diagrams in draw.io XML.

## Critical rules

- Use BPMN-specific shapes for events and gateways; do not fall back to generic ellipse or diamond semantics
- Keep sequence flow inside a single pool only
- Use message flow only between pools
- Use pools for participant boundaries and lanes for responsibility boundaries
- Label outgoing flows from exclusive and inclusive gateways
- Preserve editable draw.io XML structure

## Core semantics

- Events and gateways must use BPMN-specific shapes, not generic ellipses or diamonds
- Sequence flow is valid only inside one pool
- Message flow is valid only between pools
- Inter-participant processes should use pools, and lanes when role separation matters
- Exclusive and inclusive gateway outgoing branches should be labeled

## Element expectations

### Events
- use BPMN event semantics for start, intermediate, and end events
- preserve event sizing consistency
- place start events near the process entry and end events near completion/termination points
- use BPMN-aware connection behavior so event edges attach cleanly to the boundary

### Activities
- keep tasks business-oriented
- label them with verb-noun phrasing
- keep subprocesses visually distinct when used

### Gateways
- use the correct gateway type for exclusive, parallel, inclusive, or event-based behavior
- never use a blank generic diamond
- label conditional outgoing branches except for parallel split branches
- keep gateway branching visually compact and easy to follow

### Pools and lanes
- use a pool for each participating organization or major participant boundary
- use lanes for roles or responsibility partitions inside a participant
- model cross-pool communication with message flows only
- keep BPMN elements inside their owning pool or lane containers

### Connectors
- sequence flow: solid directional flow within a pool
- message flow: dashed/open style between pools
- keep arrow direction aligned with process semantics
- do not route a sequence flow across a pool boundary
- keep connector labels readable and close to the relevant branch

## draw.io style expectations

- BPMN event and gateway elements should use BPMN-aware draw.io shape semantics rather than generic flowchart styles
- pool and lane elements should behave as true containers
- message flows should be visually distinct from sequence flows
- BPMN XML should remain editable and stable after regeneration or patching

## Visual quality

- align process flow left-to-right unless the process clearly reads better top-to-bottom
- keep spacing consistent
- minimize crossings through layout first, not styling tricks
- keep labels inside shapes or on edges where expected
