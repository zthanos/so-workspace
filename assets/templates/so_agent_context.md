---
doc_id: SO-AGENT-CONTEXT
title: Solution Outline Agent Context
version: 1.0
status: active
---

# Purpose

You assist in creating and validating Solution Outline documentation from repository artifacts. You must prioritize consistency, traceability, and deterministic structure.

# Authoritative inputs

You must treat the following as authoritative:

1. Objectives: `docs/02_objectives/objectives.md`
2. Requirements: `docs/01_requirements/requirements.inventory.md`
3. Solution Outline template: `assets/templates/solution_outline.template.md`
4. Diagrams (rendered): `docs/03_architecture/diagrams/out/*.png`
5. ADRs: `docs/03_architecture/adr/*.md` (if present)

6. Project discussions: `docs/98_discussions/*.md` (if present)
7. Local reference snapshot: `docs/99_references/**/*` (if present)

# Outputs you may modify

You are allowed to create/update:

- `docs/03_architecture/solution_outline.md`
- `docs/03_architecture/adr/*.md` (new ADRs if required)
- `docs/reports/solution_outline_inconsistencies/latest.md` (new report file)

You must not edit:
- `docs/reports/**` except for creating new reports
- any rendered diagram outputs in `diagrams/out` (these are derived from src)
- the repository structure

# Generation rule

When generating `docs/03_architecture/solution_outline.md` you must:
- follow the headings and ordering of `solution_outline.template.md`
- use language consistent with Objectives
- reference requirements where relevant (e.g., BR-01, BR-02)
- embed rendered diagrams using relative paths to `./diagrams/out/*.png`


# Deterministic Context Rule

Generation results must depend only on artifacts and references physically present within the workspace. External repositories, assumed knowledge, or unstaged references must not influence outputs.

This ensures reproducibility and stable artifact evolution across Generate → Evaluate → Patch → Recheck cycles.

# Architecture Flow and Integration Rules Usage

You must use the Reference Architecture Rules Pack as a deterministic policy layer when identifying integrations and generating architectural flows.

The Rules Pack defines:
- system categories and zones,
- allowed and preferred integration routes,
- preferred interaction styles (synchronous vs asynchronous),
- minimum cross-cutting requirements (security and observability).

The Rules Pack is not part of the Solution Outline content and must not be quoted or embedded verbatim in documents.

## Flow Identification

You must identify high-level flows when:
- Objectives describe end-to-end business processes,
- multiple systems participate in a capability,
- state transitions (e.g. booking, payment, availability) occur.

Each identified flow must:
- have a clear trigger (actor + intent),
- identify participating systems using canonical names,
- remain technology-agnostic.

## Rules Application

When a flow involves systems across different categories or zones, you must apply the Reference Architecture Rules Pack to determine:
- whether direct integration is allowed,
- whether intermediary systems (middleware, gateway) are required,
- whether synchronous or asynchronous interaction is preferred.

If a rule mandates routing via an intermediary, you must reflect this in the generated flow structure.

You must not invent product-specific technologies unless explicitly stated in authoritative inputs.

## Sequence Diagram Generation

You may generate high-level sequence diagrams only when:
- the flow includes 5–12 meaningful steps,
- each interaction can be classified (UI, synchronous call, asynchronous event, data access),
- at least one error scenario is identifiable at a high level.

Sequence diagrams must:
- reflect the routed flow after rule application,
- show logical participants (not infrastructure details),
- avoid implementation-level specifics.

## Handling Missing Information

If required information is missing:
- do not assume or invent details,
- apply default preferences from the Rules Pack where allowed,
- explicitly record open points or assumptions.

## References & Discussions Usage Rules

### Local Reference Snapshot Rule

- Only references available under `docs/99_references/` may be used.
- Do not assume access to any global/shared repository unless its content is explicitly copied into this workspace.
- References represent enterprise-approved guidance or patterns.
- References must not override authoritative project artifacts.
- If a reference conflicts with Objectives, Requirements, existing ADRs, or approved diagrams, surface the conflict and recommend an ADR.

### Project Discussions Rule

- Discussions under `docs/98_discussions/` provide contextual clarifications and refinements not originally present in the BRD-derived artifacts.
- Discussions may enrich interpretation but must not silently change scope.
- If discussions introduce new constraints, architectural changes, or trade-offs, the impacted stage must re-enter the Evaluate → Patch → Recheck cycle.
- Architectural impacts derived from discussions should result in an ADR recommendation.


## Precedence and Conflict Resolution

When multiple sources provide input, the following precedence applies:

1. Authoritative project artifacts  
   (Objectives, Requirements, existing ADRs, approved diagrams, Solution Outline sections)

2. Project discussions  
   (`docs/98_discussions/`)

3. Local reference snapshot  
   (`docs/99_references/`)

If conflicts remain unresolved:
- Explicitly highlight the inconsistency.
- Recommend an ADR.
- Do not silently reconcile conflicting information.


# Consistency checks (Objectives vs Requirements)

You must identify inconsistencies and produce a report in `docs/reports/solution_outline_inconsistencies/latest.md`. An inconsistency is any of the following:

1. Scope contradiction: Requirements introduce functionality explicitly out of scope in Objectives.
2. Missing requirement coverage: Objectives include an in-scope capability that is not present in Requirements.
3. Missing success criteria mapping: Objectives success criteria exist without corresponding acceptance criteria or requirement intent.
4. Assumption violation: Requirements contradict an assumption or introduce dependencies that invalidate assumptions.
5. Constraint violation: Requirements or Solution Outline violate stated constraints (e.g., toolchain constraints, environment constraints).
6. Terminology mismatch: Same concept named differently across documents without clarification in glossary.

# Report format

The report must include:
- Summary counts (total issues, critical issues)
- A table of issues: IssueId, Severity, Location, Description, Evidence, SuggestedFix
- A recommended "next actions" list
