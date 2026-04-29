---
id: bpmn
name: BPMN Diagrams
description: Create, refine, evaluate, and correct BPMN 2.0 business process diagrams in draw.io from current workspace artifacts.
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
    title: "Patch BPMN Diagram"
    prompt: "IssueIds to patch, e.g. BPMN-001"
    placeholder: "BPMN-001"
---

# BPMN Diagrams Skill

Use this skill when the user asks to:
- create a BPMN 2.0 process diagram
- model a business workflow with pools and lanes
- document inter-participant message exchange
- evaluate BPMN correctness or visual quality
- patch BPMN issues after review
- refine a BPMN workflow while preserving proper notation

## Purpose

This skill produces enterprise-grade BPMN 2.0 diagrams in editable draw.io XML.

It must:
- stay grounded in current workspace artifacts
- use BPMN semantics correctly
- remain visually clear and easy to maintain
- avoid drifting into generic flowchart notation

## Primary output artifact

- `docs/03_architecture/diagrams/src/bpmn_process.drawio`

## Evaluation report artifact

- `docs/reports/diagram_inconsistencies/bpmn/latest.md`

## Authoritative workspace artifacts

Primary sources:
- `docs/01_requirements/requirements.inventory.md`
- `docs/02_objectives/objectives.md`
- `docs/03_architecture/solution_outline.md`
- `docs/98_discussions/`
- `docs/99_references/`

## Context loading policy

### Generate
Load the minimum relevant context from:
- Requirements Inventory
- Objectives
- Solution Outline when process scope depends on architecture responsibilities
- Discussions and references only when they materially clarify roles or process rules

### Evaluate
Load:
- current BPMN draw.io source
- relevant architecture and requirements artifacts

### Update
Load:
- current BPMN draw.io source
- relevant workspace artifacts
- user request describing the intended revision

### Patch
Load:
- current BPMN draw.io source
- latest BPMN inconsistency report
- relevant workspace artifacts

### Recheck
Load:
- patched BPMN draw.io source
- relevant workspace artifacts

## Required BPMN references

Always load these resources before generating or updating BPMN draw.io artifacts:
- `resources/drawio-bpmn-guidelines.md`
- `resources/drawio-bpmn-layout-patterns.md`
- `resources/drawio-bpmn-anti-patterns.md`
- `resources/drawio-xml-integrity.md`
- `resources/drawio-bpmn-examples.md`

Treat them as the authoritative source for:
- BPMN 2.0 shape semantics
- pool and lane usage
- sequence flow versus message flow rules
- gateway and event correctness
- layout and XML editability

## BPMN modeling rules

- Use BPMN 2.0 semantics, not generic flowchart shortcuts
- Use pools and lanes when multiple participants or responsibility boundaries are involved
- Use sequence flows only within a single pool
- Use message flows between pools only
- Label outgoing flows from exclusive and inclusive gateways
- Keep activities at business-process level, not UI or code detail
- Use business language for labels
- Keep process direction consistent and visually readable

## Draw.io BPMN rules

When generating BPMN draw.io diagrams:
- produce valid editable draw.io XML
- use correct BPMN element families and connector styles
- keep pools and lanes as real containers
- keep connectors orthogonal where practical
- avoid crossings when a structural layout change can prevent them
- preserve editability for later manual refinement

## Anti-patterns to avoid

- generic diamonds instead of BPMN gateways
- generic circles instead of BPMN events
- sequence flows crossing pool boundaries
- dashed message flow used inside a single pool
- missing pool structure in a collaboration process
- unlabeled gateway branches
- mixing BPMN and casual flowchart notation on the same page
- overlapping labels, lanes, or connectors

## Validation expectations

Before rendering or reviewing:
- verify BPMN semantics
- verify draw.io XML integrity
- verify source and target IDs on all edges
- verify pool/lane containment and parent relationships
- verify sequence versus message flow correctness
- verify readable layout and branch labels

## Example requests

- Create a BPMN 2.0 diagram for the booking approval process
- Model the customer and back-office process in BPMN with lanes
- Update the BPMN process to include payment failure handling
- Evaluate the BPMN process for notation and layout issues
- Patch the BPMN diagram issues from the latest report
