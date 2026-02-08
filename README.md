# SO Workspace – Usage & Execution Guide

This VS Code extension provides a **deterministic, step-by-step workspace** for producing enterprise-grade Solution Outlines from Business Requirements Documents (BRDs).

The workflow is intentionally **ordered**, **review-driven**, and **architecture-safe**, ensuring traceability from requirements to final Solution Outline and supporting diagrams.

---

## Execution Philosophy

- Each stage produces an artifact that becomes the **source of truth** for the next stage.
- Outputs are validated before progressing.
- Generated content is **reviewed and refined**, not blindly accepted.
- Diagrams and documents are always derived from structured inputs, not edited independently.

---

## Ordered VSIX Commands (Execution Sequence)

The commands below are intentionally numbered to reflect the enforced execution order.  
They should be executed **top-to-bottom**.

### 0) Workspace Utilities
- **SO: 0-00 Reset Generated Files**  
  `so.resetGeneratedFiles`

- **SO: 0-01 Convert Word to Markdown**  
  `so-workspace.convertWordToMarkdown`

---

### 1) Requirements Inventory  
(Generate → Evaluate → Patch → Recheck)

- **SO: 1-01 Requirements Inventory Generate (Open Chat)**  
  `so-workspace.req.generate`

- **SO: 1-02 Requirements Inventory Evaluate (Open Chat)**  
  `so-workspace.req.eval`

- **SO: 1-03 Requirements Inventory Patch (Open Chat)**  
  `so-workspace.req.patch`

- **SO: 1-04 Requirements Inventory Recheck (Open Chat)**  
  `so-workspace.req.recheck`

The Requirements Inventory is the structured representation of the BRD and acts as the **requirements baseline** for all subsequent stages.

---

### 2) Objectives  
(Generate → Evaluate → Patch → Recheck)

- **SO: 2-01 Objectives Generate (Open Chat)**  
  `so-workspace.obj.generate`

- **SO: 2-02 Objectives Evaluate (Open Chat)**  
  `so-workspace.obj.eval`

- **SO: 2-03 Objectives Patch (Open Chat)**  
  `so-workspace.obj.patch`

- **SO: 2-04 Objectives Recheck (Open Chat)**  
  `so-workspace.obj.recheck`

Objectives represent the **architectural interpretation of requirements** and are the **primary source of truth** for flows and diagrams.

---

## Flow Modeling (Canonical Flows)

### Purpose

After Objectives are finalized, the workspace defines **Canonical Flows** in a single, human-readable YAML file.  
Canonical flows enable deterministic generation of **high-level sequence diagrams**, which implementation teams use to understand interaction flows before detailed analysis.

### Canonical Source of Truth

```
docs/02_objectives/flows.yaml
```

This file is the **only authoritative definition of flows**.  
Diagrams must always be generated from this file.

Manual edits to diagrams without updating the YAML are not allowed.

---

### Ownership Model

- The agent may generate **initial flow drafts**.
- The architect reviews, refines, and approves flows.
- Only **approved flows** are used for delivery handover.

This establishes a **hybrid model**:
- generation is automated,
- ownership and accountability remain with the architect.

---

### Flow Definition (Minimum Contract)

A flow is considered **sequence-ready** only if it includes:

- A clear trigger (actor and intent)
- Canonical participants (actors, systems, containers)
- 5–12 meaningful steps (happy path)
- At least one high-level error case
- State transitions where applicable (e.g. booking, payment)

Flows that do not meet these criteria must not generate sequence diagrams.

---

### Outputs from Canonical Flows

From `flows.yaml`, the workspace can generate:

- **Mermaid sequence diagrams**  
  Primary deliverable for development and integration teams.

- **Mermaid flowcharts** (optional)  
  Useful for business discussions and decision-heavy processes.

Recommended output locations:

```
docs/03_architecture/diagrams/src/seq/
docs/03_architecture/diagrams/src/flow/
```

---

### Recommended Execution Order (Flow Stage)

1. Finalize Objectives (Stage 2)
2. Define canonical flows in `docs/02_objectives/flows.yaml`
3. Architect review and approval of flows
4. Generate high-level sequence diagrams from approved flows
5. Continue with architecture diagrams and Solution Outline generation

---

### Handling Unknowns

When information is missing from the BRD or Objectives:

- Do not invent details
- Record gaps explicitly as open points in the flow definition
- Apply only generic defaults where allowed

---

### 3) Architecture Diagrams  
(C4 + Render → Evaluate → Patch → Recheck)

- **SO: 3-01 Generate C4 Context Diagram (Open Chat)**  
  `so-workspace.diagram.generateC4Context`

- **SO: 3-02 Generate C4 Container Diagram (Open Chat)**  
  `so-workspace.diagram.generateC4Container`

- **SO: 3-03 Render Diagrams (Local)**  
  `so-workspace.renderDiagrams`

- **SO: 3-04 Diagram Evaluate (Select Diagram)**  
  `so-workspace.diagram.eval`

- **SO: 3-05 Diagram Patch (Select Diagram)**  
  `so-workspace.diagram.patch`

- **SO: 3-06 Diagram Recheck (Select Diagram)**  
  `so-workspace.diagram.recheck`

Architecture diagrams are validated against Objectives and approved flows.

---

### 4) Solution Outline  
(Generate → Evaluate → Patch → Final Review)

- **SO: 4-01 Solution Outline Generate (Open Chat)**  
  `so-workspace.so.generate`

- **SO: 4-02 Solution Outline Evaluate (Objectives + Diagrams)**  
  `so-workspace.so.eval`

- **SO: 4-03 Solution Outline Patch (Open Chat)**  
  `so-workspace.so.patch`

- **SO: 4-04 Solution Outline Final Review (Requirements Inventory)**  
  `so-workspace.so.finalReview`

The Solution Outline is generated only after Objectives, Flows, and Diagrams have stabilized.

---

### 5) Build & Export

- **SO: 5-01 Build PDF (Docker)**  
  `so-workspace.buildPdf`

- **SO: 5-02 Export PDF**  
  `so-workspace.exportPdfNpm`

- **SO: 5-03 Open Generated PDF**  
  `so-workspace.openGeneratedPdf`

---

## Repository Structure (Key Paths)

```
docs/
 ├─ 01_requirements/
 ├─ 02_objectives/
 │   └─ flows.yaml
 ├─ 03_architecture/
 │   └─ diagrams/
 │       ├─ src/seq/
 │       └─ src/flow/
```

---

## Final Notes

- The pipeline is designed to be **repeatable and auditable**.
- YAML artifacts are the canonical inputs; diagrams and documents are derived outputs.
- The extension enforces order to prevent architectural drift and premature design decisions.
