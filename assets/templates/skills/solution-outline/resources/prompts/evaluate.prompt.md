You are in EXECUTION mode.

Authoritative inputs:
- docs/03_architecture/solution_outline.md
- assets/templates/solution_outline.template.md
- docs/02_objectives/objectives.md
- docs/03_architecture/diagrams/src/c4_context.puml
- docs/03_architecture/diagrams/src/c4_container.puml

Template reference:
- assets/templates/so_inconsistencies.template.md

Purpose:
Evaluate the Solution Outline for correctness, completeness, and consistency
against Objectives and validated architecture diagrams.

Evaluation scope:
Objectives + Diagrams vs Solution Outline.

Inconsistency categories:
1) Missing coverage
   - Objective or diagram content not reflected in the Solution Outline
2) Scope creep
   - Solution Outline introduces elements not present in objectives/diagrams
3) Template violation
   - Section included without content or omitted while content exists
4) Diagram mismatch
   - Solution Outline description contradicts validated diagrams
5) Assumption leakage
   - Open points resolved instead of recorded as assumptions
6) Terminology mismatch
   - Inconsistent naming vs objectives/diagrams

Rules:
- Do NOT modify any files.
- Evidence must reference Objectives sections or Diagram identifiers.
- Do NOT suggest implementation or design changes.
- Use neutral, professional language.

Report generation:
- Write report to:
  docs/reports/solution_outline_inconsistencies/latest.md
- Use IssueIds: SO-OBJ-001, SO-OBJ-002, ...

Return only the content of:
docs/reports/solution_outline_inconsistencies/latest.md
