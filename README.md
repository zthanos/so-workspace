# SO Workspace VSIX Extension

A Visual Studio Code extension that provides a **deterministic, step-by-step workflow** for producing enterprise-grade Solution Outlines from Business Requirements Documents (BRDs).

This extension packages all runtime assets (prompts, templates, rules) internally and operates on external project workspaces, keeping your projects clean and focused on generated artifacts.

---

## Features

- **Ordered Workflow**: Enforced execution sequence from requirements to solution outline
- **Review-Driven**: Each stage produces artifacts that are validated before progressing
- **Architecture-Safe**: Prevents architectural drift through structured inputs and derived outputs
- **Workspace Initialization**: One-command setup for new SO projects
- **Asset Management**: All extension assets are packaged internally, no workspace pollution
- **SO Participant**: `@so` acts as the user-facing workflow entry point inside chat
- **Workspace Skills**: Initialized workspaces use `.github/skills` as the active skill source
- **Document Conversion**: Convert `.docx` and `.pdf` source documents to Markdown inside the workspace

---

## Installation

### From VSIX Package

1. Download the latest `.vsix` file from releases
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the "..." menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file

### From Source

```bash
# Clone the repository
git clone https://github.com/zthanos/so-workspace.git
cd so-workspace

# Install dependencies
npm install

# Build the extension
npm run compile

# Package the extension
npm run package

# Install the generated .vsix file in VS Code
```

### Local Diagram Containers

The recommended local rendering setup uses Docker containers:

- `.puml` diagrams render through a local Kroki container at `http://localhost:8000`
- `.dsl` Structurizr diagrams render through a local `structurizr/cli` container

Start the local rendering stack:

```bash
docker compose -f docker-compose.structurizr.yml up -d
```

Verify the containers:

```bash
docker compose -f docker-compose.structurizr.yml ps
```

Stop the stack:

```bash
docker compose -f docker-compose.structurizr.yml down
```

The bundled [docker-compose.structurizr.yml](docker-compose.structurizr.yml) starts:

- `kroki` using `yuzutech/kroki:latest`
- `structurizr-cli` using `structurizr/cli:latest`

Expected VS Code settings for the local container workflow:

- `diagramPreviewer.krokiEndpoint`: `http://localhost:8000`
- `so-workspace.diagrams.structurizrCliContainer`: `structurizr-cli`
- `so-workspace.diagrams.structurizrCliPath`: `/usr/local/structurizr-cli/structurizr.sh`

### Required Local Tools for Diagram Rendering

Legacy note: the section below describes older host-tooling options. For current local rendering, prefer the Docker-based setup in `Local Diagram Containers` above.

The extension uses **local rendering** for all diagram types by default, with no external API dependencies—ensuring offline operation and data privacy. Server URLs (PlantUML, Structurizr) exist in settings for optional use; the recommended path is local tools only.

#### Required Tools

1. **Java Runtime Environment (JRE)**
   - Required for PlantUML rendering
   - Version 8 or higher recommended
   - Download: https://www.oracle.com/java/technologies/downloads/

2. **PlantUML JAR**
   - Required for PlantUML diagram rendering
   - Default location: `tools/plantuml/plantuml-1.2026.1.jar` (relative to workspace root)
   - Download latest: https://plantuml.com/download
   - Configure path in settings: `so-workspace.diagrams.java.plantUmlJarPath`

3. **Mermaid CLI**
   - **Required separate installation** - Must be installed by the user
   - The extension will automatically detect your mermaid-cli installation
   - Install globally (recommended):
     ```bash
     npm install -g @mermaid-js/mermaid-cli
     ```
   - Or install in your project:
     ```bash
     npm install --save-dev @mermaid-js/mermaid-cli
     ```
   - Configure custom path in settings: `so-workspace.diagrams.java.mermaidCliPath` (default: `mmdc` enables auto-detection)

4. **Docker**
   - Required for Structurizr DSL rendering
   - Download: https://www.docker.com/products/docker-desktop
   - Used to run Structurizr CLI containers defined in `docker-compose.structurizr.yml`

#### Docker Setup for Structurizr

To render Structurizr DSL files (`.dsl`), you need Docker running with the Structurizr containers:

```bash
# Start Structurizr containers
docker-compose -f docker-compose.structurizr.yml up -d

# Verify containers are running
docker ps

# Stop containers when done
docker-compose -f docker-compose.structurizr.yml down
```

The extension will automatically use the Docker containers for Structurizr rendering. Configure the container name and CLI path in settings if needed:
- `so-workspace.diagrams.structurizrCliContainer` (default: `structurizr-cli`)
- `so-workspace.diagrams.structurizrCliPath` (default: `/usr/local/structurizr-cli/structurizr.sh`)

#### Configuration

All local tool paths can be configured in VS Code settings (File → Preferences → Settings → SO Workspace Diagrams):

- **PlantUML JAR Path**: Path to PlantUML JAR file (relative to workspace root)
- **Mermaid CLI Path**: Path to `mmdc` executable (default: `mmdc` enables auto-detection)
  - The extension automatically detects mermaid-cli in this order:
    1. Custom configured path (if not default "mmdc")
    2. Project-local installation (`node_modules/.bin/mmdc`)
    3. Global npm installation
- **Java Path**: Path to Java executable (default: `java` in PATH)
- **Structurizr CLI Container**: Docker container name for Structurizr CLI
- **Structurizr CLI Path**: Path to structurizr.sh inside the container

---

## Getting Started

### 1. Initialize a New SO Workspace

Open an empty folder in VS Code and run:

**Command Palette** (Ctrl+Shift+P): `SO: 0-02 Initialize SO Workspace Structure`

This creates the required folder structure and template files:

```
inbox/
 └─ brd/
docs/
 ├─ 00_brd/
 ├─ 01_requirements/
 ├─ 02_objectives/
 │   └─ flows.yaml
 ├─ 03_architecture/
 │   └─ diagrams/
 │       └─ src/
 │           ├─ seq/
 │           └─ flow/
 ├─ project_information.md
 ├─ README_SO_Workspace.md
 └─ .so-workspace.json
```

### 2. Follow the Ordered Workflow

The extension provides numbered commands that should be executed in sequence. See the complete workflow in your workspace's `docs/README_SO_Workspace.md` after initialization.

### 2a. Use the `@so` Participant

After workspace initialization, the recommended chat entry point is the sticky `@so` participant.

The participant loads:

- the workspace guidance from `docs/so_agent_context.md`
- the active workspace skills from `.github/skills`

The participant supports these workflow operations:

- `/generate` to create an artifact
- `/eval` to review an artifact and produce an inconsistencies report
- `/update` to directly change an artifact without going through a report first
- `/patch` to apply fixes based on the latest report
- `/recheck` to run the evaluation again after changes

Typical examples:

```text
@so /generate requirements inventory from the BRD
@so /eval objectives
@so /update c4 context diagram to include the mobile app and identity provider
@so /patch solution outline
@so /recheck adr
```

Recommended usage model:

- use `@so` for day-to-day artifact generation and updates
- use the numbered command palette commands when you want explicit stage-by-stage actions
- keep workspace-specific skill changes in `.github/skills` so the participant follows the project’s current rules
- keep `docs/99_references` populated with approved reference architecture material so the participant can use it for diagrams, routing rules, and related architectural outputs

### 2b. Skills in the Workspace

When you initialize a workspace, the extension copies the active skill set into:

```text
.github/skills/
```

That workspace folder is the source of truth for runtime skill behavior. This makes it possible to adjust prompts, templates, and resources per project without changing the extension itself.

Skill-owned resources now include the active prompts and report templates used by the workflow.

### 3. How It Works (Standard User Journey)

The SO Workspace extension provides a structured and deterministic workflow for transforming a Business Requirements Document (BRD) into a validated Solution Outline package.

A typical architect journey follows these steps:

1. Install the extension in VS Code.
2. Create an empty workspace folder.
3. Run the **Initialize SO Workspace Structure** command.
4. Place the BRD document into the `inbox/brd/` folder.
5. Execute the **Convert Word to Markdown** command to produce a canonical BRD version.
6. If the source BRD is a PDF instead of a Word document, use **Convert PDF to Markdown** to produce the canonical BRD version.
7. Progress through each stage of the workflow (Requirements → Objectives → Architecture → Decisions) using the **Generate → Evaluate → Patch → Recheck** sequence.
8. Use the `discussions/` folder to capture meeting clarifications and project-specific updates not originally present in the BRD.
9. Use the `references/` folder to apply approved reference architectures, patterns, and decision tables.
10. Produce a structured, review-ready Solution Outline with diagrams and supporting artifacts.

This structured approach ensures:

- **Consistency** across projects
- **Traceability** from requirements to architecture
- **Controlled updates** and iterative refinement
- **Alignment** between business, architecture, and engineering teams

The result is not just a document, but a standardized architectural artifact set ready for enterprise communication and governance.

![Standard user journey flowchart](assets/standard-user-journey.png)

---

## Mermaid Diagram Support

The extension includes built-in support for validating and rendering Mermaid diagrams locally.

### Diagram Type Declarations

All Mermaid diagram files (`.mmd`) **must** begin with a valid diagram type declaration. This is the first non-comment line in your file.

**Valid diagram type declarations:**

```
sequenceDiagram
flowchart TD
graph LR
classDiagram
stateDiagram-v2        # Recommended (stateDiagram is legacy)
erDiagram
journey
gantt
pie
gitGraph
mindmap
timeline
quadrantChart
requirementDiagram
C4Context
C4Container
C4Component
C4Dynamic
C4Deployment
```

**Note:** `stateDiagram` (without -v2) is a legacy version. Use `stateDiagram-v2` for better compatibility with current Mermaid versions.

**Example valid Mermaid file:**

```mermaid
sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System-->>User: Response
```

**Example invalid Mermaid file (missing type):**

```
%% This will fail validation
participant User
participant System
User->>System: Request
```

### Automatic Syntax Repair

If you have Mermaid files missing diagram type declarations, use the repair command:

**Command Palette** (Ctrl+Shift+P): `SO: Fix Mermaid Diagram Syntax`

This command will:
1. Scan all `.mmd` files in your workspace
2. Detect files missing diagram type declarations
3. Analyze content to infer the correct diagram type
4. Automatically prepend the diagram type (for high/medium confidence)
5. Create `.bak` backup files before modifying
6. Report files requiring manual intervention (low confidence)

**Repair confidence levels:**
- **High confidence**: Unique keywords detected (e.g., "participant" → sequenceDiagram)
- **Medium confidence**: Common patterns detected (e.g., "class" → classDiagram)
- **Low confidence**: Ambiguous content, manual review required

### Local Rendering

The extension renders all diagrams locally using the following tools:
- **Mermaid diagrams (.mmd)**: Rendered using the built-in webview renderer and Kroki where applicable
- **PlantUML diagrams (.puml)**: Rendered using a local Kroki container
- **Structurizr DSL (.dsl)**: Rendered using a local Docker-based Structurizr CLI container

All diagrams are validated before rendering to catch syntax errors early. No external APIs or cloud services are used for rendering, ensuring complete offline operation and data privacy.

### Diagram Preview

The extension includes a **Diagram Preview** that renders Mermaid and other diagram sources in a side panel. You can open it from the editor or via the preview command. Settings under SO Workspace Diagrams control behavior: `diagramPreviewer.autoOpenPreview` (open preview when diagram files are opened), `diagramPreviewer.debounceDelay` (live-update delay in ms), and `diagramPreviewer.cacheSize` (number of rendered diagrams to cache).

---

## Extension Development

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- VS Code 1.109.0 or higher

### Project Structure

```
repository-root/
├── src/                      # Extension source code
│   ├── extension.ts         # Extension entry point
│   ├── asset-resolver.ts    # Asset path resolution
│   ├── workspace-initializer.ts  # Workspace setup
│   └── commands/            # Command handlers
├── assets/                   # Runtime assets (packaged with extension)
│   ├── agent/               # Prompts and rules
│   └── templates/           # Document templates
├── package.json             # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

### Build Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm test

# Package extension
npm run package

# Verify VSIX contents
npm run verify-vsix
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Asset Resolution

The extension uses a centralized `AssetResolver` to locate runtime assets:

```typescript
import { AssetResolver } from './asset-resolver';

// In your command handler
const assetResolver = new AssetResolver(context);
const promptUri = assetResolver.getPromptPath('01_requirements/00_extract_requirements_inventory.prompt.md');
const content = await assetResolver.readAsset(promptUri);
```

All assets are resolved using the extension installation path, ensuring they work regardless of workspace structure.

---

## Contributing

For the Diagram Previewer feature (webview, renderers, cache), see [src/diagram-previewer/README.md](src/diagram-previewer/README.md).

### Adding New Commands

1. Create command handler in `src/commands/`
2. Use `AssetResolver` for any asset access
3. Register command in `src/extension.ts`
4. Add command to `package.json` contributes section
5. Update documentation

### Adding New Assets

1. Place assets in appropriate `assets/` subdirectory:
   - Prompts: `assets/agent/prompts/`
   - Templates: `assets/templates/`
   - Rules: `assets/agent/rules/`
2. Access via `AssetResolver` methods
3. Verify inclusion in VSIX with `npm run verify-vsix`

---

## Troubleshooting

### Mermaid CLI Installation Issues

If you see errors about mermaid-cli not being found:

1. **Verify mermaid-cli is installed**:
   ```bash
   # Check global installation
   npm list -g @mermaid-js/mermaid-cli
   
   # Check project-local installation
   npm list @mermaid-js/mermaid-cli
   ```

2. **Install mermaid-cli if missing**:
   ```bash
   # Global installation (recommended)
   npm install -g @mermaid-js/mermaid-cli
   
   # Or project-local installation
   npm install --save-dev @mermaid-js/mermaid-cli
   ```

3. **Verify mmdc is accessible**:
   ```bash
   # Test the command
   mmdc --version
   ```

4. **Check detection order**:
   - The extension searches for mermaid-cli in this order:
     1. Custom path configured in settings (if not "mmdc")
     2. Project `node_modules/.bin/mmdc`
     3. Global npm installation
   - If you have multiple installations, the extension uses the first one found

5. **Configure custom path** (if needed):
   - Open VS Code Settings (File → Preferences → Settings)
   - Search for "SO Workspace Diagrams"
   - Set "Mermaid CLI Path" to your custom installation path
   - Example: `/usr/local/bin/mmdc` or `C:\Users\YourName\AppData\Roaming\npm\mmdc.cmd`

6. **Platform-specific notes**:
   - **Windows**: The extension looks for `mmdc.cmd`
   - **macOS/Linux**: The extension looks for `mmdc`
   - Ensure the executable has proper permissions on Unix systems: `chmod +x /path/to/mmdc`

7. **Reload VS Code** after installing mermaid-cli to ensure the extension detects it

If problems persist, check the Output panel (View → Output → SO Workspace) for detailed error messages.

### Extension Can't Find Assets

If you see errors about missing assets:

1. Verify the extension is properly installed
2. Try reinstalling the extension
3. Check that assets are included in the VSIX package
4. Run `npm run verify-vsix` during development

### Workspace Initialization Fails

If workspace initialization fails:

1. Ensure you have write permissions in the workspace folder
2. Check that the workspace is not read-only
3. Try closing and reopening VS Code
4. Check the Output panel (View → Output → SO Workspace) for detailed errors

---

## License

See [LICENSE.md](LICENSE.md) in the repository.

---

## Support

For issues, questions, or contributions, please visit the repository issue tracker.
