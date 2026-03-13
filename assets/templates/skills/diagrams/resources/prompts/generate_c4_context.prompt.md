You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_context.dsl

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
- Structurizr DSL (native C4 format)
- The diagram must be renderable as-is (no placeholders).
- Keep the diagram minimal and readable (no extra elements).

Structurizr DSL Structure:
```
workspace "Workspace Name" "Workspace Description" {
    model {
        # Define people (actors)
        identifier = person "Name" "Description"
        
        # Define software systems
        identifier = softwareSystem "Name" "Description"
        
        # Define external systems with External tag
        identifier = softwareSystem "Name" "Description" {
            tags "External"
        }
        
        # Define relationships
        source -> destination "Description"
    }
    
    views {
        systemContext softwareSystemIdentifier "ViewKey" {
            include *
            autoLayout
        }
    }
}
```

Structurizr DSL Syntax Rules:
- Use camelCase for all identifiers (e.g., player, sportsPlatform, paymentProvider)
- Enclose names and descriptions in double quotes
- Use "tags External" for external systems
- Relationship format: source -> destination "description"
- Include a systemContext view with "include *" and "autoLayout"

Example Context Diagram:
```
workspace "Sports Booking Platform" "Architecture documentation for the Sports Booking Platform" {
    
    model {
        player = person "Player" "Discovers and books activities such as lessons, matches, and tournaments"
        coach = person "Coach" "Creates and publishes activities and manages participant enrollment"
        
        sportsPlatform = softwareSystem "Sports Booking Platform" "Central platform for activity discovery, booking, and management"
        
        paymentProvider = softwareSystem "Payment Provider" "External payment processing services" {
            tags "External"
        }
        
        player -> sportsPlatform "Discover and book activities"
        coach -> sportsPlatform "Create and manage activities"
        sportsPlatform -> paymentProvider "Process payments"
    }
    
    views {
        systemContext sportsPlatform "SystemContext" {
            include *
            autoLayout
        }
    }
}
```

Return only the content of:
docs/03_architecture/diagrams/src/c4_context.dsl
