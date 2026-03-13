---
id: objectives
name: Objectives
description: Generate, evaluate, patch, recheck, and answer questions about the Solution Outline Objectives document derived from the Requirements Inventory.
participant: so

operations:
  generate: {}
  eval: {}
  patch:
    requiresIssueIds: true
  recheck: {}

inputs:
  issueIds:
    forOperations: [patch]
    type: text
    title: "Patch Objectives"
    prompt: "IssueIds to patch (comma-separated), e.g. CONS-02"
    placeholder: "CONS-02"
---

Use this skill when the user asks to:
- generate objectives from the requirements inventory
- create the Solution Outline Objectives document
- evaluate objectives inconsistencies
- patch objectives issues
- recheck objectives after patching
- answer questions about objectives, systems, stakeholders, scope, assumptions, constraints, integrations, and high-level flows

## Purpose

This skill manages the lifecycle of the **Solution Outline Objectives** artifact.

It derives architectural intent from the validated Requirements Inventory and ensures:
- consistency with requirements
- controlled scope
- correct placement of content
- explicit handling of assumptions, constraints, risks, and questions

## Workspace artifacts

Authoritative input:
- `docs/01_requirements/requirements.inventory.md`

Primary output:
- `docs/02_objectives/objectives.md`

Evaluation reports:
- `docs/reports/objectives_inconsistencies/latest.md`
- `docs/reports/objectives_inconsistencies/*.md`

## Supported operations

### Generate
Create or update the Objectives document from the Requirements Inventory.

### Evaluate
Evaluate consistency, completeness, and scope alignment between the Requirements Inventory and Objectives.

### Patch
Apply minimal corrections to the Objectives document based on the latest inconsistency report.

### Recheck
Re-evaluate the patched Objectives document using the same evaluation criteria.

### Query
Answer structured questions using `docs/02_objectives/objectives.md` as the primary source.

## Context loading policy

### Generate
Load:
- `docs/01_requirements/requirements.inventory.md`

### Evaluate
Load:
- `docs/01_requirements/requirements.inventory.md`
- `docs/02_objectives/objectives.md`

### Patch
Load:
- `docs/reports/objectives_inconsistencies/latest.md`
- `docs/02_objectives/objectives.md`
- `docs/01_requirements/requirements.inventory.md`

### Recheck
Load:
- `docs/02_objectives/objectives.md`
- `docs/01_requirements/requirements.inventory.md`

### Query
Load:
- `docs/02_objectives/objectives.md`

Fallback only if necessary:
- `docs/01_requirements/requirements.inventory.md`

## Example requests

- Generate objectives from the requirements inventory
- Create the Solution Outline Objectives document
- Evaluate the objectives document
- Patch objectives inconsistencies
- Recheck the objectives document
- What systems are identified in the objectives?
- What assumptions are captured?
- What are the high-level flows?
- Which stakeholders are involved?
- What integrations are described?