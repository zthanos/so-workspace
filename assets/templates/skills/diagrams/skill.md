---
id: diagrams
name: Diagrams
description: Create, refine, evaluate, and correct architecture and supporting diagrams derived from the current workspace artifacts.
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
    title: "Patch Diagram"
    prompt: "IssueIds to patch, e.g. DIAG-001"
    placeholder: "DIAG-001"

quickPick:
  paramName: diagram_id
  title: "Select Diagram"
  forOperations: [generate, eval, update, patch, recheck]
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
    notation: drawio_xml
    family: c4
    outputPath: "docs/03_architecture/diagrams/src/c4_context.drawio"
    promptKey: "generate_c4_context"
    evaluatePromptKey: "evaluate"
    patchPromptKey: "patch"
    recheckPromptKey: "recheck"

  - id: c4_container
    labels:
      - "c4 container"
      - "container diagram"
      - "c4 level 2"
    notation: drawio_xml
    family: c4
    outputPath: "docs/03_architecture/diagrams/src/c4_container.drawio"
    promptKey: "generate_c4_container"
    evaluatePromptKey: "evaluate"
    patchPromptKey: "patch"
    recheckPromptKey: "recheck"

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
It works strictly from the currently available workspace artifacts and the user's prompt.

## Supported diagram families

### C4 / draw.io
Used for architecture-level modeling:
- C4 Context
- C4 Container

Default C4 authoring format:
- draw.io XML (`.drawio`)

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
- `docs/03_architecture/diagrams/src/*.drawio`
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

### Update
Load:
- selected diagram source
- relevant architecture artifacts
- the user request that describes the intended diagram revision

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

## draw.io C4 rules

Use draw.io for:
- C4 Context
- C4 Container

Always load these resources before generating or updating C4 draw.io artifacts:
- `resources/drawio-c4-guidelines.md`
- `resources/drawio-c4-layout-patterns.md`
- `resources/drawio-c4-anti-patterns.md`
- `resources/drawio-xml-integrity.md`
- `resources/drawio-c4-examples.md`

Treat those files as the authoritative source for:
- exact stencil and style strings
- label placement and formatting
- spacing and layering
- XML structure and editability
- patterns to imitate and anti-patterns to avoid

### Required stencil families

Generated C4 XML must use official draw.io C4-oriented shapes and the exact styles defined in the resources.

Typical allowed element families:
- `mxgraph.c4.person2`
- rounded C4 software-system styles
- browser container styles
- database cylinder styles
- message-bus styles
- microservice hexagon styles
- dashed transparent boundary styles

Do not fall back to generic rectangles or ellipses for C4 elements unless the resource explicitly says so.

### Required label discipline

Every C4 element must use:
- placeholder-driven labels
- a three-line structure
- correct type tags
- a short description

Container-level labels must include technology.

### Layout discipline

- Context diagrams:
  - system in the center
  - actors left or upper-left
  - external systems right or lower-right
- Container diagrams:
  - actors on the left
  - external systems on the right
  - UI -> API -> Services -> Data in layered order inside the boundary
- Snap coordinates to a 10px grid
- Prefer structural crossing avoidance before jump arcs or detours

### XML discipline

- Produce valid uncompressed draw.io XML
- Preserve a stable editable `mxfile -> diagram -> mxGraphModel -> root` structure
- Use unique ids
- Set correct `parent` relationships
- Keep updates minimal during patch/revision operations

### Anti-patterns to avoid

- generic shapes instead of the approved C4 stencil styles
- hardcoded raw text labels when placeholder labels are expected
- external systems inside the boundary
- mixed C4 levels on one page
- missing relationship labels
- missing technology tag on containers
- diagonal connectors when orthogonal routing is possible
- connectors passing through shapes
- overlapping labels or shapes

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
- Update the C4 container draw.io diagram to include an identity provider
- Refine the C4 context diagram layout for enterprise review
- Create a flow diagram for the onboarding process
- Create a sequence diagram for the API interaction
- Evaluate the current flow diagram
- Patch the sequence diagram issues
- Recheck the C4 context diagram after updates

## Diagram generation

### draw.io C4 diagrams

When generating draw.io C4 diagrams:
- place output in `docs/03_architecture/diagrams/src/*.drawio`
- use draw.io-compatible XML that remains editable
- structure the layout as an enterprise architecture diagram, not as a casual sketch
- follow the exact shape and label guidance from the draw.io resources
- choose the correct container subtype for each container
- follow C4 abstraction levels strictly and do not mix levels in a single view
- use orthogonal connectors only and label every relationship
- set the correct `parent` for shapes inside a boundary cell

### Mermaid diagrams

When generating Mermaid diagrams:
- use `graph TD` or `graph LR` for flow diagrams
- use `sequenceDiagram` for sequence diagrams
- use `stateDiagram-v2` for state diagrams
- place output in `docs/03_architecture/diagrams/src/*.mmd`
- keep node labels short and descriptive
- use subgraphs to group related components
- prefer `TD` unless horizontal flow is more natural

## Syntax validation

Before rendering or reviewing any diagram, validate the source to catch errors early.

### draw.io validation
- verify the file is valid `mxfile` XML
- check that the root contains an editable diagram page
- ensure the intended entities appear as labelled nodes
- ensure connectors link the intended nodes with `source` and `target` ids
- confirm the system boundary and external systems are visually separated
- validate that the diagram level matches the selected C4 level
- confirm the correct stencil family is used for each element subtype
- confirm label placement follows the required three-line format
- confirm container subtype choices are appropriate
- confirm XML remains editable and structurally stable

### Mermaid validation
- verify the diagram starts with a valid diagram type keyword
- check that all node references are defined before use
- ensure arrow syntax is correct
- confirm subgraph blocks are properly opened and closed
- validate that quoted labels use matching delimiters

### General validation rules
- run validation before every render attempt
- report syntax errors with line numbers and descriptions when possible
- suggest corrections for common mistakes

## Rendering approach

- C4 authoring is draw.io-first
- Mermaid diagrams render through the extension's existing local rendering paths
- `.puml` and `.dsl` remain optional renderer-backed formats when explicitly used, but they are not the default C4 authoring format
