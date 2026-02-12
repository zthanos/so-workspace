workspace "Test System" "A simple test workspace" {

    model {
        user = person "User" "A user of the system"
        softwareSystem = softwareSystem "Software System" "The software system" {
            webapp = container "Web Application" "Provides functionality to users" "React"
            api = container "API" "Provides REST API" "Node.js"
            database = container "Database" "Stores data" "PostgreSQL"
        }
        
        user -> webapp "Uses"
        webapp -> api "Makes API calls to"
        api -> database "Reads from and writes to"
    }

    views {
        systemContext softwareSystem "SystemContext" {
            include *
            autoLayout
        }
        
        container softwareSystem "Containers" {
            include *
            autoLayout
        }
        
        theme default
    }
}
