You are in EXECUTION mode.

Create or update the file:
docs/03_architecture/diagrams/src/c4_container.dsl

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md
- docs/03_architecture/diagrams/src/c4_context.dsl (for context)

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
- Structurizr DSL (native C4 format)
- The diagram must be renderable as-is (no placeholders).
- Keep the diagram minimal and readable (no extra elements).
- Include technology choices where appropriate (e.g., "React", "Node.js", "PostgreSQL").

Structurizr DSL Structure:
```
workspace "Workspace Name" "Workspace Description" {
    model {
        # Define people (actors)
        identifier = person "Name" "Description"
        
        # Define software system with containers
        identifier = softwareSystem "Name" "Description" {
            # Define containers within the system
            containerIdentifier = container "Name" "Description" "Technology"
        }
        
        # Define external systems with External tag
        identifier = softwareSystem "Name" "Description" {
            tags "External"
        }
        
        # Define relationships
        source -> destination "Description"
        source -> destination "Description" "Technology"
    }
    
    views {
        container softwareSystemIdentifier "ViewKey" {
            include *
            autoLayout
        }
    }
}
```

Structurizr DSL Syntax Rules:
- Use camelCase for all identifiers (e.g., player, webApp, apiGateway)
- Enclose names and descriptions in double quotes
- Container format: identifier = container "Name" "Description" "Technology"
- Technology is the fourth parameter for containers (e.g., "React", "Node.js", "PostgreSQL")
- Use "tags External" for external systems
- Relationship format: source -> destination "description"
- For technical relationships, include protocol: source -> destination "description" "HTTPS/JSON"
- Include a container view with "include *" and "autoLayout"

Example Container Diagram:
```
workspace "Sports Booking Platform" "Architecture documentation for the Sports Booking Platform" {
    
    model {
        player = person "Player" "Discovers and books activities"
        coach = person "Coach" "Creates and manages activities"
        venueOperator = person "Venue Operator" "Manages venues"
        platformAdmin = person "Platform Administrator" "Administers platform"
        
        sportsPlatform = softwareSystem "Sports Booking Platform" "Central platform for activity management" {
            webApp = container "Web Application" "Browser-based UI for discovery and booking" "React"
            mobileApp = container "Mobile Application" "Native mobile apps" "iOS / Android"
            apiGateway = container "API Gateway" "Public HTTP API surface" "REST API"
            appServices = container "Application Services" "Business logic for activities and bookings" "Node.js"
            database = container "Database" "Persistent storage" "PostgreSQL"
        }
        
        paymentProvider = softwareSystem "Payment Provider" "External payment processing" {
            tags "External"
        }
        notificationService = softwareSystem "Notification Service" "External notifications" {
            tags "External"
        }
        
        player -> webApp "Use to discover and book"
        player -> mobileApp "Use to discover and book"
        coach -> webApp "Create and manage activities"
        venueOperator -> webApp "Manage venues"
        platformAdmin -> webApp "Platform administration"
        
        webApp -> apiGateway "Calls API" "HTTPS/JSON"
        mobileApp -> apiGateway "Calls API" "HTTPS/JSON"
        apiGateway -> appServices "Routes requests" "HTTPS/JSON"
        appServices -> database "Reads/writes" "SQL"
        appServices -> paymentProvider "Process payments" "HTTPS"
        appServices -> notificationService "Send notifications" "HTTPS"
    }
    
    views {
        container sportsPlatform "Container" {
            include *
            autoLayout
        }
    }
}
```

Return only the content of:
docs/03_architecture/diagrams/src/c4_container.dsl
