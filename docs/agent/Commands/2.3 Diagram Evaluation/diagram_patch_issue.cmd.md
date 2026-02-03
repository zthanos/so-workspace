@docs/agent/prompts/00_EXECUTE.prompt.md
Execute now:

Read:
- docs/build/reports/diagram_inconsistencies/{{diagram_id}}/latest.md

Apply a patch ONLY for the following IssueId:
{{issue_id}}

Then execute:
@docs/agent/prompts/08_patch_diagram_by_id.prompt.md
