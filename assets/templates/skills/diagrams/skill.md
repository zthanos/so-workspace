---
id: diagrams
name: Diagrams
description: Create, refine, evaluate, and correct architecture and supporting diagrams derived from the current workspace artifacts.
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
    title: "Patch Diagram"
    prompt: "IssueIds to patch, e.g. DIAG-001"
    placeholder: "DIAG-001"

quickPick:
  paramName: diagram_id
  title: "Select Diagram"
  forOperations: [generate, eval, patch, recheck]
  options:
    - value: c4_context
      label: "C4 Context Diagram"
    - value: c4_container
      label: "C4 Container Diagram"
    - value: flow
      label: "Flow Diagram"
    - value: sequence
      label: "Sequence Diagram"
    - value: state
      label: "State Diagram"

diagramCatalog:
  - id: c4_context
    labels:
      - "c4 context"
      - "context diagram"
      - "system context"
      - "c4 level 1"
    notation: structurizr_dsl
    family: c4
    outputPath: "docs/03_architecture/diagrams/src/c4_context.dsl"
    promptKey: "generate_c4_context"
    evaluatePromptKey: "evaluate_structurizr"
    patchPromptKey: "patch_structurizr"
    recheckPromptKey: "recheck_structurizr"

  - id: c4_container
    labels:
      - "c4 container"
      - "container diagram"
      - "c4 level 2"
    notation: structurizr_dsl
    family: c4
    outputPath: "docs/03_architecture/diagrams/src/c4_container.dsl"
    promptKey: "generate_c4_container"
    evaluatePromptKey: "evaluate_structurizr"
    patchPromptKey: "patch_structurizr"
    recheckPromptKey: "recheck_structurizr"

  - id: flow
    labels:
      - "flow diagram"
      - "process flow"
      - "workflow diagram"
      - "business flow diagram"
    notation: mermaid
    family: flow
    outputPath: "docs/03_architecture/diagrams/src/flow.mmd"
    promptKey: "generate_mermaid_flow"
    evaluatePromptKey: "evaluate_mermaid"
    patchPromptKey: "patch_mermaid"
    recheckPromptKey: "recheck_mermaid"

  - id: sequence
    labels:
      - "sequence diagram"
      - "interaction sequence"
      - "message flow"
    notation: mermaid
    family: sequence
    outputPath: "docs/03_architecture/diagrams/src/sequence.mmd"
    promptKey: "generate_mermaid_sequence"
    evaluatePromptKey: "evaluate_mermaid"
    patchPromptKey: "patch_mermaid"
    recheckPromptKey: "recheck_mermaid"

  - id: state
    labels:
      - "state diagram"
      - "state machine"
      - "lifecycle diagram"
    notation: mermaid
    family: state
    outputPath: "docs/03_architecture/diagrams/src/state.mmd"
    promptKey: "generate_mermaid_state"
    evaluatePromptKey: "evaluate_mermaid"
    patchPromptKey: "patch_mermaid"
    recheckPromptKey: "recheck_mermaid"
---

# Diagrams Skill

Use this skill when the user asks to:
- create a diagram from the current architecture understanding
- refine an existing diagram
- evaluate diagram quality or correctness
- patch diagram issues
- recheck a diagram after corrections
- visualize flows, interactions, states, or architecture scope

## Purpose

This skill supports collaborative diagram authoring across the Solution Outline lifecycle.

It helps the architect:
- express the current understanding more clearly
- keep diagrams aligned with workspace artifacts
- improve diagram quality and consistency
- apply quick corrections after discussions, meetings, or design changes

This skill is not intended to invent architecture.
It works strictly from the currently available workspace artifacts and the user’s prompt.

## Supported diagram families

### C4 / Structurizr DSL
Used for architecture-level modeling:
- C4 Context
- C4 Container

### Mermaid
Used for lightweight supporting diagrams:
- Flow diagrams
- Sequence diagrams
- State diagrams

## Diagram selection model

Primary selection should come from the user's prompt.

Examples:
- "Create a flow diagram for the OCR ingestion process"
- "Create a C4 context diagram for the platform"
- "Update the sequence diagram for login"

If the requested diagram type is not clear, fallback to the configured QuickPick.

## Authoritative workspace artifacts

Primary sources:
- `docs/01_requirements/requirements.inventory.md`
- `docs/02_objectives/objectives.md`
- `docs/03_architecture/solution_outline.md`

Diagram outputs:
- `docs/03_architecture/diagrams/src/*.dsl`
- `docs/03_architecture/diagrams/src/*.mmd`

Reports:
- `docs/reports/diagram_inconsistencies/<diagram_id>/latest.md`

## Context loading policy

### Generate
Load the minimum relevant architecture context from:
- Requirements Inventory
- Objectives
- Solution Outline

### Evaluate
Load:
- selected diagram source
- relevant architecture artifacts

### Patch
Load:
- selected diagram source
- latest inconsistency report
- relevant architecture artifacts

### Recheck
Load:
- patched diagram source
- relevant architecture artifacts

## Quality principles

All diagrams must:
- reflect the currently known architecture only
- avoid unsupported assumptions
- remain readable and minimal
- use consistent naming
- preserve the correct abstraction level
- be easy to refine after discussions and design changes

## Structurizr DSL rules

Use Structurizr DSL for:
- C4 Context
- C4 Container

Do not introduce unsupported internal detail.
Keep the selected C4 level clean and correct.

## Mermaid rules

Use Mermaid for:
- flow diagrams
- sequence diagrams
- state diagrams

Generate valid Mermaid syntax.
Prefer readability over compactness.
Keep labels short and meaningful.
Avoid unnecessary complexity.

## Example requests

- Create a C4 context diagram for the current solution
- Create a C4 container diagram from the objectives
- Create a flow diagram for the onboarding process
- Create a sequence diagram for the API interaction
- Evaluate the current flow diagram
- Patch the sequence diagram issues
- Recheck the C4 context diagram after updates