---
report_id: DIAG-EVAL-<timestamp>
generated_at: <iso_datetime>
evaluation_scope: Objectives + Requirements Inventory vs Diagram (<diagram_id>)
diagram_id: <diagram_id>
diagram_path: <path>
trigger: Diagram consistency and scope evaluation
---

# Diagram Consistency Report

## Executive Summary
- Total Issues Found: <n>
- Critical: <n>
- Major: <n>
- Minor: <n>

## Issues Table

| IssueId | Severity | Category | Location | Description | Evidence | Suggested Resolution |
|---|---|---|---|---|---|---|

## Categories
1) Missing Element (actor/system/container/relationship required by objectives/inventory)
2) Scope Creep (element not supported by objectives/inventory)
3) Wrong Level (diagram includes details beyond its level)
4) Tech Leakage (technologies, products, protocols, cloud services appear)
5) Relationship Error (wrong direction, wrong responsibility, missing optionality)
6) Naming Mismatch (inconsistent naming vs objectives/inventory)
7) Ambiguity Not Captured (diagram implies a resolved policy that should remain open)

## Conclusion
Overall Assessment: <PASS / ACCEPTABLE WITH MINOR / FAIL>

---
