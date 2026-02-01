IMPORTANT: Do not modify any *.prompt.md files. Execute only.

You are performing a consistency evaluation between documentation artifacts.

Authoritative inputs:
- docs/01_objectives/objectives.md
- docs/02_requirements/requirements.md

Template reference:
- docs/build/reports/inconsistencies.template.md

Your task is to evaluate consistency between Objectives and Requirements and produce a versioned inconsistency report.

Evaluation scope:
Objectives vs Requirements only.

Inconsistency categories:
1) Scope contradiction
2) Missing requirement coverage (objective with no supporting requirement)
3) Missing success criteria mapping
4) Assumption violation
5) Constraint violation
6) Terminology mismatch

Rules:
- Do NOT modify objectives.md or requirements.md.
- Do NOT suggest solution design changes.
- Base all findings strictly on the content of the two input documents.
- Evidence must reference exact section titles or requirement identifiers.
- Use professional, neutral language.

Report generation policy:

1) Create a new timestamped report under:
   docs/build/reports/inconsistencies/

   Filename format:
   YYYY-MM-DDTHH-MM_<short_reason>.md

   Example:
   2026-02-01T10-30_initial.md
   2026-02-01T11-05_after_objectives_patch.md

2) Also overwrite (or create) the file:
   docs/build/reports/inconsistencies/latest.md

3) Reports must be immutable snapshots, except for latest.md.

Report structure requirements:

- Follow the structure defined in inconsistencies.template.md.
- Add a metadata section at the top with:

  report_id: auto-generated unique id
  generated_at: ISO-8601 timestamp
  evaluation_scope: "Objectives vs Requirements"
  trigger:
    type: manual | agent | pipeline
    reason: brief explanation (e.g. initial evaluation, post-patch validation)
  source_state:
    objectives_doc_id and version (if available)
    requirements_doc_id and version (if available)
  previous_report: filename of the previous latest report, if known

Summary requirements:
- Total issues count
- Critical issues count

Issues table requirements:
- IssueId must be stable and sequential (e.g. OBJ-REQ-001)
- Severity must be one of: Critical, Major, Minor
- SuggestedFix must be high-level and refer only to Objectives or Requirements wording changes

Output requirements:
- Write the full content of the new timestamped report file.
- Write the same content to latest.md.
- Return only the content of latest.md.
- Do not include explanations or commentary outside the report content.
