# Rollback Documentation
**Date:** February 11, 2026  
**Project:** SO VSIX Extension  
**Spec:** `.kiro/specs/npm-package-updates`

## Overview

This document provides comprehensive rollback procedures for the npm package updates. If issues arise after the updates, follow these procedures to restore the extension to its previous working state.

## Quick Rollback

If you need to rollback immediately:

```bash
# Navigate to extension directory
cd tools/so-vsix

# Restore backup
cp package-lock.json.backup package-lock.json

# Clean install dependencies
npm ci

# Verify rollback
npm test
npm run compile
```

**Expected Result:** All 38 tests should pass, TypeScript should compile without errors.

## Backup File Locations

### Primary Backup
- **File:** `tools/so-vsix/package-lock.json.backup`
- **Created:** February 10, 2026 (before any updates)
- **Contains:** Original package-lock.json with all pre-update package versions
- **Status:** ✅ Available

### Pre-Update Analysis Files
- **File:** `tools/so-vsix/PRE_UPDATE_ANALYSIS.md`
- **Contains:** Complete analysis of packages before updates
- **Purpose:** Reference for original package versions and vulnerabilities

- **File:** `tools/so-vsix/BASELINE_TEST_RESULTS.md`
- **Contains:** Test results before any updates
- **Purpose:** Baseline for comparing post-rollback test results

### Git Commits
All update phases were committed separately to git, allowing selective rollback:

1. Phase 1: Pre-update analysis and backup
2. Phase 2: Security fixes
3. Phase 3: Jest v30 update
4. Phase 4: Puppeteer v24 update
5. Phase 5: markdown-it-table-of-contents v1.1 update
6. Phase 6: Type definition updates
7. Phase 7: Dependency conflict resolution
8. Phase 8: Comprehensive validation

## Rollback Procedures

### Full Rollback (All Updates)

Use this procedure to rollback all package updates and return to the original state.

#### Step 1: Restore package-lock.json

```bash
cd tools/so-vsix
cp package-lock.json.backup package-lock.json
```

**Verification:**
```bash
# Check file was restored
ls -la package-lock.json*
```

You should see both `package-lock.json` and `package-lock.json.backup`.

#### Step 2: Clean Install Dependencies

```bash
npm ci
```

**What this does:**
- Removes `node_modules` directory
- Installs exact versions from package-lock.json
- Ensures clean dependency tree

**Expected Output:**
```
added 837 packages in Xs
```

#### Step 3: Verify Rollback

Run the verification steps to ensure rollback was successful:

```bash
# Run tests
npm test

# Compile TypeScript
npm run compile

# Check for security vulnerabilities
npm audit
```

**Expected Results:**
- ✅ Tests: 38 passed, 38 total
- ✅ Compilation: No errors
- ✅ Audit: 8 vulnerabilities (1 high, 7 moderate) - same as before updates

#### Step 4: Verify Extension Functionality

1. Open VS Code
2. Press F5 to launch Extension Development Host
3. Test critical commands:
   - `SO: Render Diagrams (Java)`
   - `SO: Render Diagrams (Kroki)`
   - `SO: Export PDF`
   - `SO: Convert Word to Markdown`

**Expected Result:** All commands should work as before updates.

### Partial Rollback (Specific Package)

Use this procedure to rollback a specific package while keeping other updates.

#### Rollback Jest Only

```bash
cd tools/so-vsix

# Update package.json manually or use npm
npm install jest@^29.7.0 @jest/globals@^29.7.0 @types/jest@^29.5.14 --save-dev

# Run tests
npm test
```

#### Rollback Puppeteer Only

```bash
cd tools/so-vsix

# Update package.json manually or use npm
npm install puppeteer@^23.11.1 --save

# Test PDF export
npm run export:pdf
```

#### Rollback markdown-it-table-of-contents Only

```bash
cd tools/so-vsix

# Update package.json manually or use npm
npm install markdown-it-table-of-contents@^0.8.0 --save

# Test table of contents generation
npm test
```

#### Rollback Type Definitions Only

```bash
cd tools/so-vsix

# Update package.json manually or use npm
npm install @types/node@^25.1.0 @types/vscode@^1.90.0 --save-dev

# Also update VS Code engine version in package.json
# Change "vscode": "^1.109.0" back to "vscode": "^1.90.0"

# Compile TypeScript
npm run compile
```

### Git-Based Rollback

Use this procedure to rollback using git commits.

#### View Update Commits

```bash
cd tools/so-vsix

# View recent commits
git log --oneline -10
```

Look for commits related to package updates (Phase 2-8).

#### Rollback to Specific Phase

```bash
# Rollback to before Phase 3 (Jest update)
git revert <commit-hash-of-phase-3>

# Or rollback multiple phases
git revert <commit-hash-phase-8>..<commit-hash-phase-3>

# Install dependencies
npm ci

# Verify
npm test
npm run compile
```

#### Rollback All Updates

```bash
# Find the commit before Phase 2 (security fixes)
git log --oneline

# Reset to that commit (WARNING: This discards all changes)
git reset --hard <commit-hash-before-updates>

# Or create a revert commit (safer)
git revert <commit-hash-phase-8>..<commit-hash-phase-2>

# Install dependencies
npm ci

# Verify
npm test
npm run compile
```

## Rollback Verification Steps

After performing any rollback, follow these verification steps:

### 1. Dependency Verification

```bash
# Check installed package versions
npm list --depth=0

# Verify specific packages
npm list jest
npm list puppeteer
npm list markdown-it-table-of-contents
```

**Expected Versions (after full rollback):**
- jest: 29.7.0
- @jest/globals: 29.7.0
- @types/jest: 29.5.14
- puppeteer: 23.11.1
- markdown-it-table-of-contents: 0.8.0
- @types/node: 25.1.0
- @types/vscode: 1.90.0

### 2. Test Suite Verification

```bash
npm test
```

**Expected Output:**
```
Test Suites: 5 passed, 5 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        ~3.5s
```

**Compare with baseline:**
- Check `BASELINE_TEST_RESULTS.md` for original test results
- All tests should pass with similar execution time

### 3. TypeScript Compilation Verification

```bash
npm run compile
```

**Expected Output:**
```
> so-vsix@1.0.0 compile
> tsc -p ./ && npm run copy-scripts

Scripts copied successfully
```

**No errors or warnings should appear.**

### 4. VSIX Package Build Verification

```bash
npm run package
```

**Expected Output:**
```
> so-vsix@1.0.0 package
> vsce package

Executing prepublish script 'npm run vscode:prepublish'...
...
DONE  Packaged: so-vsix-1.0.0.vsix (X files, X.XMB)
```

### 5. Security Audit Verification

```bash
npm audit
```

**Expected Output (after full rollback):**
```
8 vulnerabilities (1 high, 7 moderate)
```

**This matches the pre-update state.** The vulnerabilities are:
- 1 high: @isaacs/brace-expansion
- 7 moderate: lodash-es chain (via mermaid)

### 6. Extension Functionality Verification

#### Manual Testing Checklist

- [ ] Extension loads in VS Code without errors
- [ ] All commands appear in Command Palette
- [ ] Configuration management works
- [ ] Diagram rendering (Java backend) works
- [ ] Diagram rendering (Kroki backend) works
- [ ] PDF export works
- [ ] Word to Markdown conversion works
- [ ] Chat participant responds correctly

#### Test Commands

```bash
# In VS Code Extension Development Host:
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Run: SO: Render Diagrams (Java)
# 3. Run: SO: Render Diagrams (Kroki)
# 4. Run: SO: Export PDF
# 5. Run: SO: Convert Word to Markdown
```

**Expected Result:** All commands execute without errors.

## Troubleshooting Rollback Issues

### Issue: npm ci fails with "package-lock.json out of sync"

**Solution:**
```bash
# Remove node_modules and package-lock.json
rm -rf node_modules
rm package-lock.json

# Restore backup
cp package-lock.json.backup package-lock.json

# Try again
npm ci
```

### Issue: Tests fail after rollback

**Possible Causes:**
1. Incomplete rollback (some packages still updated)
2. Corrupted node_modules
3. Cached test results

**Solution:**
```bash
# Clean everything
rm -rf node_modules
npm ci

# Clear Jest cache
npx jest --clearCache

# Run tests again
npm test
```

### Issue: TypeScript compilation fails after rollback

**Possible Causes:**
1. Type definitions not rolled back
2. VS Code engine version not updated in package.json

**Solution:**
```bash
# Verify package.json has correct versions
cat package.json | grep -A 5 "devDependencies"

# Check VS Code engine version
cat package.json | grep -A 2 "engines"

# Should show:
# "vscode": "^1.90.0"

# If incorrect, manually edit package.json, then:
npm ci
npm run compile
```

### Issue: Extension doesn't load after rollback

**Possible Causes:**
1. VSIX package not rebuilt
2. VS Code cache issue

**Solution:**
```bash
# Rebuild VSIX package
npm run compile
npm run package

# In VS Code:
# 1. Reload window (Ctrl+Shift+P > "Reload Window")
# 2. Or restart VS Code completely
```

### Issue: Git revert conflicts

**Possible Causes:**
1. Conflicting changes in package.json or package-lock.json
2. Manual edits after commits

**Solution:**
```bash
# Abort the revert
git revert --abort

# Use manual rollback instead
cp package-lock.json.backup package-lock.json
npm ci

# Create a new commit
git add package-lock.json
git commit -m "Rollback: Restore original package versions"
```

## Post-Rollback Actions

After successfully rolling back:

### 1. Document the Rollback

Create a rollback report documenting:
- Date and time of rollback
- Reason for rollback
- Which packages were rolled back
- Verification results
- Any issues encountered

### 2. Investigate the Issue

If rollback was due to a problem:
- Review error logs
- Check for compatibility issues
- Consult package migration guides
- Consider reporting bugs to package maintainers

### 3. Plan Next Steps

Decide on next steps:
- **Option A:** Stay on old versions until issues are resolved
- **Option B:** Attempt updates again with different approach
- **Option C:** Update packages individually instead of all at once

### 4. Update Documentation

Update project documentation to reflect:
- Current package versions
- Known issues with newer versions
- Rollback decision and reasoning

## Prevention for Future Updates

To avoid needing rollback in the future:

### 1. Always Create Backups

```bash
# Before any updates
cp package-lock.json package-lock.json.backup
cp package.json package.json.backup
```

### 2. Test Incrementally

- Update one package at a time
- Run full test suite after each update
- Commit after each successful update

### 3. Use Feature Branches

```bash
# Create a branch for updates
git checkout -b feature/package-updates

# Make updates
npm install <package>@<version>

# Test thoroughly
npm test
npm run compile

# Only merge if all tests pass
git checkout main
git merge feature/package-updates
```

### 4. Document Everything

- Keep detailed notes of changes
- Document any issues encountered
- Record solutions to problems

### 5. Monitor Package Health

- Check package release notes before updating
- Review breaking changes
- Check for known issues in package repositories

## Emergency Rollback

If the extension is completely broken and you need to rollback immediately:

```bash
# Navigate to extension directory
cd tools/so-vsix

# Nuclear option: restore everything
cp package-lock.json.backup package-lock.json
rm -rf node_modules
npm ci

# Verify
npm test && npm run compile && npm run package

# If still broken, check git
git status
git diff package.json

# Restore package.json if modified
git checkout package.json

# Try again
npm ci
npm test
```

## Support and Resources

### Internal Resources
- `PRE_UPDATE_ANALYSIS.md` - Original package analysis
- `BASELINE_TEST_RESULTS.md` - Original test results
- `PACKAGE_UPDATE_CHANGELOG.md` - What was changed
- `CODE_CHANGES_DOCUMENTATION.md` - Code modifications (none in this case)

### External Resources
- [npm documentation](https://docs.npmjs.com/)
- [npm ci command](https://docs.npmjs.com/cli/v8/commands/npm-ci)
- [package-lock.json format](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json)

### Getting Help

If rollback fails or you encounter issues:

1. Check the VS Code Output panel (View > Output > "SO Workspace Extension")
2. Review error messages carefully
3. Consult this documentation
4. Check git history for what changed
5. Compare with backup files

## Conclusion

This rollback documentation provides multiple strategies for reverting package updates:

- ✅ **Full Rollback:** Restore all packages to original versions
- ✅ **Partial Rollback:** Rollback specific packages only
- ✅ **Git-Based Rollback:** Use git history to revert changes
- ✅ **Verification Steps:** Ensure rollback was successful
- ✅ **Troubleshooting:** Solutions for common rollback issues

**Key Takeaway:** The backup file (`package-lock.json.backup`) is your safety net. As long as this file exists, you can always return to the working state before updates.

**Backup Status:** ✅ Available at `tools/so-vsix/package-lock.json.backup`

**Recommendation:** Keep the backup file until you're confident the updates are stable and working correctly in production.
