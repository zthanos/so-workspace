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


## Diagram generation

### Mermaid diagrams

When generating Mermaid diagrams:
- Use `graph TD` or `graph LR` for flow diagrams
- Use `sequenceDiagram` for sequence diagrams
- Use `stateDiagram-v2` for state diagrams
- Place output in `docs/03_architecture/diagrams/src/*.mmd`
- Keep node labels short and descriptive
- Use subgraphs to group related components
- Prefer `TD` (top-down) layout unless horizontal flow is more natural

### PlantUML diagrams

When generating PlantUML diagrams:
- Use `@startuml` / `@enduml` delimiters
- Use component, deployment, or activity diagram types as appropriate
- Place output in `docs/03_architecture/diagrams/src/*.puml`
- Use stereotypes and packages to organize elements
- Keep styling minimal — rely on default PlantUML themes

### Structurizr DSL diagrams

When generating Structurizr DSL diagrams:
- Use `workspace` as the top-level block
- Define `model` and `views` sections
- Use `softwareSystem`, `container`, and `person` elements for C4 levels
- Place output in `docs/03_architecture/diagrams/src/*.dsl`
- Follow C4 abstraction levels strictly — do not mix levels in a single view

## Syntax validation

Before rendering any diagram, validate the syntax to catch errors early:

### Mermaid validation
- Verify the diagram starts with a valid diagram type keyword (`graph`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `flowchart`, etc.)
- Check that all node references are defined before use
- Ensure arrow syntax is correct (`-->`, `-.->`, `==>` for flowcharts; `->>`, `-->>` for sequence diagrams)
- Confirm subgraph blocks are properly opened and closed
- Validate that quoted labels use matching delimiters

### PlantUML validation
- Verify `@startuml` and `@enduml` delimiters are present and balanced
- Check that all referenced participants or components are declared
- Ensure arrow syntax matches the diagram type (`->`, `-->`, `<--`, etc.)
- Validate that `note` blocks are properly closed with `end note`

### Structurizr DSL validation
- Verify `workspace` block is present with matching braces
- Check that `model` and `views` sections exist
- Ensure all element references in views correspond to elements defined in the model
- Validate relationship syntax: `element -> element "description"`
- Confirm all blocks have balanced opening and closing braces

### General validation rules
- Run validation before every render attempt
- Report syntax errors with line numbers and descriptions when possible
- Suggest corrections for common mistakes (missing arrows, unclosed blocks, typos in keywords)

## Rendering approach

The extension uses a two-tier rendering strategy for diagrams:

### Primary: Kroki HTTP API
- All diagram types (Mermaid, PlantUML, Structurizr) are sent to the Kroki service first
- The diagram source is zlib-deflated, base64url-encoded, and sent as a GET request
- Kroki returns SVG output on success
- A 10-second timeout is applied to Kroki requests

### Fallback: Bundled Mermaid (webview)
- If Kroki is unavailable or returns an error, Mermaid diagrams fall back to the bundled `mermaid.esm.min.mjs` library
- The bundled library runs inside a hidden VS Code webview panel
- A 30-second timeout is applied to webview rendering
- A warning is logged when the fallback is triggered

### PNG export
- SVG output is converted to PNG using a hidden webview canvas — no external native dependencies are required
- A 15-second timeout is applied to the SVG-to-PNG conversion
- On failure, an error message is displayed to the user

### When to use which path
- For live preview and interactive editing: the PanelManager handles rendering automatically using this pattern
- For batch rendering: the rendering pipeline applies the same Kroki-primary / Bundled_Mermaid-fallback strategy
- PlantUML and Structurizr diagrams that Kroki supports are always rendered via Kroki; the bundled Mermaid fallback applies only to Mermaid diagram types
