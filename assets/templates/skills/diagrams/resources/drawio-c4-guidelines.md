# draw.io C4 Guidance

Use this guidance whenever the active C4 artifact is a `.drawio` file.

---

## Authoring style: Official draw.io C4 template (v29+)

This skill uses the **official draw.io C4 shape library** as shipped with draw.io 29.6.6.
All shapes use `placeholders=1` with structured C4 metadata attributes (`c4Name`, `c4Type`,
`c4Technology`, `c4Description`) and dynamic labels using `%c4Name%` etc.

Do NOT use generic `rounded=1` rectangles. Use the exact shapes and styles defined below.

---

## Colour convention

| Element | Fill | Stroke | Font |
|---|---|---|---|
| Person (internal) | `#083F75` | `#06315C` | `#ffffff` |
| Person (external) | `#6C6477` | `#4D4D4D` | `#ffffff` |
| Software System (internal) | `#1061B0` | `#0D5091` | `#ffffff` |
| Software System (external) | `#8C8496` | `#736782` | `#ffffff` |
| Container (app/service/db) | `#23A2D9` | `#0E7DAD` | `#ffffff` |
| Component | `#63BEF2` | `#2086C9` | `#ffffff` |
| Boundary (System/Container) | `none` (transparent) | `#666666` dashed | `#333333` |
| Relationship connector | — | `#828282` | `#404040` |

---

## Shape definitions

### Person (internal)

```xml
<object placeholders="1" c4Name="Person Name" c4Type="Person" c4Description="Description of person." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="html=1;fontSize=11;dashed=0;whiteSpace=wrap;fillColor=#083F75;strokeColor=#06315C;fontColor=#ffffff;shape=mxgraph.c4.person2;align=center;metaEdit=1;points=[[0.5,0,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0]];resizable=0;" vertex="1">
    <mxGeometry height="180" width="200" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Person (external)

```xml
<object placeholders="1" c4Name="External Person Name" c4Type="Person" c4Description="Description of external person." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="html=1;fontSize=11;dashed=0;whiteSpace=wrap;fillColor=#6C6477;strokeColor=#4D4D4D;fontColor=#ffffff;shape=mxgraph.c4.person2;align=center;metaEdit=1;points=[[0.5,0,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0]];resizable=0;" vertex="1">
    <mxGeometry height="180" width="200" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Software System (internal)

```xml
<object placeholders="1" c4Name="System Name" c4Type="Software System" c4Description="Description of software system." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;fillColor=#1061B0;fontColor=#ffffff;align=center;arcSize=10;strokeColor=#0D5091;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1">
    <mxGeometry height="120" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Software System (external)

```xml
<object placeholders="1" c4Name="External System Name" c4Type="Software System" c4Description="Description of external software system." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#cccccc&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;fillColor=#8C8496;fontColor=#ffffff;align=center;arcSize=10;strokeColor=#736782;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1">
    <mxGeometry height="120" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Container (Application / Service)

```xml
<object placeholders="1" c4Name="Container Name" c4Type="Container" c4Technology="e.g. Node.js" c4Description="Description of container role." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%: %c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#E6E6E6&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="rounded=1;whiteSpace=wrap;html=1;fontSize=11;labelBackgroundColor=none;fillColor=#23A2D9;fontColor=#ffffff;align=center;arcSize=10;strokeColor=#0E7DAD;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1">
    <mxGeometry height="120" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Container (Database / Data Store)

```xml
<object placeholders="1" c4Name="Container Name" c4Type="Container" c4Technology="e.g. PostgreSQL" c4Description="Description of storage role." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%:&amp;nbsp;%c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#E6E6E6&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="shape=cylinder3;size=15;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;labelBackgroundColor=none;fillColor=#23A2D9;fontSize=12;fontColor=#ffffff;align=center;strokeColor=#0E7DAD;metaEdit=1;points=[[0.5,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.5,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];resizable=0;" vertex="1">
    <mxGeometry height="120" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Container (Microservice)

```xml
<object placeholders="1" c4Name="Container Name" c4Type="Container" c4Technology="e.g. Micronaut" c4Description="Description of microservice role." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%:&amp;nbsp;%c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#E6E6E6&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="shape=hexagon;size=50;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;rounded=1;labelBackgroundColor=none;fillColor=#23A2D9;fontSize=12;fontColor=#ffffff;align=center;strokeColor=#0E7DAD;metaEdit=1;points=[[0.5,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.5,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];resizable=0;" vertex="1">
    <mxGeometry height="170" width="200" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Container (Message Bus)

```xml
<object placeholders="1" c4Name="Container Name" c4Type="Container" c4Technology="e.g. Apache Kafka" c4Description="Description of message bus role." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%:&amp;nbsp;%c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#E6E6E6&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="shape=cylinder3;size=15;direction=south;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;labelBackgroundColor=none;fillColor=#23A2D9;fontSize=12;fontColor=#ffffff;align=center;strokeColor=#0E7DAD;metaEdit=1;points=[[0.5,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.5,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];resizable=0;" vertex="1">
    <mxGeometry height="120" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Container (Web Browser)

```xml
<object placeholders="1" c4Name="Container Name" c4Type="Container" c4Technology="e.g. JavaScript, Angular" c4Description="Description of web browser container." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%:&amp;nbsp;%c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;&lt;font color=&quot;#E6E6E6&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="shape=mxgraph.c4.webBrowserContainer2;whiteSpace=wrap;html=1;boundedLbl=1;rounded=0;labelBackgroundColor=none;strokeColor=#118ACD;fillColor=#23A2D9;strokeColor2=#0E7DAD;fontSize=12;fontColor=#ffffff;align=center;metaEdit=1;points=[[0.5,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.5,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];resizable=0;" vertex="1">
    <mxGeometry height="160" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Component

```xml
<object placeholders="1" c4Name="Component Name" c4Type="Component" c4Technology="e.g. Spring Service" c4Description="Description of component role." label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;%c4Name%&lt;/b&gt;&lt;/font&gt;&lt;div&gt;[%c4Type%: %c4Technology%]&lt;/div&gt;&lt;br&gt;&lt;div&gt;&lt;font style=&quot;font-size: 11px&quot;&gt;%c4Description%&lt;/font&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="rounded=1;whiteSpace=wrap;html=1;labelBackgroundColor=none;fillColor=#63BEF2;fontColor=#ffffff;align=center;arcSize=6;strokeColor=#2086C9;metaEdit=1;resizable=0;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1">
    <mxGeometry height="120" width="240" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### System Scope Boundary (C4 Context)

```xml
<object placeholders="1" c4Name="System Name" c4Type="SystemScopeBoundary" c4Application="Software System" label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;&lt;div style=&quot;text-align: left&quot;&gt;%c4Name%&lt;/div&gt;&lt;/b&gt;&lt;/font&gt;&lt;div style=&quot;text-align: left&quot;&gt;[%c4Application%]&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="rounded=1;fontSize=11;whiteSpace=wrap;html=1;dashed=1;arcSize=20;fillColor=none;strokeColor=#666666;fontColor=#333333;labelBackgroundColor=none;align=left;verticalAlign=bottom;labelBorderColor=none;spacingTop=0;spacing=10;dashPattern=8 4;metaEdit=1;rotatable=0;perimeter=rectanglePerimeter;noLabel=0;labelPadding=0;allowArrows=0;connectable=0;expand=0;recursiveResize=0;editable=1;pointerEvents=0;absoluteArcSize=1;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1">
    <mxGeometry height="HEIGHT" width="WIDTH" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Container Scope Boundary (C4 Container)

```xml
<object placeholders="1" c4Name="Container Name" c4Type="ContainerScopeBoundary" c4Application="Container" label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;&lt;div style=&quot;text-align: left&quot;&gt;%c4Name%&lt;/div&gt;&lt;/b&gt;&lt;/font&gt;&lt;div style=&quot;text-align: left&quot;&gt;[%c4Application%]&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell parent="1" style="rounded=1;fontSize=11;whiteSpace=wrap;html=1;dashed=1;arcSize=20;fillColor=none;strokeColor=#666666;fontColor=#333333;labelBackgroundColor=none;align=left;verticalAlign=bottom;labelBorderColor=none;spacingTop=0;spacing=10;dashPattern=8 4;metaEdit=1;rotatable=0;perimeter=rectanglePerimeter;noLabel=0;labelPadding=0;allowArrows=0;connectable=0;expand=0;recursiveResize=0;editable=1;pointerEvents=0;absoluteArcSize=1;points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];" vertex="1">
    <mxGeometry height="HEIGHT" width="WIDTH" x="X" y="Y" as="geometry" />
  </mxCell>
</object>
```

### Relationship (with technology)

```xml
<object placeholders="1" c4Type="Relationship" c4Technology="e.g. JSON/HTTPS" c4Description="e.g. Makes API calls" label="&lt;div style=&quot;text-align: left&quot;&gt;&lt;div style=&quot;text-align: center&quot;&gt;&lt;b&gt;%c4Description%&lt;/b&gt;&lt;/div&gt;&lt;div style=&quot;text-align: center&quot;&gt;[%c4Technology%]&lt;/div&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell edge="1" source="SOURCE_ID" target="TARGET_ID" parent="1" style="endArrow=blockThin;html=1;fontSize=10;fontColor=#404040;strokeWidth=1;endFill=1;strokeColor=#828282;elbow=vertical;metaEdit=1;endSize=14;startSize=14;jumpStyle=arc;jumpSize=16;rounded=0;edgeStyle=orthogonalEdgeStyle;">
    <mxGeometry relative="1" as="geometry" />
  </mxCell>
</object>
```

### Relationship (without technology)

```xml
<object placeholders="1" c4Type="Relationship" c4Description="e.g. Visits pages" label="&lt;div style=&quot;text-align: left&quot;&gt;&lt;div style=&quot;text-align: center&quot;&gt;&lt;b&gt;%c4Description%&lt;/b&gt;&lt;/div&gt;&lt;/div&gt;" id="UNIQUE_ID">
  <mxCell edge="1" source="SOURCE_ID" target="TARGET_ID" parent="1" style="endArrow=blockThin;html=1;fontSize=10;fontColor=#404040;strokeWidth=1;endFill=1;strokeColor=#828282;elbow=vertical;metaEdit=1;endSize=14;startSize=14;jumpStyle=arc;jumpSize=16;rounded=0;edgeStyle=orthogonalEdgeStyle;">
    <mxGeometry relative="1" as="geometry" />
  </mxCell>
</object>
```

---

## Placeholder attribute rules

Every shape uses the `<object>` wrapper with these attributes:

| Attribute | Required for | Description |
|---|---|---|
| `placeholders="1"` | All shapes | Enables `%placeholder%` substitution in labels |
| `c4Name` | Person, System, Container, Component, Boundary | Display name |
| `c4Type` | All shapes | `Person`, `Software System`, `Container`, `Component`, `SystemScopeBoundary`, `ContainerScopeBoundary`, `Relationship` |
| `c4Technology` | Container, Component, Relationship (when tech applies) | Technology name, e.g. `Node.js`, `PostgreSQL` |
| `c4Description` | Person, System, Container, Component | One-sentence description |
| `c4Application` | Boundaries | `Software System` or `Container` |

The `label` attribute on the `<object>` element renders the visible text using these placeholders — do not put raw text in `value` on the `<mxCell>` for C4 shapes.

---

## C4 Level Discipline

### C4 Context (Level 1)
Include **only**:
- People (internal + external) — `Person` shapes
- The system of interest — `Software System` (internal, blue `#1061B0`)
- External systems — `Software System` (external, grey `#8C8496`)
- A `SystemScopeBoundary` around the system of interest

**Never include:** containers, components, databases, APIs, protocols, cloud product names.

### C4 Container (Level 2)
Include **only**:
- People (actors) — outside the boundary
- Internal containers — inside a `ContainerScopeBoundary`
  - App/service → rounded rectangle `#23A2D9`
  - Database → cylinder `#23A2D9`
  - Microservice → hexagon `#23A2D9`
  - Message bus → horizontal cylinder `#23A2D9`
  - Web browser → `mxgraph.c4.webBrowserContainer2`
- External systems — outside the boundary, grey `#8C8496`

**Critical rule:** External systems must be **outside** the boundary. Never place them inside.

**Never include:** components, classes, internal code detail.

---

## Layout rules

### Canvas
- Context diagram: `pageWidth=1400 pageHeight=900`
- Container diagram: `pageWidth=1600 pageHeight=1200`

### Positioning
- Boundary: centred on canvas
- Actors: above or left of boundary, outside
- External systems: below or right of boundary, outside
- Inside boundary (container level) — layer top to bottom:
  1. UI (web browser, mobile)
  2. API / Gateway
  3. Services / Microservices
  4. Data (database, cache, message bus)

### Spacing
- Min gap between shapes: 80px horizontal, 60px vertical
- Boundary padding: 40px all sides around its contents

### Relationships — connector routing & crossing avoidance

Always use `orthogonalEdgeStyle` (right-angle routing). Never use diagonal lines.

**Crossing avoidance is a first-class layout concern.** Apply these strategies before placing connectors:

#### 1. Position shapes to make crossings structurally impossible

The best way to avoid crossings is to arrange shapes so that connectors never need to cross:

- **Actors** connect only to UI layer shapes → place actors directly left/above the UI layer, not below or beside service layers
- **External systems** connect only to service/data layer shapes → place them directly right/below the layer they connect to
- **Vertical flow inside boundary**: UI → API → Services → Data — connectors flow straight down, no crossings
- **One external system per connection target**: if two services connect to different external systems, place each external system at the same horizontal level as its service counterpart

#### 2. Assign connector exit/entry points explicitly

Use `exitX`, `exitY`, `entryX`, `entryY` on connectors to control which side of a shape the connector attaches to:

- Downward flow (UI → API → Services → Data): `exitX=0.5;exitY=1` (bottom centre) → `entryX=0.5;entryY=0` (top centre)
- Rightward flow (Services → External systems): `exitX=1;exitY=0.5` (right centre) → `entryX=0;entryY=0.5` (left centre)
- Leftward flow (Actor → System): `exitX=1;exitY=0.5` → `entryX=0;entryY=0.5`

Example connector with explicit entry/exit:
```xml
style="endArrow=blockThin;html=1;fontSize=10;fontColor=#404040;strokeWidth=1;endFill=1;
strokeColor=#828282;elbow=vertical;metaEdit=1;endSize=14;startSize=14;
jumpStyle=arc;jumpSize=16;rounded=0;edgeStyle=orthogonalEdgeStyle;
exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
```

#### 3. Use waypoints to route around obstacles

When a crossing cannot be avoided structurally, add intermediate `mxPoint` waypoints inside the `<mxGeometry>` to route the connector around other shapes:

```xml
<mxGeometry relative="1" as="geometry">
  <Array as="points">
    <mxPoint x="MIDPOINT_X" y="MIDPOINT_Y"/>
  </Array>
</mxGeometry>
```

Route waypoints along the edge of the canvas or through empty space, not through other shapes.

#### 4. When a crossing is unavoidable — use jump arcs

If two connectors must cross and cannot be rerouted, add `jumpStyle=arc;jumpSize=16;` to both connectors. This renders a small arc where lines cross, making the diagram readable. This is already included in the standard relationship style.

#### 5. Ordering rule for multiple actors

When multiple actors connect to the same layer (e.g. Player, Coach, Venue Operator all connect to the Web App):
- Stack actors **vertically** on the left side, each aligned with the shape they primarily connect to
- Do NOT fan out from a single point — this creates crossings

#### Summary checklist before finalising layout:

| Check | Action |
|---|---|
| Do all vertical flows go straight down within the boundary? | ✓ Layer shapes vertically aligned |
| Do all actor→UI connectors flow straight right? | ✓ Actors on the same row as their target |
| Do all service→external connectors flow straight right? | ✓ External systems on the same row as their source service |
| Are there any connectors that cross? | ✗ Reroute with waypoints or reposition the shape |
| If crossing unavoidable? | ✓ Add `jumpStyle=arc;jumpSize=16;` |

---

## Standard sizes

| Shape type | Width | Height |
|---|---|---|
| Person | 200 | 180 |
| Software System | 240 | 120 |
| Container (app/service) | 240 | 120 |
| Container (database/cylinder) | 240 | 120 |
| Container (microservice/hexagon) | 200 | 170 |
| Container (message bus) | 240 | 120 |
| Container (web browser) | 240 | 160 |
| Component | 240 | 120 |

---

## Diagram title block

Add a title text cell at bottom-left of each diagram:

```xml
<object placeholders="1" c4Name="[System Context] Diagram Title" c4Type="ContainerScopeBoundary" c4Description="Diagram short description" label="&lt;font style=&quot;font-size: 16px&quot;&gt;&lt;b&gt;&lt;div style=&quot;text-align: left&quot;&gt;%c4Name%&lt;/div&gt;&lt;/b&gt;&lt;/font&gt;&lt;div style=&quot;text-align: left&quot;&gt;%c4Description%&lt;/div&gt;" id="title">
  <mxCell parent="1" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;whiteSpace=wrap;rounded=0;metaEdit=1;allowArrows=0;resizable=1;rotatable=0;connectable=0;recursiveResize=0;expand=0;pointerEvents=0;" vertex="1">
    <mxGeometry height="40" width="260" x="40" y="NEAR_BOTTOM" as="geometry" />
  </mxCell>
</object>
```

---

## Common mistakes to avoid

| Mistake | Correct approach |
|---|---|
| Using generic `rounded=1` without `<object>` wrapper | Always wrap in `<object placeholders="1" ...>` |
| Hardcoding text in `value` on `mxCell` | Put `label` on the `<object>` using `%c4Name%` placeholders |
| Omitting `c4Type` attribute | Always set `c4Type` — it drives the label tag display |
| External systems inside the boundary | External shapes always live outside the boundary |
| Unlabelled relationships | Every `Relationship` needs at least `c4Description` |
| Missing `c4Technology` on containers | Containers always show technology in their type tag |
| Mixing C4 levels | One level per diagram — never mix Context and Container elements |
| Using wrong shape for database | Use `shape=cylinder3` not `rounded=1` for data stores |
| Using wrong colour for external vs internal | Internal = blue family, External = grey/purple family |
