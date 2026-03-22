---
id: requirements-inventory
name: Requirements Inventory
description: Generate, evaluate, patch, and recheck a Requirements Inventory from a BRD and related project artifacts.
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
    title: "Patch Requirements Inventory"
    prompt: "IssueIds to patch (comma-separated), e.g. INV-BRD-001"
    placeholder: "INV-BRD-001"
---

Use this skill when the user asks to:
- extract requirements from a BRD
- create or regenerate the requirements inventory
- update the requirements inventory directly
- review the existing requirements inventory
- identify gaps, duplicates, ambiguity, or misclassification in requirements
- patch or improve the requirements inventory
- answer structured questions about requirements categories, actors, systems, data, constraints, and non-functional intents

## Goal

Produce and maintain a structured Requirements Inventory artifact for the Solution Outline methodology.

## Canonical workspace locations

Primary source artifacts:
- `docs/00_brd/`
- `docs/98_discussions/`
- `docs/99_references/`

Primary output artifact:
- `docs/01_requirements/requirements.inventory.md`

Evaluation and QA reports:
- `docs/reports/inventory_inconsistencies/`

## Context loading policy

Load only the minimum relevant context.

### For extraction
Load:
- BRD files from `docs/00_brd/`
- supporting discussions from `docs/98_discussions/` if relevant
- supporting references from `docs/99_references/` if relevant

Do not use downstream artifacts as authoritative source during extraction.

### For evaluation
Load:
- `docs/01_requirements/requirements.inventory.md`
- BRD files from `docs/00_brd/`
- supporting discussions or references only if needed for traceability

### For patching
Load:
- current `docs/01_requirements/requirements.inventory.md`
- latest inconsistency report from `docs/reports/inventory_inconsistencies/`
- BRD files from `docs/00_brd/`

### For recheck
Load:
- patched `docs/01_requirements/requirements.inventory.md`
- latest inconsistency report
- BRD files from `docs/00_brd/`

Exclude by default:
- `docs/build/`
- unrelated generated deliverables from later phases unless the user explicitly asks for cross-checking

## Requirement taxonomy

Classify extracted inventory items only into these categories:
- Business Capability
- Business Flow / Scenario
- Actor / Stakeholder
- System / Interface
- Data / Information
- Constraint / Policy
- Non-Functional Intent
- Risk / Open Point

Do not invent new taxonomy labels unless the user explicitly changes the methodology.

## Standard workflow

Follow this deterministic pipeline when the user asks to create or regenerate the inventory:

1. Extract
2. Evaluate
3. Patch
4. Recheck

If the user asks only a targeted question about requirements, do not regenerate the artifact automatically if a valid inventory already exists. Use the existing inventory as the primary knowledge source.

## Step 1 — Extract

Create or refresh `docs/01_requirements/requirements.inventory.md` from the BRD.

Rules:
- derive only from provided artifacts
- do not introduce unsupported scope
- keep wording precise and implementation-neutral
- preserve traceability back to BRD intent
- group related items coherently
- avoid duplicate inventory items

## Step 2 — Evaluate

Create an inconsistency report under:
- `docs/reports/inventory_inconsistencies/latest.md`

Check for:
1. Missing inventory item
2. Ambiguous description
3. Duplicate items
4. Misclassification
5. Unsupported scope

Each finding must include:
- finding id
- category
- short description
- affected inventory item
- rationale
- recommended minimal correction

## Step 3 — Patch

Apply only the minimal changes required to fix the reported issues.

Rules:
- fix only reported issues
- do not expand scope unless explicitly requested
- preserve valid existing content
- keep naming and structure consistent

Update:
- `docs/01_requirements/requirements.inventory.md`

## Step 4 — Recheck

Re-evaluate the patched inventory against the BRD and the prior report.

Update:
- `docs/reports/inventory_inconsistencies/latest.md`

State clearly whether:
- all major issues are resolved
- minor issues remain
- manual review is recommended

## Response style

When answering the user:
- be structured and concise
- explicitly state whether you are extracting, evaluating, patching, rechecking, or answering from the existing inventory
- mention the files used as context
- mention the artifact(s) updated

## Direct Q&A mode

If the user asks questions such as:
- “what are the integration requirements?”
- “which actors are involved?”
- “what NFR intents are identified?”
- “which systems are in scope?”

then:
1. load `docs/01_requirements/requirements.inventory.md` if it exists
2. answer from the inventory first
3. fall back to BRD only if the inventory is missing or clearly outdated
4. suggest regeneration only when necessary
