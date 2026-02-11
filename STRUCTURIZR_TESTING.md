# Structurizr DSL Testing Guide

This guide explains how to test the C4 Structurizr DSL migration workflow.

## Prerequisites

- Docker Desktop installed and running
- Node.js and npm installed
- (Optional) Structurizr CLI for rendering

## Quick Start

### Option 1: Automated Testing (Recommended)

Run the automated test script that handles everything:

```powershell
./test-structurizr-workflow.ps1
```

This script will:
1. Start Structurizr Lite in Docker
2. Wait for the server to be ready
3. Validate DSL files exist
4. Run all integration tests
5. Check for Structurizr CLI availability

### Option 2: Docker-Based Rendering (No Local CLI Install Required)

Render diagrams using Docker without installing Structurizr CLI locally:

```powershell
# Start both Structurizr Lite and CLI containers
docker-compose -f docker-compose.structurizr.yml up -d

# Render all diagrams to SVG
./render-diagrams-docker.ps1

# Render specific diagram
./render-diagrams-docker.ps1 -File c4_context.dsl

# Render to PNG format
./render-diagrams-docker.ps1 -Format png
```

The rendered files will be in `docs/03_architecture/diagrams/out/`

### Option 3: Manual Testing

#### 1. Start Structurizr Lite

```powershell
docker-compose -f docker-compose.structurizr.yml up -d
```

Wait a few seconds for the server to start, then verify it's running:

```powershell
# Check if container is running
docker ps | Select-String structurizr

# Test the server
curl http://localhost:8080
```

#### 2. View Diagrams in Browser

Open http://localhost:8080 in your browser. You should see the Structurizr Lite interface with your diagrams.

#### 3. Run Integration Tests

```powershell
cd tools/so-vsix
npm test -- c4-migration-integration.test.ts
cd ../..
```

#### 4. Validate DSL Files from VSCode

In VSCode, run the command:
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "SO: 3-07 Validate Structurizr DSL Files"
- Press Enter

This will validate all .dsl files against the running Structurizr server.

#### 5. Stop Structurizr Lite

```powershell
docker-compose -f docker-compose.structurizr.yml down
```

Or use the script:

```powershell
./test-structurizr-workflow.ps1 -StopDocker
```

## Integration Test Coverage

The integration test validates:

### ✅ File Generation (Requirements 1.1-1.5)
- Context diagram DSL file exists
- Container diagram DSL file exists
- Files are in correct directory
- Files follow naming convention

### ✅ DSL Structure (Requirements 2.1-2.5)
- Workspace definition present
- Model section with elements
- Views section with diagram definitions
- Valid DSL syntax

### ✅ Context Diagram (Requirements 3.1-3.6)
- Person elements defined
- Software system elements defined
- External systems tagged
- Relationships defined
- SystemContext view configured

### ✅ Container Diagram (Requirements 4.1-4.7)
- Container elements with technology
- Container relationships
- Container view configured

### ✅ Naming Conventions (Requirements 5.1-5.5)
- CamelCase identifiers
- Quoted attributes
- Unique identifiers

### ✅ Relationships (Requirements 6.1-6.2)
- Correct syntax: `source -> destination "description"`
- Technology specifications

### ✅ View Configuration (Requirements 7.1-7.6)
- Appropriate view types
- Include directives
- AutoLayout enabled

### ✅ Validation (Requirements 13.1-13.4)
- Server connectivity
- Error reporting
- Success notifications

### ✅ CLI Integration (Requirements 11.1-11.3)
- CLI availability check
- Error handling

## Troubleshooting

### Server Not Starting

If the Docker container fails to start:

```powershell
# Check Docker logs
docker logs structurizr-lite

# Ensure port 8080 is not in use
netstat -ano | Select-String ":8080"

# Try stopping and restarting
docker-compose -f docker-compose.structurizr.yml down
docker-compose -f docker-compose.structurizr.yml up -d
```

### Validation Fails

If validation tests fail:

1. Ensure Structurizr Lite is running: http://localhost:8080
2. Check DSL file syntax manually in the browser
3. Review validation errors in test output

### Tests Timeout

If tests timeout waiting for the server:

```powershell
# Increase timeout (default is 30 seconds)
./test-structurizr-workflow.ps1 -Timeout 60
```

### Skip Docker Management

If you're managing Docker separately:

```powershell
./test-structurizr-workflow.ps1 -SkipDocker
```

## Structurizr CLI

You have two options for using Structurizr CLI:

### Option 1: Docker (Recommended - No Installation Required)

Use the Docker-based CLI that's included in the docker-compose file:

```powershell
# Start the containers
docker-compose -f docker-compose.structurizr.yml up -d

# Render all diagrams
./render-diagrams-docker.ps1

# Render specific file
./render-diagrams-docker.ps1 -File c4_context.dsl

# Render to different format
./render-diagrams-docker.ps1 -Format png
```

**Advantages:**
- No local installation required
- Consistent environment across team
- Easy to update (just pull new Docker image)
- Works on Windows, Mac, and Linux

### Option 2: Local Installation (Optional)

To render diagrams using a locally installed CLI:

### Installation

1. Download from: https://github.com/structurizr/cli/releases
2. Extract to a directory
3. Add to PATH or configure in VSCode settings:

```json
{
  "so-workspace.diagrams.structurizrCliPath": "C:/path/to/structurizr-cli"
}
```

### Usage (Local CLI)

Once installed, you can render diagrams:

```powershell
# From VSCode: Run "SO: 3-03 Render Diagrams (Local)"
# Or manually:
structurizr-cli export -workspace docs/03_architecture/diagrams/src/c4_context.dsl -format svg -output docs/03_architecture/diagrams/out
```

### Usage (Docker CLI)

Using the Docker-based CLI (no installation required):

```powershell
# Render all diagrams
./render-diagrams-docker.ps1

# Or use docker exec directly
docker exec structurizr-cli /usr/local/structurizr-cli/structurizr.sh export \
  -workspace /workspace/src/c4_context.dsl \
  -format svg \
  -output /workspace/out
```

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start Structurizr Lite
  run: docker-compose -f docker-compose.structurizr.yml up -d

- name: Wait for server
  run: |
    timeout 30 bash -c 'until curl -f http://localhost:8080; do sleep 2; done'

- name: Run integration tests
  run: |
    cd tools/so-vsix
    npm test -- c4-migration-integration.test.ts

- name: Stop Structurizr Lite
  run: docker-compose -f docker-compose.structurizr.yml down
```

## Additional Resources

- [Structurizr DSL Documentation](https://github.com/structurizr/dsl)
- [Structurizr Lite](https://structurizr.com/help/lite)
- [C4 Model](https://c4model.com/)
- [Project Diagrams README](docs/03_architecture/diagrams/README.md)
