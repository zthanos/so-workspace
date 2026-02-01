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

1. Objectives: `docs/01_objectives/objectives.md`
2. Requirements: `docs/02_requirements/requirements.md`
3. Solution Outline template: `docs/03_architecture/solution_outline.template.md`
4. Diagrams (rendered): `docs/03_architecture/diagrams/out/*.png`
5. ADRs: `docs/03_architecture/adr/*.md` (if present)

# Outputs you may modify

You are allowed to create/update:

- `docs/03_architecture/solution_outline.md`
- `docs/03_architecture/adr/*.md` (new ADRs if required)
- `docs/build/reports/inconsistencies.md` (new report file)

You must not edit:
- `docs/build/**` except for reports
- any rendered diagram outputs in `diagrams/out` (these are derived from src)
- the repository structure

# Generation rule

When generating `docs/03_architecture/solution_outline.md` you must:
- follow the headings and ordering of `solution_outline.template.md`
- use language consistent with Objectives
- reference requirements where relevant (e.g., BR-01, BR-02)
- embed rendered diagrams using relative paths to `./diagrams/out/*.png`

# Consistency checks (Objectives vs Requirements)

You must identify inconsistencies and produce a report in `docs/build/reports/inconsistencies.md`. An inconsistency is any of the following:

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
