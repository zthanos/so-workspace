@agent/prompts/00_EXECUTE.prompt.md
Execute now:

Read:
- build/reports/inventory_inconsistencies/latest.md

Apply a patch ONLY for the following IssueId:
{{issue_id}}

Then execute:
@agent/prompts/01_requirements/02_patch_inventory.prompt.md
