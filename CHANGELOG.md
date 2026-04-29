# Changelog

## 3.2.0

SO Workspace v3.2.0 tightens the participant-driven artifact workflow, refreshes workspace templates more safely, and significantly improves draw.io-based C4 and BPMN generation quality.

### Participant workflow and command routing

- Added clearer `@so` command aliases for requirements, objectives, C4, solution outline, BPMN, and workspace refresh flows.
- Added explicit participant commands for the main SO workflow stages:
  - `/GenerateRequirements`
  - `/EvaluateRequirements`
  - `/PatchRequirement`
  - `/ReviewRequirement`
  - `/GenerateObjectives`
  - `/EvaluateObjectives`
  - `/PatchObjectives`
  - `/ReviewObjectives`
  - `/GenerateC4`
  - `/EvaluateC4`
  - `/PatchC4`
  - `/ReviewC4`
  - `/GenerateSolutionOutline`
  - `/EvaluateSolutionOutline`
  - `/PatchSolutionOutline`
  - `/ReviewSolutionOutline`
  - `/UpdateWorkspace`
- Improved participant routing so natural-language requests and slash commands resolve the correct skill and artifact more reliably.
- Hardened the native editor handoff so prompts open in chat instead of being injected into the active file buffer.
- Added explicit multi-artifact orchestration for `@so /GenerateC4` so the participant now generates the C4 pair in sequence:
  - `docs/03_architecture/diagrams/src/c4_context.drawio`
  - `docs/03_architecture/diagrams/src/c4_container.drawio`
- Improved participant-side diagram guidance so generated edits avoid placeholders, layout overlap, and mixed abstraction levels more consistently.

### Workspace template refresh

- Added `@so /UpdateWorkspace` as a participant-level workspace refresh flow.
- Added full refresh support through:
  - `@so /UpdateWorkspace all`
  - `@so /UpdateWorkspace override all`
  - `@so /UpdateWorkspace full`
  - `@so /UpdateWorkspace force`
- Updated the workspace refresh command to overwrite extension-owned template files without prompting for every file individually.
- Kept workspace refresh scoped to template/bootstrap assets rather than project-authored artifacts.

### C4 draw.io generation

- Improved C4 context and container generation guidance with stronger stencil, label, spacing, and XML editability rules.
- Added stronger native handoff instructions so the detailed operation prompt for C4 generation is preserved in the editor chat flow.
- Tightened context-diagram placement rules with preferred coordinates for:
  - system boundary
  - system of interest
  - actor column
  - external-system column
  - title block
- Improved label contrast defaults in the starter templates and examples so `c4Name`, `c4Type`, and descriptions remain visible on dark fills.
- Removed domain-specific example bias from active draw.io C4 example resources so generated diagrams stay grounded in workspace artifacts instead of a baked-in sample scenario.

### BPMN draw.io generation

- Added a dedicated BPMN draw.io skill for editable BPMN 2.0 process modeling.
- Strengthened BPMN generation guidance to prefer:
  - separate pools for independent participants
  - sequence flow only within a pool
  - message flow between pools
- Improved BPMN examples and layout rules for collaboration scenarios such as requester, approver, and platform interactions.
- Added stronger participant-level BPMN hints so collaboration workflows are less likely to collapse into a generic swimlane flow.

### Skill loading and runtime consistency

- Fixed diagram skill parsing for nested `diagramCatalog` entries so draw.io notation metadata no longer breaks the skill loader.
- Kept workspace `.github/skills` as the active runtime source of truth while improving compatibility with refreshed template sets.
- Added fallback operation support for older initialized workspaces that may lack newer skill frontmatter structure.

## 3.0.0

SO Workspace v3 consolidates the participant, workspace skills, and diagram tooling into a more consistent end-to-end workflow.

### Participant and artifact workflow

- Fixed workspace context loading so `@so` reads the initialized workspace guide correctly.
- Fixed packaged skill path resolution during workspace setup and runtime skill access.
- Kept `@so` as the user-facing entry point while improving artifact-focused flows.
- Added first-class `/update` support so users can directly update artifacts without requiring an eval report first.
- Kept `/patch` as the report-driven remediation path after evaluations.
- Improved artifact targeting so requirements, objectives, solution outline, diagrams, and ADR flows resolve the correct files more reliably.
- Added missing ADR support to the participant and command surface.
- Added `docs/99_references` to the loaded participant context so reference architecture material can drive diagrams and related outputs.

### Skills and workspace initialization

- Standardized workspace skills around `.github/skills` as the active runtime source of truth.
- Removed active packaged-skill fallback behavior that could mask workspace skill changes.
- Fixed skill lookup and loading so initialized workspaces use the copied skill set consistently.
- Moved active report and artifact templates into skill-owned resources.
- Updated workspace initialization to seed skill-owned resources such as `flows.yaml` from the skill templates.
- Corrected ADR skill routing and aligned ADR paths with `docs/04_decisions`.
- Added missing `update` operation support across the shipped skills.

### Commands and SO workflow coverage

- Added missing command registrations for direct updates across requirements, objectives, diagrams, solution outline, and ADRs.
- Added missing diagram generation commands for flow, sequence, and state diagrams.
- Expanded the `@so` participant slash-command surface to include generic `/update`.
- Kept generation, evaluation, patch, and recheck flows aligned across supported artifact types.

### Diagram rendering and preview

- Split diagram rendering by format:
  - `.puml` renders through the local Kroki `plantuml` path.
  - `.dsl` renders through a dedicated Structurizr CLI/container runtime.
- Removed dependence on host Java for the active PlantUML rendering path.
- Improved renderer wiring and diagnostic messaging so batch rendering reflects the real runtime split.
- Hardened preview PNG export by making SVG-to-PNG conversion more resilient to sizing and SVG embedding issues.
- Added a bundled `docker-compose.structurizr.yml` for the local Kroki + Structurizr container workflow.

### Document conversion

- Kept Word-to-Markdown conversion as a VSIX-only JavaScript flow.
- Added PDF-to-Markdown conversion as a VSIX-only JavaScript flow.
- Kept DOCX export as a VSIX-only JavaScript flow using the bundled `docx` package.

### Packaging and cleanup

- Removed the obsolete `assets/templates/skills.zip` artifact from active use.
- Added ignore rules to keep old packaged-skill fallback artifacts out of the repo/package surface.
- Kept workspace-generated content separated from extension runtime assets more cleanly.

### Known follow-up items

- The repository still references a Structurizr container/runtime workflow, but a root-level `docker-compose.structurizr.yml` is not currently present.
- The Structurizr-specific file-generation PNG helper should be unified with the shared hardened preview export path.
