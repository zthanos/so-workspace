# BPMN Layout Patterns

## Default orientation

- Prefer left-to-right process flow
- Put the primary happy path on the visual spine of the diagram
- Place exception branches above or below the main path

## Pool and lane structure

- Pools should be stacked vertically for collaboration diagrams
- Lanes should be sized to fit tasks without dense packing
- Keep each participant's tasks inside its own pool/lane hierarchy

## Flow patterns

- Start -> task chain -> gateway -> branch -> merge -> end
- Keep merges visually near the branches they close
- Align gateway centers with the flows they split or merge

## Communication patterns

- Message flows should be short and visually obvious
- Avoid routing message flows through the middle of unrelated pools
- Put communicating tasks roughly opposite each other across pools when possible

## Labeling patterns

- Task labels: short verb-noun phrases
- Gateway edge labels: business condition text
- Pool and lane labels: participant/role names
