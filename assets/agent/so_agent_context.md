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

## Precedence

In case of conflict:
1. Project-specific rules (if provided) take precedence.
2. Enterprise Reference Architecture rules override generic defaults.
3. Unresolved conflicts must be surfaced as exceptions requiring human decision.

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
- A recommended “next actions” list
