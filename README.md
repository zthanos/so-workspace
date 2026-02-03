# Solution Outline Workspace (Windows)

This repository provides a deterministic, command-driven workflow to produce a governed **Solution Outline**:
- Derived from a Business Requirements Document (BRD)
- Converted into a structured Requirements Inventory
- Converted into Solution Outline Objectives (source of truth)
- Validated through architecture diagrams (C4 Level 1 & Level 2)
- Generated as a Solution Outline document
- Evaluated and final-reviewed with full traceability against requirements

The VSIX extension acts strictly as an **orchestrator**:
- Opens VS Code Chat with prefilled execution scripts
- Runs local Docker-based build and export tasks
- Does **not** call LLM APIs directly and does **not** require API keys

---

## Prerequisites (Windows)

- Windows 10/11
- Docker Desktop (running)
- PowerShell 7+ recommended
- Visual Studio Code
- Solution Outline VSIX installed

---

## Repository Structure (Key Paths)

- `docs/00_requirements/` – Requirements Inventory
- `docs/01_objectives/` – Solution Outline Objectives (**source of truth**)
- `docs/02_solution_outline/` – Solution Outline template and generated document
- `docs/03_diagrams/` – Architecture diagrams (PlantUML / C4)
- `docs/agent/prompts/` – Agent execution prompts
- `docs/agent/commands/` – VSIX command runner scripts
- `docs/build/reports/` – Evaluation & inconsistency reports
- `scripts/` – Docker build and export scripts
- `build/pdf/` – Final PDF output

---

## Architecture Pipeline (Source of Truth & Quality Gates)

The workflow enforces strict sequencing and validation gates:

BRD  
↓  
Requirements Inventory  
↓  
Objectives (**SOURCE OF TRUTH**)  
↓  
C4 Context (L1 – validated)  
↓  
C4 Container (L2 – validated)  
↓  
Solution Outline (generated from template)  
↓  
SO Evaluation (Objectives + Diagrams)  
↓  
SO Final Review (Requirements Inventory)

### Source of Truth
- `docs/01_objectives/objectives.md`
- Validated diagrams in `docs/03_diagrams/`

### Final Completeness Gate
- `docs/00_requirements/requirements.inventory.md`

---

## How the VSIX Is Used

Each VSIX command opens **VS Code Chat** with a prefilled execution script.
In most cases, the user simply presses **Enter**.

Some commands require parameters:
- `IssueId` (for patch commands)
- `diagram_id` (e.g. `c4_context`, `c4_container`)

The underlying pattern is always:
```
Generate → Evaluate → Patch → Recheck
```

---

## Available VSIX Command Categories

### Requirements Inventory
- Generate
- Evaluate
- Patch (by IssueId)
- Recheck

### Objectives
- Generate
- Evaluate
- Patch (by IssueId)
- Recheck

### Diagrams
- Evaluate (by diagram_id)
- Patch (by diagram_id + IssueId)
- Recheck (by diagram_id)

### Solution Outline
- Generate
- Evaluate
- Patch (by IssueId)
- Recheck
- Final Review (against Requirements Inventory)

### Build / Export
- Render Diagrams (Docker)
- Export PDF (Docker)

---

## Build & Export (Docker)

### Option A – Full Build
Runs diagram rendering and PDF export in one step:
```powershell
.\scripts\build_docker.ps1
```

### Option B – PDF Export Only
```powershell
.\scripts\export_pdf_docker.ps1
```

### Output
- Final document: `build/pdf/Full_Doc.pdf`

---

## Templates and Contracts

- Solution Outline Template:
  `docs/02_solution_outline/soloution_outline_template.md`

- All evaluation reports are written to a `latest.md` file to ensure deterministic patch and recheck steps.

---

## Design Principles

- Deterministic outputs (no free-form generation)
- Explicit source-of-truth artifacts
- Strict separation of generation vs evaluation
- No implicit architectural decisions
- Fully auditable and reviewable pipeline

---

## Notes

This workspace is intended to support:
- Architecture governance
- Steering committee reviews
- Team handover and onboarding
- Repeatable Solution Outline creation across initiatives
