You are in EXECUTION mode.

Authoritative inputs:
- docs/02_objectives/objectives.md
- docs/01_requirements/requirements.inventory.md

Template reference:
- templates/objectives_inconsistencies.template.md

Purpose:
Evaluate consistency, completeness, and scope alignment between
Requirements Inventory and Solution Outline Objectives.

Evaluation scope:
Requirements Inventory vs Objectives only.

Inconsistency categories:
1) Missing inventory coverage
   - Inventory item not reflected in any Objectives section
2) Scope creep
   - Objective introduces capability, constraint, or exclusion not supported by inventory
3) Misplaced content
   - Inventory item mapped to an incorrect Objectives section
4) Assumption leakage
   - Gaps or ambiguities resolved instead of recorded as assumptions
5) Terminology mismatch
   - Inconsistent naming of the same concept across documents

Rules:
- Do NOT modify objectives.md.
- Do NOT modify requirements.inventory.md.
- Base findings strictly on inventory content.
- Evidence must reference:
  - Inventory Req-IDs, and
  - Objectives section titles.
- Use professional, neutral language.
- Do NOT suggest solution design changes.

Report generation policy:
1) Create a new timestamped report under:
   docs/reports/objectives_inconsistencies/

   Filename format:
   YYYY-MM-DDTHH-MM_<short_reason>.md

2) Also overwrite (or create):
   docs/reports/objectives_inconsistencies/latest.md

Report requirements:
- Include metadata (report_id, generated_at, evaluation_scope, trigger).
- Summary counts (total issues, critical issues).
- Issues table with stable IssueIds (OBJ-INV-001, ...).
- SuggestedFix must reference wording or placement changes only.

Return only the content of latest.md.
