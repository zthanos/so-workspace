---

doc_id: BRD-REQ-WORKFLOW
title: BRD → Requirements Inventory – Full Workflow
version: 1.0
status: draft
-------------

# Purpose

This document defines the **full Requirements Inventory workflow** derived from a narrative Business Requirements Document (BRD). The inventory acts as a normalized, structured baseline for Objectives generation and downstream validation.

The workflow follows the same governance pattern already established for Objectives:

Extract → Evaluate → Patch → Recheck

---

# Inventory Scope (Full Inventory)

Each requirement item extracted from the BRD must be classified into exactly one of the following types:

* Business Capability
* Business Flow / Scenario
* Actor / Stakeholder
* System / Interface
* Data / Information
* Constraint / Policy
* Non-Functional Intent
* Risk / Open Point

The inventory must not introduce solution design or technical implementation decisions.

---

# Inventory Artifact

File:

```
docs/01_requirements/requirements.inventory.md
```

Structure:

```md
---
doc_id: BRD-REQ-INVENTORY
title: Requirements Inventory (Derived from BRD)
version: 0.1
status: derived
source: Business Requirements Document
---

# Requirements Inventory

## Scope and Intent
This document captures a structured inventory of requirements derived from the Business Requirements Document (BRD).
It does not introduce solution design or implementation decisions.

## Inventory Items

| Req-ID | Type | Description | Source (BRD Section / Paragraph) | Notes / Ambiguities |
|-------|------|-------------|----------------------------------|---------------------|
```

Req-ID values are auto-generated and stable (REQ-01, REQ-02, …).

---

# Step 1 – Extract Inventory

## Prompt: `00_extract_requirements_inventory.prompt.md`

**Objective**
Derive a complete Requirements Inventory from the BRD.

**Rules**

* Extract all relevant requirement items from the BRD.
* Classify each item using the defined inventory types.
* Do not merge unrelated concepts into a single item.
* Do not invent requirements not supported by the BRD.
* If the BRD is ambiguous, record the ambiguity explicitly in Notes.

**Output**

* Create or update `docs/01_requirements/requirements.inventory.md`
* Populate the Inventory Items table fully.

---

# Step 2 – Evaluate Inventory Consistency

## Prompt: `01_evaluate_inventory.prompt.md`

**Objective**
Evaluate the completeness and internal consistency of the Requirements Inventory against the BRD.

**Evaluation Criteria**

* Missing inventory items implied by the BRD
* Ambiguous or unclear requirement descriptions
* Overlapping or duplicated inventory items
* Scope gaps that prevent Objectives derivation

**Output**

* Generate an inconsistencies report under:
  `docs/reports/inventory_inconsistencies/`
* Update `latest.md` with the most recent evaluation

---

# Step 3 – Patch Inventory

## Prompt: `02_patch_inventory.prompt.md`

**Objective**
Apply minimal, controlled changes to the Requirements Inventory to resolve reported inconsistencies.

**Rules**

* Only address issues explicitly listed in the evaluation report.
* Do not introduce solution design.
* Do not remove valid inventory items unless explicitly marked as invalid.

**Output**

* Update `docs/01_requirements/requirements.inventory.md` only.

---

# Step 4 – Recheck Inventory

## Prompt: `03_recheck_inventory.prompt.md`

**Objective**
Re-evaluate the patched Requirements Inventory to confirm resolution of inconsistencies.

**Rules**

* Re-run the same evaluation criteria.
* Overwrite the previous `latest.md` report.
* Do not modify the inventory in this step.

---

# Downstream Dependency

The Requirements Inventory is the **authoritative input** for:

* Solution Outline Objectives generation
* Objectives consistency evaluation
* Solution Outline and diagram generation

Objectives must not introduce scope or capabilities not present in this inventory.
