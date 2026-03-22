---
name: architecture-decision-records
description: Generate, evaluate, patch, and recheck Architecture Decision Records (ADRs) derived from Objectives, diagrams, and the Solution Outline.
---

# Architecture Decision Records Skill

Use this skill when the user asks to:
- create an architecture decision record
- document an architecture decision
- explain architectural rationale
- evaluate ADR quality or completeness
- update or patch an ADR
- recheck ADR consistency

## Purpose

This skill manages the lifecycle of Architecture Decision Records (ADRs).

ADRs capture significant architectural decisions including:
- system structure
- integration patterns
- technology selections
- data architecture decisions
- security and deployment constraints

ADRs ensure architectural decisions are:
- documented
- traceable
- reviewable
- explainable

## Workspace artifacts

Inputs:
- `docs/01_requirements/requirements.inventory.md`
- `docs/02_objectives/objectives.md`
- `docs/03_architecture/diagrams/src/*.dsl`
- `docs/03_architecture/solution_outline.md`

ADR artifacts:
- `docs/04_decisions/ADR-*.md`

Evaluation reports:
- `docs/reports/adr_inconsistencies/<adr_id>/latest.md`

## Supported operations

### Generate
Create a new ADR based on architectural decisions implied by the Solution Outline and diagrams.

### Evaluate
Check ADR completeness, consistency, and architectural quality.

### Patch
Apply minimal corrections based on the evaluation report.

### Recheck
Re-run ADR evaluation after patching.

### Query
Answer questions about architecture decisions and rationale.

## Example requests

- Create ADR for integration pattern
- Create ADR for API gateway decision
- Generate ADR for event-driven architecture
- Evaluate ADR-001
- Patch ADR-002
- Recheck ADR-001
- Why was this architecture decision taken?
