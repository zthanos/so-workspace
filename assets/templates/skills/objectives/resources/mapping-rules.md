# Objectives Mapping Rules

Map Requirements Inventory content into Objectives sections as follows.

## 1. Business Context and Objectives
Source:
- Business Capability
- Non-Functional Intent

Rule:
Describe business intent and desired outcomes, not implementation.

## 2. Scope Definition
### In Scope
Source:
- Business Capability

### Out of Scope
Source:
- explicit exclusions implied by inventory constraints or gaps

Rule:
Do not invent exclusions.

## 3. Stakeholders
Source:
- Actor / Stakeholder

## 4. Teams Involvements
Source:
- Actor / Stakeholder
- System / Interface

Rule:
Only identify team involvement where ownership or participation is reasonably implied.
If unclear, state that ownership requires clarification.

## 5. Systems Identified
Source:
- System / Interface

Rule:
Describe systems logically, without implementation detail.

## 6. Functional Requirements (as Objectives)
Source:
- Business Capability

Rule:
Transform each capability into one or more functional objectives while preserving intent.

## 7. Non-Functional Requirements
Source:
- Non-Functional Intent
- Constraint / Policy

Rule:
Do not invent metrics or thresholds unless explicitly present.

## 8. High-Level Flows
Source:
- Business Flow / Scenario

Rule:
Describe business-level or logical flows only.

## 9. Integrations & Data Flow (High Level)
Source:
- System / Interface
- Data / Information

Rule:
Describe interaction intent and logical data movement, not technical implementation.

## 10. Security Considerations
Source:
- Constraint / Policy
- Non-Functional Intent related to security, privacy, access, compliance

## 11. Assumptions and Constraints
### Assumptions
Source:
- inventory notes
- unresolved gaps
- ambiguous ownership or undefined details

### Constraints
Source:
- Constraint / Policy

## 12. Risks and Questions
Source:
- Risk / Open Point

Rule:
Do not resolve the risks or questions. Record them clearly.