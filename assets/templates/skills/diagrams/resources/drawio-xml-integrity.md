# draw.io XML Integrity Rules

The generated file must remain easy to open and edit in draw.io.

## Required structure

- Use uncompressed XML.
- Root structure:
  - `<mxfile>`
  - `<diagram>`
  - `<mxGraphModel>`
  - `<root>`
  - `<mxCell id="0"/>`
  - `<mxCell id="1" parent="0"/>`

## Cell rules

- Every visual element has a unique `id`.
- Every vertex has `vertex="1"`.
- Every edge has `edge="1"`.
- Every shape inside a boundary must set `parent` to the boundary cell id.
- Every edge must define `source` and `target`.
- Every geometry element must use `as="geometry"`.

## Label rules

- For C4 shapes, labels belong on the `<object>` wrapper, not as raw free text on the inner `mxCell`.
- Use placeholder-driven labels with `placeholders="1"`.
- Keep labels HTML-safe and escaped correctly.

## Editing safety

- Preserve existing ids when updating elements unless replacement is necessary.
- Avoid random rewrites of style order or XML ordering when patching small issues.
- Keep the output to a single editable page unless the user explicitly requests multiple pages.
