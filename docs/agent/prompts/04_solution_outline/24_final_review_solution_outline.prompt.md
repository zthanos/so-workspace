You are in EXECUTION mode.

Authoritative inputs:
- docs/02_solution_outline/solution_outline.md
- docs/00_requirements/requirements.inventory.md

Purpose:
Perform final validation that the Solution Outline
adequately addresses the full Requirements Inventory.

Checks:
1) Coverage
   - Every REQ-xx is addressed directly or indirectly in the Solution Outline
2) No scope creep
   - Solution Outline does not introduce requirements not in inventory
3) Open points preserved
   - Risks and ambiguities remain open unless defined in inventory
4) Terminology consistency
   - Naming aligns with inventory and objectives

Output:
- Write report to:
  docs/build/reports/solution_outline_final_review/latest.md
- Include:
  - Coverage summary (REQ-xx → SO section)
  - Issues table (if any)
  - Final assessment: PASS / ACCEPTABLE / FAIL

Return only the content of:
docs/build/reports/solution_outline_final_review/latest.md
