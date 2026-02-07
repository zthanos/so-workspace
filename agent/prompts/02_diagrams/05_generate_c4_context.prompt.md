You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_context.puml

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md

Purpose:
Generate a C4 Model Level 1 (System Context) diagram for the target platform,
strictly based on validated Objectives + Requirements Inventory.

Diagram rules:
- Produce a System Context diagram (C4 Level 1) only.
- Do NOT create containers, components, or sequences.
- Do NOT introduce technologies (microservices, cloud services, protocols, databases).
- Include only actors and external systems explicitly supported by the inventory/objectives.
- Use concise, business-oriented labels and responsibilities.

Required content:
1) People (actors):
- Player
- Coach
- Venue Operator
- Platform Administrator

2) System of Interest:
- Sports Booking Platform (the platform being built)

3) External Systems:
- Payment Provider (external)
- Notification Service (external)

Relationships:
- Player uses platform to discover and book lessons/matches/tournaments.
- Coach uses platform to create/publish activities and manage participation.
- Venue Operator uses platform to manage venues and availability.
- Platform Administrator manages platform configuration/oversight.
- Platform integrates with Payment Provider for optional payments.
- Platform integrates with Notification Service for booking/change/cancellation notifications.

Output format:
- PlantUML using C4-PlantUML (include the library).
- The diagram must be renderable as-is (no placeholders).
- Keep the diagram minimal and readable (no extra elements).

Return only the content of:
docs/03_architecture/diagrams/src/c4_context.puml
