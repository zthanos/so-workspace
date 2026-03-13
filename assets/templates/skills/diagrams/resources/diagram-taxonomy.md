# Diagram Taxonomy

## C4 Level 1 — System Context
Allowed:
- People / actors
- System of interest
- External systems
- High-level relationships

Not allowed:
- Internal containers
- Components
- Databases as internal implementation detail
- Technologies, protocols, or deployment detail

## C4 Level 2 — Container
Allowed:
- People / actors
- System of interest
- Internal containers
- External systems
- Container-level relationships
- Neutral technology descriptors when necessary
- Explicit technologies only if supported by authoritative inputs

Not allowed:
- Components
- Code-level detail
- Deployment / infrastructure detail
- Unsupported technology assumptions

## Cross-cutting rules
- Names must align with Objectives and Requirements terminology
- Relationships must reflect documented interaction intent
- Ambiguities must not be silently resolved