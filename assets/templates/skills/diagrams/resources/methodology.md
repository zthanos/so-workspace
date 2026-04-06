# Diagrams Methodology

Diagrams are derived architecture artifacts expressed in the notation required by the selected diagram family.

For C4 diagrams, the default authoring format is draw.io XML.

They must be generated strictly from the authoritative workspace artifacts:
- Requirements Inventory
- Objectives
- Diagram registry

Diagrams must:
- respect the intended C4 or diagram abstraction level
- remain faithful to the documented scope
- be readable and minimal
- avoid unsupported design and implementation detail

Diagrams must not:
- invent actors, systems, containers, or integrations
- introduce unsupported technologies
- silently resolve ambiguity not already addressed in authoritative artifacts

All diagram changes follow this lifecycle:
Generate -> Evaluate -> Patch -> Recheck
