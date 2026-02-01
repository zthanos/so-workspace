You are in EXECUTION mode.


Create or update the file:
docs/00_requirements/requirements.inventory.md


Use as authoritative input:
docs/00_brd/brd.md


Purpose:
Derive a complete and structured Requirements Inventory from the Business Requirements Document (BRD).


Inventory rules:
- Extract all relevant requirement items implied or stated in the BRD.
- Classify each item into exactly one of the following types:
- Business Capability
- Business Flow / Scenario
- Actor / Stakeholder
- System / Interface
- Data / Information
- Constraint / Policy
- Non-Functional Intent
- Risk / Open Point
- Do not introduce solution design, technologies, or implementation decisions.
- Do not merge unrelated concepts into a single item.
- If the BRD is ambiguous or incomplete, capture this explicitly in Notes / Ambiguities.


Req-ID rules:
- Generate stable sequential IDs (REQ-01, REQ-02, ...).
- Req-IDs must be unique and reused consistently within the document.


Structure rules:
- Follow exactly the structure defined in the Requirements Inventory artifact.
- Populate the Inventory Items table fully.
- Write clear, concise descriptions in business language.


Return only the content of docs/00_requirements/requirements.inventory.md.
