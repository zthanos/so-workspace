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

**Always load `resources/drawio-c4-guidelines.md` before generating or updating any `.drawio` C4 diagram.**
That file contains the authoritative stencil style strings, label formats, layout rules, and colour conventions.

### Required stencil shapes (summary)

All C4 shapes in generated XML must use `shape=mxgraph.c4.*` styles — never generic rectangles or ellipses.

| Element | Shape style key |
|---|---|
| Person (internal) | `mxgraph.c4.person2` + blue fill `#dae8fc` |
| External Person | `mxgraph.c4.person2` + grey fill `#f5f5f5` |
| Software System (internal) | `mxgraph.c4.system` + blue fill |
| External Software System | `mxgraph.c4.system` + grey fill |
| Container (app/service) | `mxgraph.c4.container` + blue fill |
| Container (database) | `mxgraph.c4.db` + blue fill |
| System Boundary | `mxgraph.c4.boundary` + transparent + dashed stroke |
| Connector | `orthogonalEdgeStyle` + arrowhead block |

See `drawio-c4-guidelines.md` for the complete `style=` strings to copy verbatim.

### Required label format

Every shape uses a three-line HTML label:
```
<b>Name</b><br/>[Type tag]<br/><font style="font-size:10px;">Description</font>
```

### Layout principles

- System boundary centred on canvas
- Actors above/left of boundary; external systems below/right
- Inside boundary (C4 Container): layer top-to-bottom — UI → API → Services → Data
- Connectors: `orthogonalEdgeStyle` only, labelled, arrow points toward the called party
- Minimum spacing: 80px horizontal, 60px vertical
- Boundary padding: 40px on all sides

### When editing visually in draw.io
1. Open **View → Shapes → C4** to activate the library
2. Drag shapes from the C4 stencil — do not use the generic shape palette
3. Follow the label format above for every shape
4. Use orthogonal connectors with descriptive labels

### When generating `.drawio` XML
- Produce valid `mxfile` / `mxGraphModel` XML
- Use verbatim `style=` strings from `drawio-c4-guidelines.md`
- Set `parent="<boundary_id>"` for shapes inside a boundary
- Every cell has a unique `id`; connectors have `source` and `target`
- Keep the file editable for later visual refinement in draw.io

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

Before generating, load `resources/drawio-c4-guidelines.md` to obtain the authoritative style strings.

When generating draw.io C4 diagrams:
- place output in `docs/03_architecture/diagrams/src/*.drawio`
- use draw.io-compatible XML that remains editable
- structure the layout as an enterprise architecture diagram, not as a casual sketch
- use **only** the official `shape=mxgraph.c4.*` stencil styles — never generic shapes
- apply the three-line HTML label format: `<b>Name</b><br/>[Type tag]<br/><font ...>description</font>`
- follow C4 abstraction levels strictly and do not mix levels in a single view
- use `orthogonalEdgeStyle` for all connectors; label every relationship
- set the correct `parent` for shapes inside a boundary cell

### Mermaid diagrams

When generating Mermaid diagrams:
- use `graph TD` or `graph LR` for flow diagrams
- use `sequenceDiagram` for sequence diagrams
- use `stateDiagram-v2` for state diagrams
- place output in `docs/03_architecture/diagrams/src/*.mmd`
- keep node labels short and descriptive
- use subgraphs to group related components
- prefer `TD` (top-down) layout unless horizontal flow is more natural

## Syntax validation

Before rendering or reviewing any diagram, validate the source to catch errors early.

### draw.io validation
- verify the file is valid `mxfile` XML
- check that the root contains an editable diagram page
- ensure the intended entities appear as labelled nodes
- ensure connectors link the intended nodes with `source` and `target` ids
- confirm the system boundary and external systems are visually separated
- validate that the diagram level matches the selected C4 level
- **stencil check**: confirm every shape uses `shape=mxgraph.c4.*` — flag any generic style (e.g. `rounded=1`, `ellipse`)
- **label check**: confirm every shape has the three-line format `Name / [Type tag] / description`
- **connector check**: confirm all connectors use `orthogonalEdgeStyle` and carry a label

### Mermaid validation
- verify the diagram starts with a valid diagram type keyword (`graph`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `flowchart`, etc.)
- check that all node references are defined before use
- ensure arrow syntax is correct (`-->`, `-.->`, `==>` for flowcharts; `->>`, `-->>` for sequence diagrams)
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
