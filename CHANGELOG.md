# Changelog

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
