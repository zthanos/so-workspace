# Phase and Skill Usage

This diagram shows how the Solution Outline workflow phases build on each other, and which workspace skill is used in each phase.

```mermaid
flowchart TD
    EntryPrompt["@so prompt or numbered SO command"] --> CommandRouter["Participant command router"]
    CommandRouter --> WorkspaceContext["Load workspace context\n- docs/so_agent_context.md\n- .github/rules\n- current artifacts"]
    WorkspaceContext --> SkillSource["Load active skill\n.github/skills/<skill>/skill.md\n+ skill resources and prompts"]

    subgraph Ops["Common skill operation loop"]
        OpGenerate["/generate\nCreate or refresh artifact"]
        OpEval["/eval\nProduce inconsistency report"]
        OpUpdate["/update\nDirect artifact revision"]
        OpPatch["/patch\nApply report fixes"]
        OpRecheck["/recheck\nValidate after patch"]

        OpGenerate --> OpEval
        OpEval --> OpPatch
        OpPatch --> OpRecheck
        OpUpdate --> OpEval
        OpRecheck -->|issues remain| OpPatch
    end

    SkillSource --> Ops

    subgraph P0["Phase 0 - Workspace utilities"]
        Init["Initialize workspace\nConvert source docs to Markdown\nUpdate workspace templates"]
        BRD["Canonical BRD\ndocs/00_brd/brd.md"]
        Init --> BRD
    end

    subgraph P1["Phase 1 - Requirements Inventory"]
        ReqSkill["Skill: requirements-inventory"]
        ReqArtifact["docs/01_requirements/requirements.inventory.md"]
        ReqReport["docs/reports/inventory_inconsistencies/latest.md"]
        ReqSkill --> ReqArtifact
        ReqArtifact --> ReqReport
    end

    subgraph P2["Phase 2 - Objectives"]
        ObjSkill["Skill: objectives"]
        ObjArtifact["docs/02_objectives/objectives.md"]
        FlowArtifact["docs/02_objectives/flows.yaml"]
        ObjReport["docs/reports/objectives_inconsistencies/latest.md"]
        ObjSkill --> ObjArtifact
        ObjArtifact --> FlowArtifact
        ObjArtifact --> ObjReport
    end

    subgraph P3["Phase 3 - Architecture Diagrams"]
        DiagramSkill["Skill: diagrams"]
        BpmnSkill["Optional skill: bpmn"]
        ContextDiagram["docs/03_architecture/diagrams/src/c4_context.drawio"]
        ContainerDiagram["docs/03_architecture/diagrams/src/c4_container.drawio"]
        SupportingDiagrams["flow.mmd / sequence.mmd / state.mmd"]
        BpmnDiagram["docs/03_architecture/diagrams/src/bpmn_process.drawio"]
        DiagramReport["docs/reports/diagram_inconsistencies/*/latest.md"]
        DiagramSkill --> ContextDiagram
        DiagramSkill --> ContainerDiagram
        DiagramSkill --> SupportingDiagrams
        BpmnSkill --> BpmnDiagram
        ContextDiagram --> DiagramReport
        ContainerDiagram --> DiagramReport
        SupportingDiagrams --> DiagramReport
        BpmnDiagram --> DiagramReport
    end

    subgraph P4["Phase 4 - Solution Outline"]
        SoSkill["Skill: solution-outline"]
        SoArtifact["docs/03_architecture/solution_outline.md"]
        SoReport["docs/reports/solution_outline_inconsistencies/latest.md"]
        FinalReview["docs/reports/solution_outline_final_review/latest.md"]
        SoSkill --> SoArtifact
        SoArtifact --> SoReport
        SoArtifact --> FinalReview
    end

    subgraph P5["Phase 5 - Architecture Decisions"]
        AdrSkill["Skill: adr"]
        AdrArtifact["docs/04_decisions/ADR-*.md"]
        AdrReport["docs/reports/adr_inconsistencies/*/latest.md"]
        AdrSkill --> AdrArtifact
        AdrArtifact --> AdrReport
    end

    subgraph P6["Phase 6 - Build and export"]
        Export["Build / export PDF or DOCX"]
        Deliverable["Review-ready Solution Outline package"]
        Export --> Deliverable
    end

    BRD --> ReqSkill
    ReqArtifact --> ObjSkill
    ObjArtifact --> DiagramSkill
    FlowArtifact --> DiagramSkill
    ObjArtifact --> BpmnSkill
    ReqArtifact --> BpmnSkill
    ObjArtifact --> SoSkill
    ContextDiagram --> SoSkill
    ContainerDiagram --> SoSkill
    SoArtifact --> AdrSkill
    ContextDiagram --> AdrSkill
    ContainerDiagram --> AdrSkill
    SoArtifact --> Export
    AdrArtifact --> Export

    Ops -.applies to.-> ReqSkill
    Ops -.applies to.-> ObjSkill
    Ops -.applies to.-> DiagramSkill
    Ops -.applies to.-> BpmnSkill
    Ops -.applies to.-> SoSkill
    Ops -.applies to.-> AdrSkill
```

## Phase-to-skill map

| Phase | Primary skill | Main inputs | Main output |
| --- | --- | --- | --- |
| 0 - Workspace utilities | No artifact skill; workspace commands | BRD source files, templates | Initialized workspace and canonical BRD Markdown |
| 1 - Requirements Inventory | `requirements-inventory` | BRD, discussions, references | `docs/01_requirements/requirements.inventory.md` |
| 2 - Objectives | `objectives` | Requirements Inventory | `docs/02_objectives/objectives.md`, `docs/02_objectives/flows.yaml` |
| 3 - Architecture Diagrams | `diagrams`; optional `bpmn` | Objectives, flows, requirements, references | C4 draw.io diagrams, supporting Mermaid diagrams, BPMN draw.io diagram |
| 4 - Solution Outline | `solution-outline` | Objectives, validated diagrams | `docs/03_architecture/solution_outline.md` |
| 5 - Architecture Decisions | `adr` | Requirements, objectives, diagrams, Solution Outline | `docs/04_decisions/ADR-*.md` |
| 6 - Build and export | Export commands | Solution Outline, diagrams, ADRs | PDF/DOCX delivery package |

## Runtime pattern

At runtime, the `@so` participant determines the requested skill from the slash command, aliases, diagram selection, or prompt keywords. It then loads the workspace-owned skill from `.github/skills`, adds the relevant workspace context and rules, and executes the selected operation-specific prompt.

The same operation pattern is reused across the artifact skills:

```text
/generate -> /eval -> /patch -> /recheck
              ^
              |
          /update
```

Use `/update` when the architect wants a direct change from new context or feedback. Use `/patch` when there is already an inconsistency report and the fixes should stay scoped to reported issue IDs.
