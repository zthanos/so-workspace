# draw.io C4 Examples

Use these as pattern references, not as domain content to copy blindly.

## Context Example Pattern

- One central internal software system
- 2-4 actors around it
- 1-3 external systems on the right
- Short relationship labels such as:
  - `Uses`
  - `Books activities with`
  - `Processes payment via`
  - `Sends notifications via`

## Container Example Pattern

- Left: actors
- Center boundary:
  - top row: Web App / Mobile App
  - second row: API Gateway
  - third row: Application Services
  - bottom row: Database / Message Bus
- Right: external systems such as Payment Provider or Notification Service

## Label Examples

- Person:
  - `Player`
  - `[Person]`
  - `Discovers and books activities`

- Internal system:
  - `Sports Booking Platform`
  - `[Software System]`
  - `Coordinates booking, scheduling, and related interactions`

- Container:
  - `Application Services`
  - `[Container: Node.js]`
  - `Implements booking, scheduling, and business rules`

- Database:
  - `Platform Database`
  - `[Container: PostgreSQL]`
  - `Stores bookings, users, venues, and schedules`
