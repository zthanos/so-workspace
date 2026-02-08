You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_container.puml

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md
- docs/03_architecture/diagrams/src/c4_context.puml (for context)

Purpose:
Generate a C4 Model Level 2 (Container) diagram for the Sports Booking Platform,
strictly based on validated Objectives + Requirements Inventory.

Diagram rules:
- Produce a Container diagram (C4 Level 2) only.
- Show the internal containers/applications that make up the Sports Booking Platform.
- Do NOT create components or code-level details (that's Level 3).
- Include only technologies explicitly supported by the inventory/objectives.
- Use concise, technical labels and responsibilities.

Required content:
1) People (actors) - from Context diagram:
- Player
- Coach
- Venue Operator
- Platform Administrator

2) Containers within Sports Booking Platform:
- Web Application (Browser-based UI)
- Mobile Application (iOS/Android)
- API Gateway (REST API)
- Application Services (Business logic)
- Database (Data storage)

3) External Systems - from Context diagram:
- Payment Provider (external)
- Notification Service (external)

Relationships:
- Actors interact with Web Application and/or Mobile Application
- Web/Mobile Applications call API Gateway
- API Gateway routes to Application Services
- Application Services read/write to Database
- Application Services integrate with Payment Provider for payments
- Application Services integrate with Notification Service for notifications

Output format:
- PlantUML using C4-PlantUML (include the library).
- The diagram must be renderable as-is (no placeholders).
- Keep the diagram minimal and readable (no extra elements).
- Include technology choices where appropriate (e.g., "React", "Node.js", "PostgreSQL").

Return only the content of:
docs/03_architecture/diagrams/src/c4_container.puml
