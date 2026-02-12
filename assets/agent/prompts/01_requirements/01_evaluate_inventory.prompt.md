You are in EXECUTION mode.

Authoritative inputs:
- docs/00_brd/brd.md
- docs/01_requirements/requirements.inventory.md

Template reference:
- assets/templates/inventory_inconsistencies.template.md

Purpose:
Evaluate the completeness and internal consistency of the Requirements Inventory against the BRD.

Evaluation scope:
- BRD vs Requirements Inventory only.

Inconsistency categories:
1) Missing inventory item implied by the BRD
2) Ambiguous or unclear inventory description
3) Duplicate or overlapping inventory items
4) Misclassified inventory type
5) Inventory item introducing scope not supported by the BRD

Rules:
- Do NOT modify the BRD.
- Do NOT modify the Requirements Inventory.
- Base all findings strictly on the BRD content.
- Evidence must reference BRD section titles or descriptive phrases.
- Use professional, neutral language.

Report generation policy:
1) Create a new timestamped report under:
   docs/reports/inventory_inconsistencies/

   Filename format:
   YYYY-MM-DDTHH-MM_<short_reason>.md

2) Also overwrite (or create):
   docs/reports/inventory_inconsistencies/latest.md

Report requirements:
- Include metadata (report_id, generated_at, evaluation_scope, trigger).
- Provide summary counts (total issues, critical issues).
- Provide an issues table with stable IssueIds (INV-BRD-001, ...).

Return only the content of latest.md.
