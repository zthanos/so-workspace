# Workspace Reorganization Validation Script
# This script validates that all folders were moved correctly and all path references are valid

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$script:issues = @()
$script:warnings = @()
$script:successes = @()

function Write-ValidationMessage {
    param(
        [string]$Message,
        [ValidateSet("Success", "Warning", "Error")]
        [string]$Type = "Success"
    )
    
    $color = switch ($Type) {
        "Success" { "Green" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
    }
    
    Write-Host "[$Type] $Message" -ForegroundColor $color
    
    switch ($Type) {
        "Success" { $script:successes += $Message }
        "Warning" { $script:warnings += $Message }
        "Error" { $script:issues += $Message }
    }
}

# Task 14.1: Verify all moved files exist at new locations
function Test-MovedFolders {
    Write-Host "`n=== Task 14.1: Verifying moved folders exist ===" -ForegroundColor Cyan
    
    $expectedFolders = @(
        @{ Path = "agent"; Description = "Agent folder (moved from docs/agent)" },
        @{ Path = "build"; Description = "Build folder (moved from docs/build)" },
        @{ Path = "inbox"; Description = "Inbox folder (moved from docs/inbox)" },
        @{ Path = "templates"; Description = "Templates folder (created new)" }
    )
    
    foreach ($folder in $expectedFolders) {
        if (Test-Path $folder.Path -PathType Container) {
            Write-ValidationMessage "Folder exists: $($folder.Path) - $($folder.Description)" -Type Success
        } else {
            Write-ValidationMessage "Missing folder: $($folder.Path) - $($folder.Description)" -Type Error
        }
    }
    
    # Check expected files in templates folder
    Write-Host "`nChecking template files..." -ForegroundColor Cyan
    $expectedTemplates = @(
        "templates/objectives.template.md",
        "templates/solution_outline.template.md"
    )
    
    foreach ($template in $expectedTemplates) {
        if (Test-Path $template) {
            Write-ValidationMessage "Template file exists: $template" -Type Success
        } else {
            Write-ValidationMessage "Missing template file: $template" -Type Error
        }
    }
    
    # Check that old locations no longer exist
    Write-Host "`nChecking old locations are removed..." -ForegroundColor Cyan
    $oldLocations = @(
        "docs/agent",
        "docs/build",
        "docs/inbox",
        "scripts"
    )
    
    foreach ($oldPath in $oldLocations) {
        if (Test-Path $oldPath) {
            Write-ValidationMessage "Old location still exists (should be removed): $oldPath" -Type Warning
        } else {
            Write-ValidationMessage "Old location properly removed: $oldPath" -Type Success
        }
    }
}

# Task 14.2: Verify all path references point to existing files
function Test-PathReferences {
    Write-Host "`n=== Task 14.2: Verifying path references ===" -ForegroundColor Cyan
    
    $filesToCheck = @()
    
    # Get all command files
    if (Test-Path "agent/Commands") {
        $filesToCheck += Get-ChildItem -Path "agent/Commands" -Filter "*.cmd.md" -Recurse
    }
    
    # Get all prompt files
    if (Test-Path "agent/prompts") {
        $filesToCheck += Get-ChildItem -Path "agent/prompts" -Filter "*.prompt.md" -Recurse
    }
    
    # Get context files
    if (Test-Path "agent/so_agent_context.md") {
        $filesToCheck += Get-Item "agent/so_agent_context.md"
    }
    
    # Get diagram registry
    if (Test-Path "agent/prompts/02_diagrams/diagrams.registry.yml") {
        $filesToCheck += Get-Item "agent/prompts/02_diagrams/diagrams.registry.yml"
    }
    
    Write-Host "Checking $($filesToCheck.Count) files for path references..." -ForegroundColor Cyan
    
    $brokenReferences = @()
    $checkedReferences = @{}
    
    foreach ($file in $filesToCheck) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        # Pattern 1: @path/to/file references (used in commands)
        $atReferences = [regex]::Matches($content, '@([a-zA-Z0-9_/\.\-]+\.(md|yml|yaml|json|template\.md))')
        foreach ($match in $atReferences) {
            $refPath = $match.Groups[1].Value
            if (-not $checkedReferences.ContainsKey($refPath)) {
                $checkedReferences[$refPath] = @()
            }
            $checkedReferences[$refPath] += $file.FullName
        }
        
        # Pattern 2: docs/ references
        $docsReferences = [regex]::Matches($content, '(docs/[a-zA-Z0-9_/\.\-]+\.(md|yml|yaml|json|puml|template\.md))')
        foreach ($match in $docsReferences) {
            $refPath = $match.Groups[1].Value
            if (-not $checkedReferences.ContainsKey($refPath)) {
                $checkedReferences[$refPath] = @()
            }
            $checkedReferences[$refPath] += $file.FullName
        }
        
        # Pattern 3: templates/ references
        $templateReferences = [regex]::Matches($content, '(templates/[a-zA-Z0-9_/\.\-]+\.template\.md)')
        foreach ($match in $templateReferences) {
            $refPath = $match.Groups[1].Value
            if (-not $checkedReferences.ContainsKey($refPath)) {
                $checkedReferences[$refPath] = @()
            }
            $checkedReferences[$refPath] += $file.FullName
        }
        
        # Pattern 4: agent/ references
        $agentReferences = [regex]::Matches($content, '(agent/[a-zA-Z0-9_/\.\-]+\.(md|yml|yaml|json))')
        foreach ($match in $agentReferences) {
            $refPath = $match.Groups[1].Value
            if (-not $checkedReferences.ContainsKey($refPath)) {
                $checkedReferences[$refPath] = @()
            }
            $checkedReferences[$refPath] += $file.FullName
        }
    }
    
    Write-Host "`nFound $($checkedReferences.Count) unique path references to validate..." -ForegroundColor Cyan
    
    $validCount = 0
    $invalidCount = 0
    
    foreach ($refPath in $checkedReferences.Keys) {
        $exists = Test-Path $refPath
        
        if ($exists) {
            $validCount++
            if ($Verbose) {
                Write-ValidationMessage "Valid reference: $refPath" -Type Success
            }
        } else {
            $invalidCount++
            $referencedBy = $checkedReferences[$refPath] | Select-Object -Unique
            Write-ValidationMessage "Broken reference: $refPath (referenced by $($referencedBy.Count) file(s))" -Type Error
            
            foreach ($sourceFile in $referencedBy) {
                $brokenReferences += @{
                    ReferencedPath = $refPath
                    SourceFile = $sourceFile
                }
            }
        }
    }
    
    Write-Host "`nPath Reference Summary:" -ForegroundColor Cyan
    Write-Host "  Valid references: $validCount" -ForegroundColor Green
    Write-Host "  Broken references: $invalidCount" -ForegroundColor $(if ($invalidCount -eq 0) { "Green" } else { "Red" })
    
    return $brokenReferences
}

# Task 14.3: Generate validation report
function New-ValidationReport {
    param(
        [array]$BrokenReferences
    )
    
    Write-Host "`n=== Task 14.3: Generating validation report ===" -ForegroundColor Cyan
    
    $reportPath = ".kiro/specs/workspace-reorganization/validation-report.md"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $report = @"
# Workspace Reorganization Validation Report

**Generated:** $timestamp

## Summary

- **Total Issues:** $($script:issues.Count)
- **Total Warnings:** $($script:warnings.Count)
- **Total Successes:** $($script:successes.Count)

## Overall Status

"@

    if ($script:issues.Count -eq 0) {
        $report += "✅ **PASSED** - All validation checks passed successfully!`n`n"
    } else {
        $report += "❌ **FAILED** - $($script:issues.Count) issue(s) found that require attention.`n`n"
    }

    # Add successes section
    if ($script:successes.Count -gt 0) {
        $report += "## ✅ Successful Validations ($($script:successes.Count))`n`n"
        foreach ($success in $script:successes) {
            $report += "- $success`n"
        }
        $report += "`n"
    }

    # Add warnings section
    if ($script:warnings.Count -gt 0) {
        $report += "## ⚠️ Warnings ($($script:warnings.Count))`n`n"
        foreach ($warning in $script:warnings) {
            $report += "- $warning`n"
        }
        $report += "`n"
    }

    # Add issues section
    if ($script:issues.Count -gt 0) {
        $report += "## ❌ Issues Found ($($script:issues.Count))`n`n"
        foreach ($issue in $script:issues) {
            $report += "- $issue`n"
        }
        $report += "`n"
    }

    # Add broken references detail
    if ($BrokenReferences.Count -gt 0) {
        $report += "## Broken Reference Details`n`n"
        $report += "The following path references point to non-existent files:`n`n"
        
        $groupedRefs = $BrokenReferences | Group-Object -Property ReferencedPath
        
        foreach ($group in $groupedRefs) {
            $report += "### Missing File: ``$($group.Name)```n`n"
            $report += "Referenced by:`n"
            foreach ($ref in $group.Group) {
                $report += "- ``$($ref.SourceFile)```n"
            }
            $report += "`n"
        }
    }

    # Add recommendations
    $report += "## Recommendations`n`n"
    
    if ($script:issues.Count -eq 0 -and $script:warnings.Count -eq 0) {
        $report += "No issues or warnings found. The workspace reorganization is complete and all path references are valid.`n"
    } else {
        if ($script:issues.Count -gt 0) {
            $report += "### Critical Issues`n`n"
            $report += "1. Review and fix all broken path references listed above`n"
            $report += "2. Ensure all expected folders and files exist at their new locations`n"
            $report += "3. Re-run this validation script after making corrections`n`n"
        }
        
        if ($script:warnings.Count -gt 0) {
            $report += "### Warnings`n`n"
            $report += "1. Review warnings to ensure old folder locations are properly cleaned up`n"
            $report += "2. Consider removing any remaining old folder structures if they are no longer needed`n`n"
        }
    }

    # Write report to file
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Host "`nValidation report generated: $reportPath" -ForegroundColor Green
    
    return $reportPath
}

# Main execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Workspace Reorganization Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Run all validation tasks
Test-MovedFolders
$brokenRefs = Test-PathReferences
$reportPath = New-ValidationReport -BrokenReferences $brokenRefs

# Final summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Validation Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Issues: $($script:issues.Count)" -ForegroundColor $(if ($script:issues.Count -eq 0) { "Green" } else { "Red" })
Write-Host "Warnings: $($script:warnings.Count)" -ForegroundColor $(if ($script:warnings.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host "Successes: $($script:successes.Count)" -ForegroundColor Green
Write-Host "`nReport saved to: $reportPath" -ForegroundColor Cyan

# Exit with appropriate code
if ($script:issues.Count -gt 0) {
    exit 1
} else {
    exit 0
}
