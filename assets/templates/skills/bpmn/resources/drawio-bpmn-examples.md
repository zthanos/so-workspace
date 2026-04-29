# BPMN Examples

## Good task labels

- Submit Booking Request
- Validate Booking Details
- Approve Booking
- Notify Customer
- Handle Payment Failure

## Good branch labels

- seats available
- payment approved
- manual review required
- customer cancels

## Good participant structure

- Pool: Customer
- Pool: Booking Platform
- Pool: Payment Provider

Optional lanes inside Booking Platform:
- Sales Operations
- Booking Service
- Support Team

## Collaboration pattern example

For a cross-participant scenario such as session closure:

- Pool: Player
  - Task: Request Session Closure

- Pool: Coach
  - Task: Review Closure Request
  - Task: Confirm Session Closure

- Pool: Platform
  - Task: Record Session Closure
  - Task: Notify Player

Connector expectations:
- message flow: Player request -> Coach review
- message flow: Coach confirmation -> Platform record
- message flow: Platform notification -> Player receive outcome
- sequence flow only inside each pool
