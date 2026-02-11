# Pre-Update Analysis Report
**Date:** February 10, 2026
**Project:** SO VSIX Extension

## Current Package Versions

### Production Dependencies
- `fs-extra`: ^11.2.0
- `js-yaml`: ^4.1.0
- `jsdom`: ^28.0.0
- `mammoth`: ^1.6.0
- `markdown-it`: ^14.1.0
- `markdown-it-anchor`: ^9.2.0
- `markdown-it-attrs`: ^4.2.0
- `markdown-it-table-of-contents`: ^0.8.0 ⚠️ **UPDATE AVAILABLE: 1.1.0**
- `mermaid`: ^11.12.2
- `pako`: ^2.1.0
- `plantuml-encoder`: ^1.4.0
- `puppeteer`: ^23.11.1 ⚠️ **UPDATE AVAILABLE: 24.37.2**
- `turndown`: ^7.1.2
- `turndown-plugin-gfm`: ^1.0.2

### Development Dependencies
- `@jest/globals`: ^29.7.0 ⚠️ **UPDATE AVAILABLE: 30.2.0**
- `@types/fs-extra`: ^11.0.4
- `@types/jest`: ^29.5.14 ⚠️ **UPDATE AVAILABLE: 30.0.0**
- `@types/js-yaml`: ^4.0.9
- `@types/jsdom`: ^27.0.0
- `@types/markdown-it`: ^14.1.2
- `@types/mermaid`: ^9.1.0
- `@types/node`: ^25.1.0 ⚠️ **UPDATE AVAILABLE: 25.2.2**
- `@types/pako`: ^2.0.3
- `@types/plantuml-encoder`: ^1.4.2
- `@types/turndown`: ^5.0.4
- `@types/vscode`: ^1.90.0 ⚠️ **UPDATE AVAILABLE: 1.109.0**
- `@vscode/vsce`: ^3.7.1
- `fast-check`: ^4.5.3
- `jest`: ^29.7.0 ⚠️ **UPDATE AVAILABLE: 30.2.0**
- `ts-jest`: ^29.2.5
- `typescript`: ^5.9.3

## Security Vulnerabilities

### Summary
- **Total Vulnerabilities:** 8
- **Critical:** 0
- **High:** 1
- **Moderate:** 7
- **Low:** 0

### High Severity Vulnerabilities

#### 1. @isaacs/brace-expansion (High)
- **Current Version:** 5.0.0
- **Issue:** Uncontrolled Resource Consumption (CWE-1333)
- **Advisory:** GHSA-7h2j-956f-4vf2
- **URL:** https://github.com/advisories/GHSA-7h2j-956f-4vf2
- **Fix Available:** Yes (via npm audit fix)
- **Affected Range:** <=5.0.0

### Moderate Severity Vulnerabilities

#### 2. lodash-es (Moderate)
- **Current Version:** 4.0.0 - 4.17.22
- **Issue:** Prototype Pollution in `_.unset` and `_.omit` functions (CWE-1321)
- **Advisory:** GHSA-xxjr-mmjv-4gpg
- **URL:** https://github.com/advisories/GHSA-xxjr-mmjv-4gpg
- **CVSS Score:** 6.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L)
- **Fix Available:** Yes (requires mermaid downgrade to 10.9.5)
- **Affected Packages:**
  - @chevrotain/cst-dts-gen (via lodash-es)
  - @chevrotain/gast (via lodash-es)
  - chevrotain (via lodash-es)

#### 3. chevrotain (Moderate)
- **Affected Range:** 11.0.0 - 11.1.0
- **Via:** @chevrotain/cst-dts-gen, @chevrotain/gast, lodash-es
- **Effects:** langium
- **Fix Available:** Yes (requires mermaid downgrade to 10.9.5)

#### 4. langium (Moderate)
- **Affected Range:** 2.1.0 - 4.1.3
- **Via:** chevrotain
- **Effects:** @mermaid-js/parser
- **Fix Available:** Yes (requires mermaid downgrade to 10.9.5)

#### 5. @mermaid-js/parser (Moderate)
- **Via:** langium
- **Effects:** mermaid
- **Fix Available:** Yes (requires mermaid downgrade to 10.9.5)

#### 6. mermaid (Moderate)
- **Current Version:** ^11.12.2
- **Affected Range:** >=11.0.0-alpha.1
- **Via:** @mermaid-js/parser
- **Fix Available:** Yes (downgrade to 10.9.5 - MAJOR VERSION CHANGE)
- **Note:** This is a direct dependency. Fixing requires downgrading from v11 to v10.

## Available Updates

### Major Version Updates
1. **jest**: 29.7.0 → 30.2.0
2. **@jest/globals**: 29.7.0 → 30.2.0
3. **@types/jest**: 29.5.14 → 30.0.0
4. **puppeteer**: 23.11.1 → 24.37.2
5. **markdown-it-table-of-contents**: 0.8.0 → 1.1.0

### Minor/Patch Updates
1. **@types/node**: 25.1.0 → 25.2.2
2. **@types/vscode**: 1.90.0 → 1.109.0

## Dependency Statistics
- **Production Dependencies:** 317
- **Development Dependencies:** 514
- **Optional Dependencies:** 35
- **Total Dependencies:** 837

## Backup Status
✅ **Backup Created:** `package-lock.json.backup`

## Update Strategy Recommendations

### Phase 1: Security Fixes (High Priority)
1. Run `npm audit fix` to apply automatic security fixes
2. **IMPORTANT:** The mermaid vulnerability requires downgrading from v11 to v10.9.5
   - This is a MAJOR version change and may introduce breaking changes
   - Requires careful testing of diagram rendering functionality
   - Consider if mermaid v11 features are critical before downgrading

### Phase 2: Major Version Updates (Medium Priority)
1. Update Jest ecosystem (v29 → v30)
2. Update Puppeteer (v23 → v24)
3. Update markdown-it-table-of-contents (v0.8 → v1.1)

### Phase 3: Minor Updates (Low Priority)
1. Update @types/node (25.1.0 → 25.2.2)
2. Update @types/vscode (1.90.0 → 1.109.0)

## Risk Assessment

### High Risk
- **Mermaid downgrade (v11 → v10):** May break diagram rendering features that depend on v11 APIs

### Medium Risk
- **Jest v30 update:** May require test configuration changes
- **Puppeteer v24 update:** May affect PDF export functionality

### Low Risk
- **Type definition updates:** Unlikely to cause runtime issues
- **markdown-it-table-of-contents update:** Minor version bump, should be backward compatible

## Next Steps
1. Run baseline test suite to establish current functionality
2. Proceed with Phase 1 security fixes
3. Test thoroughly after each phase
4. Document any code changes required
