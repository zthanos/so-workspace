---
name: diagrams
description: Generate, evaluate, patch, recheck, and answer questions about Structurizr DSL architecture diagrams derived from Objectives and Requirements Inventory.
---

# Diagrams Skill

Use this skill when the user asks to:
- generate architecture diagrams
- create or update C4 context or container diagrams
- evaluate a diagram
- patch a diagram
- recheck a diagram after patching
- answer questions about actors, systems, containers, integrations, and relationships represented in the diagrams

## Purpose

This skill manages the lifecycle of architecture diagrams in Structurizr DSL format.

It derives diagrams strictly from:
- `docs/02_objectives/objectives.md`
- `docs/01_requirements/requirements.inventory.md`

It ensures:
- correct abstraction level
- alignment with workspace artifacts
- minimal and deterministic diagram content
- no unsupported design or technology leakage

## Registry

Supported diagrams are defined in:
- `docs/03_architecture/diagrams.registry.yml`

## Workspace artifacts

Authoritative inputs:
- `docs/02_objectives/objectives.md`
- `docs/01_requirements/requirements.inventory.md`

Registry:
- `docs/03_architecture/diagrams.registry.yml`

Diagram sources:
- `docs/03_architecture/diagrams/src/*.dsl`

Evaluation reports:
- `docs/reports/diagram_inconsistencies/<diagram_id>/latest.md`

## Supported operations

### Generate
Generate a supported diagram by `diagram_id`.

### Evaluate
Evaluate a selected diagram for level correctness, completeness, scope alignment, terminology consistency, and relationship validity.

### Patch
Apply minimal corrections to the selected diagram based on the latest inconsistency report.

### Recheck
Re-run the evaluation after patching.

### Query
Answer structured questions using the generated diagram and the authoritative artifacts.

## Example requests

- Generate diagram c4_context
- Generate diagram c4_container
- Evaluate diagram c4_context
- Patch diagram c4_container
- Recheck diagram c4_context
- Which actors appear in the context diagram?
- What containers are shown in the container diagram?
- What external systems are represented?