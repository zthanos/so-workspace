# Docker-Based Structurizr Rendering - Quick Reference

## ✅ What's Been Set Up

You now have a complete Docker-based solution for Structurizr diagram rendering that requires **no local CLI installation**.

### Components

1. **docker-compose.structurizr.yml** - Defines two services:
   - `structurizr-lite`: Web UI for viewing/validating diagrams (port 8080)
   - `structurizr-cli`: CLI tool for rendering diagrams to SVG/PNG

2. **render-diagrams-docker.ps1** - PowerShell script to easily render diagrams

3. **test-structurizr-workflow.ps1** - Automated testing script

4. **STRUCTURIZR_TESTING.md** - Complete documentation

## 🚀 Quick Start

### Start the Services

```powershell
docker-compose -f docker-compose.structurizr.yml up -d
```

This starts both:
- Structurizr Lite at http://localhost:8080
- Structurizr CLI (background service)

### Render All Diagrams

```powershell
./render-diagrams-docker.ps1
```

Output: `docs/03_architecture/diagrams/out/*.svg`

### Render Specific Diagram

```powershell
./render-diagrams-docker.ps1 -File c4_context.dsl
```

### Render to PNG

```powershell
./render-diagrams-docker.ps1 -Format png
```

### View Diagrams in Browser

Open http://localhost:8080 in your browser to:
- View interactive diagrams
- Validate DSL syntax
- Export diagrams manually

### Stop the Services

```powershell
docker-compose -f docker-compose.structurizr.yml down
```

Or use the test script:

```powershell
./test-structurizr-workflow.ps1 -StopDocker
```

## 📋 Available Commands

### VSCode Commands

- **SO: 3-01 Generate C4 Context Diagram** - Generate context diagram DSL
- **SO: 3-02 Generate C4 Container Diagram** - Generate container diagram DSL
- **SO: 3-03 Render Diagrams (Local)** - Render using local CLI (if installed)
- **SO: 3-07 Validate Structurizr DSL Files** - Validate against server

### PowerShell Scripts

```powershell
# Complete workflow test (starts Docker, runs tests)
./test-structurizr-workflow.ps1

# Render diagrams using Docker
./render-diagrams-docker.ps1

# Render specific file
./render-diagrams-docker.ps1 -File c4_context.dsl

# Render to PNG
./render-diagrams-docker.ps1 -Format png

# Stop Docker services
./test-structurizr-workflow.ps1 -StopDocker
```

### Direct Docker Commands

```powershell
# Start services
docker-compose -f docker-compose.structurizr.yml up -d

# Check status
docker ps | Select-String structurizr

# View logs
docker logs structurizr-lite
docker logs structurizr-cli

# Render manually
docker exec structurizr-cli /usr/local/structurizr-cli/structurizr.sh export \
  -workspace /workspace/src/c4_context.dsl \
  -format svg \
  -output /workspace/out

# Stop services
docker-compose -f docker-compose.structurizr.yml down
```

## 🎯 Typical Workflow

1. **Generate diagrams** (using agent prompts or VSCode commands)
   - Creates `.dsl` files in `docs/03_architecture/diagrams/src/`

2. **Start Docker services**
   ```powershell
   docker-compose -f docker-compose.structurizr.yml up -d
   ```

3. **View in browser** (optional)
   - Open http://localhost:8080

4. **Render to SVG**
   ```powershell
   ./render-diagrams-docker.ps1
   ```

5. **Check output**
   - Files in `docs/03_architecture/diagrams/out/`

6. **Stop services** (when done)
   ```powershell
   docker-compose -f docker-compose.structurizr.yml down
   ```

## 🔧 Troubleshooting

### Container Won't Start

```powershell
# Check if port 8080 is in use
netstat -ano | Select-String ":8080"

# Remove old containers
docker rm -f structurizr-lite structurizr-cli

# Restart
docker-compose -f docker-compose.structurizr.yml up -d
```

### Rendering Fails

```powershell
# Check CLI container is running
docker ps | Select-String structurizr-cli

# Check logs
docker logs structurizr-cli

# Restart CLI container
docker-compose -f docker-compose.structurizr.yml restart structurizr-cli
```

### Files Not Updating

```powershell
# Ensure volumes are mounted correctly
docker inspect structurizr-cli | Select-String -Pattern "Mounts" -Context 0,10

# Restart with fresh volumes
docker-compose -f docker-compose.structurizr.yml down -v
docker-compose -f docker-compose.structurizr.yml up -d
```

## 📁 File Locations

- **DSL Source Files**: `docs/03_architecture/diagrams/src/*.dsl`
- **Rendered Output**: `docs/03_architecture/diagrams/out/*.svg`
- **Docker Compose**: `docker-compose.structurizr.yml`
- **Render Script**: `render-diagrams-docker.ps1`
- **Test Script**: `test-structurizr-workflow.ps1`
- **Documentation**: `STRUCTURIZR_TESTING.md`

## ✨ Benefits of Docker Approach

- ✅ No local CLI installation required
- ✅ Consistent environment across team
- ✅ Easy to update (just pull new image)
- ✅ Works on Windows, Mac, and Linux
- ✅ Includes both viewing (Lite) and rendering (CLI)
- ✅ Isolated from host system
- ✅ Easy to start/stop services

## 🔗 Resources

- [Structurizr DSL Documentation](https://github.com/structurizr/dsl)
- [Structurizr CLI Documentation](https://github.com/structurizr/cli)
- [Structurizr Lite](https://structurizr.com/help/lite)
- [C4 Model](https://c4model.com/)
- [Complete Testing Guide](STRUCTURIZR_TESTING.md)
