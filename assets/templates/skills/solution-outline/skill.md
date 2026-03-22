---
id: solution-outline
name: Solution Outline
description: Generate, evaluate, patch, recheck, and final-review the Solution Outline document derived from Objectives and validated Structurizr DSL diagrams.
participant: so

operations:
  generate: {}
  eval: {}
  update: {}
  patch:
    requiresIssueIds: true
  recheck: {}

inputs:
  issueIds:
    forOperations: [patch]
    type: text
    title: "Patch Solution Outline"
    prompt: "IssueIds to patch (comma-separated), e.g. SO-001"
    placeholder: "SO-001"
---

Use this skill when the user asks to:
- generate the solution outline
- create or update the solution outline document
- evaluate the solution outline
- patch solution outline inconsistencies
- recheck the solution outline after patching
- perform final review of the solution outline against the requirements inventory
- answer questions about architecture scope, systems, integrations, and solution structure

## Purpose

This skill manages the lifecycle of the Solution Outline document.

It derives the Solution Outline strictly from:
- `docs/02_objectives/objectives.md`
- validated architecture diagrams in Structurizr DSL
- the approved Solution Outline template

It ensures:
- correct section population
- consistency with Objectives and diagrams
- no unsupported scope or design leakage
- traceable final coverage against the Requirements Inventory

## Workspace artifacts

Authoritative inputs:
- `docs/02_objectives/objectives.md`
- `docs/03_architecture/diagrams/src/c4_context.dsl`
- `docs/03_architecture/diagrams/src/c4_container.dsl`

Primary artifact:
- `docs/03_architecture/solution_outline.md`

Evaluation reports:
- `docs/reports/solution_outline_inconsistencies/latest.md`
- `docs/reports/solution_outline_final_review/latest.md`

## Supported operations

### Generate
Create or update the Solution Outline from Objectives and validated diagrams.

### Evaluate
Evaluate correctness, completeness, and consistency of the Solution Outline.

### Patch
Apply minimal corrections based on the latest inconsistency report.

### Recheck
Re-run the evaluation after patching.

### Final Review
Validate final coverage of the Solution Outline against the Requirements Inventory.

### Query
Answer structured questions using the Solution Outline as the primary source.

## Example requests

- Generate the solution outline
- Evaluate the solution outline
- Patch solution outline issues
- Recheck the solution outline
- Final review the solution outline
- What systems are described in the solution outline?
- What integrations are covered?
- Which diagrams support this section?
