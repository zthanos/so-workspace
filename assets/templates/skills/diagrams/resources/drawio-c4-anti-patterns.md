# draw.io C4 Anti-Patterns

Never generate these patterns:

- Generic rectangles instead of official C4 stencil styles
- Hardcoded text in `mxCell value` for C4 elements instead of placeholder-based labels
- External systems inside the system or container boundary
- Mixed C4 levels on the same page
- Diagonal connectors when orthogonal routing is possible
- Unlabelled relationships
- Containers without technology tags on container-level diagrams
- Long paragraph labels inside shapes
- Random colors not aligned with the C4 palette
- Boundary labels centered like normal nodes instead of aligned like scope labels
- Overlapping shapes or labels
- Connectors passing through shapes when layout can be adjusted
- Multiple unrelated boundaries in a single simple C4 context diagram
- Decorative cloud/provider icons in a pure C4 context/container diagram unless explicitly requested

If any of these appear in an existing file during update or patch:
- correct them only when necessary for the requested change or reported issue
- preserve editability and avoid broad cosmetic churn
