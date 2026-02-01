workspace "My Workspace" "Ένα παράδειγμα συστήματος σε C4" {

    model {
        user = person "Χρήστης" "Ένας πελάτης της υπηρεσίας μας."
        
        softwareSystem = softwareSystem "E-Banking System" "Επιτρέπει στους χρήστες να βλέπουν το υπόλοιπό τους." {
            webapp = container "Web Application" "Παρέχει τη διεπαφή χρήστη." "React"
            database = container "Database" "Αποθηκεύει τα δεδομένα χρηστών." "PostgreSQL" "Database"
        }

        # Σχέσεις (Relationships)
        user -> webapp "Χρησιμοποιεί"
        webapp -> database "Διαβάζει/Γράφει σε"
    }

    views {
        # System Context Diagram
        systemContext softwareSystem "SystemContext" {
            include *
            autoLayout
        }

        # Container Diagram
        container softwareSystem "Containers" {
            include *
            autoLayout
        }

        styles {
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}