# Diagrams Methodology

Diagrams are derived architecture artifacts expressed in Structurizr DSL.

They must be generated strictly from the authoritative workspace artifacts:
- Requirements Inventory
- Objectives
- Diagram registry

Diagrams must:
- respect the intended C4 abstraction level
- remain faithful to the documented scope
- be readable and minimal
- avoid unsupported design and implementation detail

Diagrams must not:
- invent actors, systems, containers, or integrations
- introduce unsupported technologies
- silently resolve ambiguity not already addressed in authoritative artifacts

All diagram changes follow this lifecycle:
Generate → Evaluate → Patch → Recheck