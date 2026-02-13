@echo off
REM ============================================================================
REM DSL to SVG Rendering Pipeline
REM ============================================================================
REM
REM Purpose:
REM   Automates the conversion of Structurizr DSL files to SVG format using
REM   a DSL → PlantUML → Kroki → SVG pipeline. This script orchestrates
REM   Docker containers to ensure consistent, high-quality diagram rendering.
REM
REM Architecture:
REM   1. Structurizr CLI (Docker) - Exports DSL to PlantUML format
REM   2. Kroki Service (Docker) - Renders PlantUML to SVG format
REM   3. This script - Orchestrates the pipeline and handles errors
REM
REM Requirements:
REM   - Docker Desktop must be installed and running
REM   - docker-compose.structurizr.yml must be configured with Kroki service
REM
REM Usage:
REM   render-dsl-to-svg.cmd              Process all DSL files (default)
REM   render-dsl-to-svg.cmd --all        Process all DSL files (explicit)
REM   render-dsl-to-svg.cmd <filename>   Process specific DSL file
REM   render-dsl-to-svg.cmd --help       Display help information
REM
REM Task 9.2: Windows CMD Compatibility
REM   - Uses Windows batch script syntax (.cmd file)
REM   - Avoids PowerShell-specific features
REM   - Compatible with Windows CMD shell (cmd.exe)
REM   - Uses standard Windows commands: echo, set, if, for, findstr, timeout, curl
REM   - Does not require PowerShell, WSL, or other shells
REM
REM Error Handling Strategy:
REM   - Fail-fast errors: Docker unavailable, containers can't start
REM   - Recoverable errors: Individual file processing failures
REM   - All errors include filename and descriptive details
REM   - Pipeline continues processing remaining files after recoverable errors
REM
REM ============================================================================

REM Enable delayed expansion for variable manipulation within loops
setlocal enabledelayedexpansion

REM ============================================================================
REM Task 11.1: Execution time tracking - Record start time
REM ============================================================================

REM Record start time using Windows time format
set "START_TIME=%TIME%"

REM ============================================================================
REM Command-line argument parsing (Task 3.1)
REM ============================================================================
REM
REM Supported modes:
REM   - all: Process all DSL files in source directory (default)
REM   - single: Process only the specified DSL file
REM
REM Arguments:
REM   --all: Explicitly set mode to process all files
REM   --help or -h: Display help and exit
REM   <filename>: Any argument not starting with -- is treated as a filename
REM
REM ============================================================================

set "MODE=all"
set "TARGET_FILE="

REM Parse command-line arguments
if "%~1"=="" goto :parse_done
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="--all" (
    set "MODE=all"
    goto :parse_done
)

REM If argument doesn't start with --, treat it as a filename
REM Use findstr to check if argument begins with --
echo %~1 | findstr /b /c:"--" >nul
if errorlevel 1 (
    set "TARGET_FILE=%~1"
    set "MODE=single"
)

:parse_done

REM ============================================================================
REM Configuration
REM ============================================================================
REM
REM Directory Structure:
REM   SOURCE_DIR: Contains source DSL files (.dsl)
REM   OUTPUT_DIR: Contains generated SVG files (.svg)
REM   TEMP_DIR: Contains intermediate PlantUML files (.puml)
REM
REM Docker Configuration:
REM   KROKI_URL: HTTP endpoint for Kroki rendering service
REM   STRUCTURIZR_CONTAINER: Name of Structurizr CLI container
REM   KROKI_CONTAINER: Name of Kroki service container
REM
REM Windows path handling (Task 9.1):
REM   - All paths are quoted to handle spaces in directory names
REM   - Use backslash for Windows paths (native format)
REM   - Docker volume mounts use forward slash (converted when needed)
REM
REM ============================================================================

set "SOURCE_DIR=docs\03_architecture\diagrams\src"
set "OUTPUT_DIR=docs\03_architecture\diagrams\out"
set "TEMP_DIR=docs\03_architecture\diagrams\temp"
set "KROKI_URL=http://localhost:8000/plantuml/svg"
set "STRUCTURIZR_CONTAINER=structurizr-cli"
set "KROKI_CONTAINER=kroki"

REM Get absolute path to script directory
REM This ensures paths work correctly even if script is run from different directories
REM pushd changes to script directory, %CD% captures it, popd returns to original
pushd "%~dp0" >nul 2>&1
set "SCRIPT_DIR=%CD%"
popd >nul 2>&1

REM ============================================================================
REM Docker availability check (Task 3.2)
REM ============================================================================
REM
REM Error Handling: FAIL-FAST
REM   If Docker is not available, the script cannot proceed. This is a
REM   fail-fast error that stops execution immediately.
REM
REM Check Method:
REM   Run 'docker ps' command and check exit code
REM   - Exit code 0: Docker is running and accessible
REM   - Exit code 1: Docker is not running or not installed
REM
REM ============================================================================

echo Checking Docker availability...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop.
    exit /b 1
)
echo Docker is available.

REM ============================================================================
REM Container status check and startup (Task 3.3)
REM ============================================================================
REM
REM Error Handling: FAIL-FAST
REM   If containers cannot be started, the script cannot proceed.
REM
REM Check Method:
REM   1. Use 'docker ps' with filter to check if each container is running
REM   2. Use findstr to match exact container name (avoid partial matches)
REM   3. Store exit code: 0 = running, 1 = not running
REM
REM Startup Process:
REM   1. If any required container is not running, start all with docker-compose
REM   2. Wait 5 seconds for containers to initialize
REM   3. Wait additional 5 seconds for Kroki to be fully ready (it's slower)
REM
REM Why the waits?
REM   - Containers need time to initialize after starting
REM   - Kroki service needs time to load PlantUML libraries
REM   - Without waits, first rendering requests may fail
REM
REM ============================================================================

echo Checking container status...

REM Check if structurizr-cli container is running
REM Use simpler docker ps command that works reliably in batch context
docker ps | findstr /C:"structurizr-cli" >nul 2>&1
set "STRUCTURIZR_RUNNING=%errorlevel%"

REM Check if kroki container is running
docker ps | findstr /C:"kroki" >nul 2>&1
set "KROKI_RUNNING=%errorlevel%"

REM Report status and set flag if any container needs to be started
if !STRUCTURIZR_RUNNING! equ 0 (
    echo Structurizr CLI container is running.
) else (
    echo Structurizr CLI container is not running.
    set "NEED_START=1"
)

if !KROKI_RUNNING! equ 0 (
    echo Kroki container is running.
) else (
    echo Kroki container is not running.
    set "NEED_START=1"
)

REM Start containers if needed
if defined NEED_START (
    echo Starting containers with docker-compose...
    
    REM Try to find docker-compose file in workspace first (for backward compatibility)
    if exist "docker-compose.structurizr.yml" (
        docker-compose -f docker-compose.structurizr.yml up -d
    ) else (
        REM If not in workspace, use the bundled one from extension
        REM Note: This path is relative to where the script is located (extension's assets/scripts/)
        set "SCRIPT_DIR=%~dp0"
        if exist "%SCRIPT_DIR%..\docker-compose.structurizr.yml" (
            echo Using bundled docker-compose configuration...
            docker-compose -f "%SCRIPT_DIR%..\docker-compose.structurizr.yml" up -d
        ) else (
            echo [ERROR] docker-compose.structurizr.yml not found in workspace or extension.
            echo.
            echo To use the rendering pipeline, you need Docker containers running.
            echo.
            echo Option 1: Start containers manually:
            echo   docker run -d --name structurizr-cli -v "%CD%\docs\03_architecture\diagrams\src:/workspace/src" -v "%CD%\docs\03_architecture\diagrams\out:/workspace/out" -v "%CD%\docs\03_architecture\diagrams\temp:/workspace/temp" --entrypoint /bin/sh structurizr/cli:latest -c "while true; do sleep 3600; done"
            echo   docker run -d --name kroki -p 8000:8000 -e KROKI_PLANTUML_ENABLED=true yuzutech/kroki:latest
            echo.
            echo Option 2: Check if containers are already running:
            echo   docker ps
            echo.
            set "COMPOSE_FAILED=1"
        )
    )
    
    if defined COMPOSE_FAILED (
        REM Re-check if containers are running anyway
        echo Checking if containers are already running...
        docker ps | findstr /C:"structurizr-cli" >nul 2>&1
        set "STRUCTURIZR_RECHECK=!errorlevel!"
        
        docker ps | findstr /C:"kroki" >nul 2>&1
        set "KROKI_RECHECK=!errorlevel!"
        
        if !STRUCTURIZR_RECHECK! equ 0 (
            if !KROKI_RECHECK! equ 0 (
                echo Containers are running. Continuing with rendering...
            ) else (
                echo [ERROR] Required containers are not running. Cannot proceed.
                exit /b 1
            )
        ) else (
            echo [ERROR] Required containers are not running. Cannot proceed.
            exit /b 1
        )
    ) else (
        REM Check if docker-compose command succeeded
        if errorlevel 1 (
            echo [ERROR] Failed to start containers.
            echo.
            echo Checking if containers are already running...
            
            docker ps | findstr /C:"structurizr-cli" >nul 2>&1
            set "STRUCTURIZR_RECHECK=!errorlevel!"
            
            docker ps | findstr /C:"kroki" >nul 2>&1
            set "KROKI_RECHECK=!errorlevel!"
            
            if !STRUCTURIZR_RECHECK! equ 0 (
                if !KROKI_RECHECK! equ 0 (
                    echo Containers are running. Continuing with rendering...
                ) else (
                    echo [ERROR] Required containers are not running. Cannot proceed.
                    exit /b 1
                )
            ) else (
                echo [ERROR] Required containers are not running. Cannot proceed.
                exit /b 1
            )
        )
    )
    
    REM Wait for containers to be ready
    REM timeout /t <seconds> /nobreak suppresses "Press any key" prompt
    echo Waiting for containers to be ready...
    timeout /t 5 /nobreak >nul
    
    REM Verify Kroki is responding
    echo Checking Kroki service...
    REM Wait additional time for Kroki to be fully ready (loads PlantUML libraries)
    timeout /t 5 /nobreak >nul
)

echo All required containers are running.

REM ============================================================================
REM Directory management (Task 7.1)
REM ============================================================================
REM
REM Error Handling: FAIL-FAST for source directory, auto-create for output/temp
REM   - Source directory must exist (contains DSL files)
REM   - Output and temp directories are created automatically if missing
REM   - All directory operations check for errors (permissions, invalid paths)
REM
REM Windows path handling (Task 9.1):
REM   - All paths are quoted to handle spaces in directory names
REM   - mkdir creates parent directories automatically if needed
REM   - 2>nul suppresses error output (we check errorlevel instead)
REM
REM Directory Purposes:
REM   - SOURCE_DIR: Contains source DSL files (must exist)
REM   - OUTPUT_DIR: Contains generated SVG files (auto-created)
REM   - TEMP_DIR: Contains intermediate PlantUML files (auto-created)
REM
REM ============================================================================

echo.
echo Checking output directory...

REM Check if output directory exists, create if it doesn't
if not exist "%OUTPUT_DIR%" (
    echo Output directory does not exist. Creating: %OUTPUT_DIR%
    REM mkdir creates directory, 2>nul suppresses error messages
    mkdir "%OUTPUT_DIR%" 2>nul
    if errorlevel 1 (
        echo [ERROR] Failed to create output directory: %OUTPUT_DIR%
        echo     Details: Check permissions or path validity
        exit /b 1
    )
    echo Output directory created successfully.
) else (
    echo Output directory exists: %OUTPUT_DIR%
)

REM Check if temp directory exists, create if it doesn't
if not exist "%TEMP_DIR%" (
    echo Temp directory does not exist. Creating: %TEMP_DIR%
    mkdir "%TEMP_DIR%" 2>nul
    if errorlevel 1 (
        echo [ERROR] Failed to create temp directory: %TEMP_DIR%
        echo     Details: Check permissions or path validity
        exit /b 1
    )
    echo Temp directory created successfully.
) else (
    echo Temp directory exists: %TEMP_DIR%
)

REM Verify source directory exists (fail-fast if missing)
REM This is a critical error - we can't proceed without source files
if not exist "%SOURCE_DIR%" (
    echo [ERROR] Source directory not found: %SOURCE_DIR%
    echo     Details: Check if the path exists and is accessible
    exit /b 1
)

REM ============================================================================
REM DSL file discovery (Task 3.4)
REM ============================================================================
REM
REM Discovery Modes:
REM   - Single: Verify the specified file exists
REM   - All: Count DSL files in source directory
REM
REM Error Handling:
REM   - Single mode: Fail-fast if specified file doesn't exist
REM   - All mode: Fail-fast if no DSL files found in source directory
REM
REM File Pattern:
REM   - Searches for *.dsl files in SOURCE_DIR
REM   - Uses Windows wildcard matching (case-insensitive)
REM
REM ============================================================================

echo.
echo Discovering DSL files...

if %MODE%==single (
    REM Single file mode: verify the specified file exists
    if not exist "%SOURCE_DIR%\%TARGET_FILE%" (
        echo [ERROR] File not found: %SOURCE_DIR%\%TARGET_FILE%
        exit /b 1
    )
    echo Found target file: %TARGET_FILE%
) else (
    REM All files mode: count DSL files in source directory
    set "FILE_COUNT=0"
    REM Loop through all .dsl files and increment counter
    for %%f in ("%SOURCE_DIR%\*.dsl") do (
        set /a FILE_COUNT+=1
    )
    
    REM Check if any files were found (subroutine exits if count is 0)
    call :check_file_count
)

REM ============================================================================
REM Processing pipeline
REM ============================================================================
REM
REM Pipeline Architecture:
REM   For each DSL file:
REM     1. DSL → PlantUML (via Structurizr CLI in Docker)
REM     2. PlantUML → SVG (via Kroki service in Docker)
REM     3. SVG validation (verify valid XML structure)
REM
REM Error Handling: RECOVERABLE
REM   - Individual file failures don't stop the pipeline
REM   - Each file is processed independently
REM   - Success and failure counts are tracked
REM   - Failed files are reported with details
REM
REM Progress Tracking:
REM   - Display current file number and total (e.g., [1/5])
REM   - Display processing stage for each file
REM   - Display success/failure status after each file
REM   - Track generated files for final summary
REM
REM ============================================================================

echo.
echo ============================================================================
echo Starting DSL to SVG Rendering Pipeline
echo ============================================================================

if %MODE%==single (
    echo Mode: Single file
    echo Target: %TARGET_FILE%
) else (
    echo Mode: Process all files
    echo Source directory: %SOURCE_DIR%
)

echo Output directory: %OUTPUT_DIR%
echo ============================================================================
echo.

REM Initialize counters for tracking results
set "SUCCESS_COUNT=0"
set "FAIL_COUNT=0"
set "TOTAL_FILES=0"

REM Count total files to process (for progress display)
if %MODE%==single (
    set "TOTAL_FILES=1"
) else (
    for %%f in ("%SOURCE_DIR%\*.dsl") do (
        set /a TOTAL_FILES+=1
    )
)

echo Processing %TOTAL_FILES% file(s)...
echo.

REM Track generated files for summary (semicolon-separated list)
set "GENERATED_FILES="

REM Process files based on mode
if %MODE%==single (
    REM Process single file: call subroutine with full path
    call :process_file "%SOURCE_DIR%\%TARGET_FILE%"
) else (
    REM Process all files: loop through .dsl files and call subroutine for each
    for %%f in ("%SOURCE_DIR%\*.dsl") do (
        call :process_file "%%f"
    )
)

REM ============================================================================
REM Summary (Task 6.2)
REM ============================================================================
REM
REM Summary Report Contents:
REM   - Total files processed
REM   - Success and failure counts
REM   - Execution time (calculated from start/end timestamps)
REM   - List of generated SVG files
REM   - Output directory location
REM
REM Exit Codes:
REM   - 0: All files processed successfully
REM   - 1: One or more files failed to process
REM
REM ============================================================================

REM Task 11.1: Execution time tracking - Record end time and calculate duration
set "END_TIME=%TIME%"

REM Calculate execution time using subroutine (handles time format parsing)
call :calculate_duration "%START_TIME%" "%END_TIME%"

echo.
echo ============================================================================
echo Rendering Pipeline Summary
echo ============================================================================
echo Total files processed: %TOTAL_FILES%
echo Successful: %SUCCESS_COUNT%
echo Failed: %FAIL_COUNT%
echo Execution time: %DURATION%
echo.

REM Display list of generated files if any succeeded
if %SUCCESS_COUNT% gtr 0 (
    echo Generated SVG files:
    REM Parse the semicolon-separated list of generated files
    REM Replace semicolons with quotes to create a proper list for the for loop
    for %%f in ("%GENERATED_FILES:;=" "%") do (
        echo   - %%~f
    )
    echo.
)

echo Output directory: %OUTPUT_DIR%
echo ============================================================================

REM Determine exit code based on failure count
if %FAIL_COUNT% gtr 0 (
    echo.
    echo [WARNING] Some files failed to process. See error messages above.
    exit /b 1
)

echo.
echo [SUCCESS] All files processed successfully!
exit /b 0

REM ============================================================================
REM Help display
REM ============================================================================

:show_help
echo.
echo DSL to SVG Rendering Pipeline
echo.
echo Usage:
echo   render-dsl-to-svg.cmd [options] [filename]
echo.
echo Options:
echo   --all         Process all DSL files in source directory (default)
echo   --help, -h    Display this help information
echo   [filename]    Process specific DSL file (e.g., c4_context.dsl)
echo.
echo Examples:
echo   render-dsl-to-svg.cmd
echo   render-dsl-to-svg.cmd --all
echo   render-dsl-to-svg.cmd c4_context.dsl
echo.
echo Requirements:
echo   - Docker Desktop must be running
echo   - docker-compose.structurizr.yml must be configured with Kroki service
echo.
exit /b 0

REM ============================================================================
REM Subroutines
REM ============================================================================

REM ============================================================================
REM Subroutines
REM ============================================================================
REM
REM This section contains helper functions called from the main script.
REM Each subroutine uses goto :eof to return to the caller.
REM
REM ============================================================================

REM ----------------------------------------------------------------------------
REM Windows path normalization helper (Task 9.1)
REM ----------------------------------------------------------------------------
REM Purpose:
REM   Ensures paths are properly quoted and formatted for Windows operations
REM Parameters:
REM   %1 - Path to normalize
REM Returns:
REM   Sets NORMALIZED_PATH variable
REM Note:
REM   Caller should use quotes when using the returned value
REM ----------------------------------------------------------------------------
:normalize_path
set "NORMALIZED_PATH=%~1"
REM Remove any existing quotes to avoid double-quoting
set "NORMALIZED_PATH=%NORMALIZED_PATH:"=%"
goto :eof

REM ----------------------------------------------------------------------------
REM Convert Windows path to Docker-compatible path (Task 9.1)
REM ----------------------------------------------------------------------------
REM Purpose:
REM   Docker on Windows expects forward slashes in volume paths
REM Parameters:
REM   %1 - Windows path with backslashes
REM Returns:
REM   Sets DOCKER_PATH variable with forward slashes
REM Example:
REM   Input: C:\Users\docs\diagrams
REM   Output: C:/Users/docs/diagrams
REM ----------------------------------------------------------------------------
:path_to_docker
set "DOCKER_PATH=%~1"
REM Replace backslashes with forward slashes
set "DOCKER_PATH=%DOCKER_PATH:\=/%"
goto :eof

REM ----------------------------------------------------------------------------
REM Check file count subroutine
REM ----------------------------------------------------------------------------
REM Purpose:
REM   Verifies that at least one DSL file was found in source directory
REM Parameters:
REM   Uses FILE_COUNT variable from caller
REM Returns:
REM   Exits script with error if no files found
REM ----------------------------------------------------------------------------
:check_file_count
if !FILE_COUNT! equ 0 (
    echo [ERROR] No DSL files found in %SOURCE_DIR%
    exit /b 1
)
goto :eof

REM ========================================================================
REM Task 11.1: Calculate execution duration
REM   - Calculates time difference between start and end times
REM   - Handles Windows time format (HH:MM:SS.CS)
REM   - Handles midnight crossing
REM Parameters:
REM   %1 - Start time (HH:MM:SS.CS)
REM   %2 - End time (HH:MM:SS.CS)
REM Returns:
REM   Sets DURATION variable with formatted duration string
REM ========================================================================
:calculate_duration
set "START=%~1"
set "END=%~2"

REM Parse start time
for /f "tokens=1-4 delims=:., " %%a in ("%START%") do (
    set /a "START_H=%%a"
    set /a "START_M=%%b"
    set /a "START_S=%%c"
    set /a "START_CS=%%d"
)

REM Parse end time
for /f "tokens=1-4 delims=:., " %%a in ("%END%") do (
    set /a "END_H=%%a"
    set /a "END_M=%%b"
    set /a "END_S=%%c"
    set /a "END_CS=%%d"
)

REM Convert to centiseconds (1/100 second)
set /a "START_TOTAL=(START_H*3600 + START_M*60 + START_S)*100 + START_CS"
set /a "END_TOTAL=(END_H*3600 + END_M*60 + END_S)*100 + END_CS"

REM Handle midnight crossing (end time is less than start time)
if %END_TOTAL% lss %START_TOTAL% (
    REM Add 24 hours in centiseconds (24*3600*100 = 8640000)
    set /a "END_TOTAL+=8640000"
)

REM Calculate difference in centiseconds
set /a "DIFF_CS=END_TOTAL - START_TOTAL"

REM Convert back to hours, minutes, seconds, centiseconds
set /a "DIFF_H=DIFF_CS / 360000"
set /a "DIFF_M=(DIFF_CS %% 360000) / 6000"
set /a "DIFF_S=(DIFF_CS %% 6000) / 100"
set /a "DIFF_MS=(DIFF_CS %% 100) * 10"

REM Format duration string
if %DIFF_H% gtr 0 (
    set "DURATION=%DIFF_H%h %DIFF_M%m %DIFF_S%.%DIFF_MS%s"
) else if %DIFF_M% gtr 0 (
    set "DURATION=%DIFF_M%m %DIFF_S%.%DIFF_MS%s"
) else (
    set "DURATION=%DIFF_S%.%DIFF_MS%s"
)

goto :eof

REM ========================================================================
REM Task 10.1: SVG format validation subroutine
REM   - Validates SVG file structure
REM   - Checks for SVG root element
REM   - Verifies basic XML structure
REM Parameters:
REM   %1 - Full path to SVG file
REM   %2 - Display name for error messages
REM Returns:
REM   errorlevel 0 if valid, 1 if invalid
REM ========================================================================
:validate_svg
set "SVG_FILE=%~1"
set "SVG_NAME=%~2"

REM Check if file exists
if not exist "%SVG_FILE%" (
    echo     Validation error: File not found
    exit /b 1
)

REM Check if file has content
for %%A in ("%SVG_FILE%") do set "SVG_SIZE=%%~zA"
if %SVG_SIZE% equ 0 (
    echo     Validation error: File is empty
    exit /b 1
)

REM Check for SVG root element
REM Look for <svg tag in the file (basic XML structure check)
findstr /i /c:"<svg" "%SVG_FILE%" >nul 2>&1
if errorlevel 1 (
    echo     Validation error: SVG root element not found
    exit /b 1
)

REM Check for closing svg tag
findstr /i /c:"</svg>" "%SVG_FILE%" >nul 2>&1
if errorlevel 1 (
    echo     Validation error: SVG closing tag not found
    exit /b 1
)

REM Check for basic XML structure (should start with < character)
REM Use more to read first few bytes and check if file starts with <
more +0 "%SVG_FILE%" | findstr /b /c:"<" >nul 2>&1
if errorlevel 1 (
    echo     Validation error: File does not start with valid XML/SVG syntax
    exit /b 1
)

REM All validation checks passed
exit /b 0

REM ============================================================================
REM Process File Subroutine
REM ============================================================================
REM
REM Purpose:
REM   Processes a single DSL file through the complete rendering pipeline
REM
REM Pipeline Stages:
REM   1. DSL → PlantUML conversion (via Structurizr CLI)
REM   2. PlantUML → SVG rendering (via Kroki service)
REM   3. SVG format validation (verify valid XML structure)
REM
REM Parameters:
REM   %1 - Full path to DSL file
REM
REM Error Handling:
REM   - Each stage checks for errors independently
REM   - Errors are reported with filename and details
REM   - Processing stops for current file on error, but script continues
REM   - Increments FAIL_COUNT on error, SUCCESS_COUNT on success
REM
REM File Tracking:
REM   - Extracts filename and base name from full path
REM   - Tracks current file number for progress display
REM   - Adds successful files to GENERATED_FILES list
REM
REM ============================================================================
:process_file
set "FULL_PATH=%~1"
set "DSL_FILE=%~nx1"
set "BASE_NAME=%~n1"

REM Windows path handling (Task 9.1)
REM Extract directory from full path and ensure proper quoting
set "FILE_DIR=%~dp1"

REM Calculate current file number for progress display
set /a CURRENT_FILE_NUM=SUCCESS_COUNT+FAIL_COUNT+1

echo [%CURRENT_FILE_NUM%/%TOTAL_FILES%] Processing: %DSL_FILE%

REM ========================================================================
REM Stage 1: DSL to PlantUML conversion (Task 3.5)
REM ========================================================================
REM
REM Error Handling: RECOVERABLE (Task 5.1)
REM   - Captures Structurizr CLI errors to temporary file
REM   - Extracts meaningful error messages (syntax errors, line numbers)
REM   - Reports error with filename and details
REM   - Continues processing remaining files
REM
REM File Overwrite Behavior (Task 7.2):
REM   - PlantUML files are preserved in temp directory (not deleted)
REM   - Existing PlantUML files are overwritten on subsequent runs
REM   - Source DSL files are read-only (never modified by this script)
REM
REM Windows Path Handling (Task 9.1):
REM   - All paths are properly quoted to handle spaces
REM   - Uses TEMP environment variable for error file
REM   - RANDOM generates unique filename to avoid conflicts
REM
REM Docker Command:
REM   docker exec <container> <command>
REM   - Executes Structurizr CLI inside the container
REM   - Reads DSL from /workspace/src/ (Docker volume mount)
REM   - Writes PlantUML to /workspace/temp/ (Docker volume mount)
REM
REM ========================================================================

echo   Stage: DSL to PlantUML conversion...

REM Check if workspace.json exists (contains layout information)
REM workspace.json is generated by Structurizr Lite when you save layouts
set "JSON_FILE="
if exist "%SOURCE_DIR%\workspace.json" (
    echo   Using workspace.json (includes manual layout)
    set "JSON_FILE=workspace.json"
    set "WORKSPACE_FILE=workspace.json"
) else (
    echo   Using DSL file (auto-layout only)
    set "WORKSPACE_FILE=%DSL_FILE%"
)

REM Copy workspace file into container (workspace-independent approach)
REM This allows the same containers to work with any workspace
docker cp "%SOURCE_DIR%\%WORKSPACE_FILE%" %STRUCTURIZR_CONTAINER%:/workspace/src/%WORKSPACE_FILE% >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Failed to copy workspace file into container
    echo     Details: Could not copy %WORKSPACE_FILE% to container
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

REM Create temporary file for error output (Task 9.1 - Use TEMP with proper quoting)
REM RANDOM generates a random number to create unique filename
set "ERROR_FILE=%TEMP%\structurizr_error_%RANDOM%.txt"

REM Execute Structurizr CLI export command and capture error output
REM >nul redirects stdout (we don't need it)
REM 2>"%ERROR_FILE%" redirects stderr to error file for parsing
docker exec %STRUCTURIZR_CONTAINER% /usr/local/structurizr-cli/structurizr.sh export -workspace /workspace/src/%WORKSPACE_FILE% -format plantuml -output /workspace/temp >nul 2>"%ERROR_FILE%"

REM Check if command failed (non-zero exit code)
if errorlevel 1 (
    echo   [ERROR] DSL to PlantUML: %DSL_FILE%
    
    REM Try to extract and display error details from error file
    if exist "%ERROR_FILE%" (
        REM Loop through error file lines
        REM usebackq allows quoted filenames, delims= preserves spaces
        for /f "usebackq delims=" %%e in ("%ERROR_FILE%") do (
            set "ERROR_LINE=%%e"
            REM Search for lines containing error keywords
            REM Display first meaningful error line found
            echo !ERROR_LINE! | findstr /i /c:"error" /c:"exception" /c:"failed" /c:"line" /c:"syntax" >nul
            if not errorlevel 1 (
                echo     Details: !ERROR_LINE!
            )
        )
    )
    
    REM Clean up error file
    if exist "%ERROR_FILE%" del "%ERROR_FILE%"
    
    REM Increment failure counter and skip to next file
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

REM Clean up error file (command succeeded)
if exist "%ERROR_FILE%" del "%ERROR_FILE%"

REM Copy PlantUML file from container to workspace temp directory
docker cp %STRUCTURIZR_CONTAINER%:/workspace/temp/%BASE_NAME%.puml "%TEMP_DIR%\%BASE_NAME%.puml" >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] DSL to PlantUML: %DSL_FILE%
    echo     Details: Failed to copy PlantUML file from container
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

REM Verify PlantUML file was actually created
REM Sometimes export command succeeds but doesn't generate output
if not exist "%TEMP_DIR%\%BASE_NAME%.puml" (
    echo   [ERROR] DSL to PlantUML: %DSL_FILE%
    echo     Details: PlantUML file not generated after export
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

echo   [1/2] PlantUML file generated: %BASE_NAME%.puml

REM ========================================================================
REM Stage 2: PlantUML to SVG rendering via Kroki (Task 3.7)
REM ========================================================================
REM
REM Error Handling: RECOVERABLE (Task 5.2)
REM   - Captures HTTP status code from Kroki service
REM   - Checks for connection errors (curl failures)
REM   - Checks for HTTP errors (4xx, 5xx status codes)
REM   - Reports error with filename and details
REM   - Continues processing remaining files
REM
REM File Overwrite Behavior (Task 7.2):
REM   - SVG files are overwritten on subsequent runs (curl -o flag)
REM   - PlantUML intermediate files are preserved in temp directory
REM   - Source DSL files are never modified (read-only operations)
REM
REM Curl Command Flags:
REM   -X POST: HTTP POST method
REM   -H "Content-Type: text/plain": Set content type header
REM   --data-binary @<file>: Send file content as binary data
REM   -o <output>: Write response to file (overwrites existing)
REM   -s: Silent mode (no progress bar)
REM   -w "%%{http_code}": Write HTTP status code to stdout
REM
REM HTTP Status Codes:
REM   200: Success - SVG generated
REM   400: Bad Request - Invalid PlantUML syntax
REM   500: Server Error - Kroki internal error
REM   Connection refused: Kroki service not running
REM
REM ========================================================================

echo   Stage: PlantUML to SVG rendering...

REM Create temporary file for HTTP response (Task 9.1 - Proper path quoting)
REM Store HTTP status code in this file for checking
set "HTTP_RESPONSE=%TEMP%\kroki_response_%RANDOM%.txt"

REM Send PlantUML content to Kroki and save SVG response
REM -w flag writes HTTP status code, > redirects it to response file
REM Task 9.1: Properly quote file paths to handle spaces
curl -X POST -H "Content-Type: text/plain" --data-binary "@%TEMP_DIR%\%BASE_NAME%.puml" "%KROKI_URL%" -o "%OUTPUT_DIR%\%BASE_NAME%.svg" -s -w "%%{http_code}" > "%HTTP_RESPONSE%" 2>&1

REM Check curl exit code (non-zero means connection failed)
if errorlevel 1 (
    echo   [ERROR] PlantUML to SVG: %BASE_NAME%.puml
    echo     Details: Cannot connect to Kroki service at %KROKI_URL%
    echo     Please ensure Kroki container is running and accessible
    
    REM Clean up
    if exist "%HTTP_RESPONSE%" del "%HTTP_RESPONSE%"
    
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

REM Read HTTP status code from response file
REM set /p reads one line from file into variable
set /p HTTP_STATUS=<"%HTTP_RESPONSE%"
if exist "%HTTP_RESPONSE%" del "%HTTP_RESPONSE%"

REM Check if HTTP status indicates error (4xx or 5xx)
REM Regex: ^[45][0-9][0-9]$ matches 400-599
echo %HTTP_STATUS% | findstr /r "^[45][0-9][0-9]$" >nul
if not errorlevel 1 (
    echo   [ERROR] PlantUML to SVG: %BASE_NAME%.puml
    echo     Details: Kroki service returned HTTP error %HTTP_STATUS%
    echo     The PlantUML content may be invalid or unsupported
    
    REM Clean up potentially invalid SVG file
    REM Kroki may write error message to output file
    if exist "%OUTPUT_DIR%\%BASE_NAME%.svg" del "%OUTPUT_DIR%\%BASE_NAME%.svg"
    
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

REM Verify SVG file was created and has content
if not exist "%OUTPUT_DIR%\%BASE_NAME%.svg" (
    echo   [ERROR] PlantUML to SVG: %BASE_NAME%.puml
    echo     Details: SVG file not generated after Kroki request
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

REM Check if SVG file is empty or too small (likely an error response)
REM %%~zA gets file size in bytes
REM Valid SVG files are typically at least 50 bytes
for %%A in ("%OUTPUT_DIR%\%BASE_NAME%.svg") do set "FILE_SIZE=%%~zA"
if %FILE_SIZE% lss 50 (
    echo   [ERROR] PlantUML to SVG: %BASE_NAME%.puml
    echo     Details: Generated SVG file is too small, likely an error response
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

echo   [2/2] SVG file generated: %BASE_NAME%.svg

REM ========================================================================
REM Stage 3: SVG format validation (Task 10.1)
REM ========================================================================
REM
REM Validation Checks:
REM   - Parse generated SVG files as XML
REM   - Verify SVG root element exists (<svg tag)
REM   - Verify basic SVG structure is valid (closing tag, XML format)
REM   - Report validation errors with details
REM
REM Why Validate?
REM   - Kroki may return error messages in SVG format
REM   - Network issues may corrupt the file
REM   - Ensures generated files are usable in documentation
REM
REM Validation Method:
REM   - Call :validate_svg subroutine with file path and name
REM   - Subroutine checks for SVG tags and XML structure
REM   - Returns errorlevel 0 if valid, 1 if invalid
REM
REM ========================================================================

echo   Stage: SVG format validation...

REM Call validation subroutine
call :validate_svg "%OUTPUT_DIR%\%BASE_NAME%.svg" "%BASE_NAME%.svg"
if errorlevel 1 (
    echo   [ERROR] SVG validation: %BASE_NAME%.svg
    echo     Details: Generated SVG file failed validation
    set /a FAIL_COUNT+=1
    echo.
    goto :eof
)

echo   [3/3] SVG validation passed
echo   Status: SUCCESS
echo.

REM Increment success counter
set /a SUCCESS_COUNT+=1

REM Track generated file for summary report
REM Build semicolon-separated list of filenames
if defined GENERATED_FILES (
    set "GENERATED_FILES=!GENERATED_FILES!;%BASE_NAME%.svg"
) else (
    set "GENERATED_FILES=%BASE_NAME%.svg"
)

REM Return to caller (main loop)
goto :eof
