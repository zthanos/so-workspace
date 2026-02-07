@agent/prompts/00_EXECUTE.prompt.md
Execute now:

Read:
- build/reports/diagram_inconsistencies/{{diagram_id}}/latest.md

Apply a patch ONLY for the following IssueId:
{{issue_id}}

Then execute:
@agent/prompts/02_diagrams/08_patch_diagram.prompt.md
