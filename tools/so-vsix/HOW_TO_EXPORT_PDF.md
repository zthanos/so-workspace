# How to Export PDF

This guide explains how to generate a PDF from your solution outline documents.

---

## Quick Start

### Method 1: VS Code Command Palette (Recommended)

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "SO: Export PDF"
3. Press Enter

The PDF will be generated and saved to `docs/build/pdf/Full_Doc.pdf`

### Method 2: Command Line

```bash
cd tools/so-vsix
npm run export:pdf
```

---

## What Gets Generated

The PDF export creates a professional document with:

✅ **Title Page**
- Project ID
- Project Name (cleaned, without "Solution Outline")
- Document Type ("Solution Outline")
- Company Logo (centered)
- Document Information Table (Period, Changes, Author)
- No header on this page

✅ **Table of Contents**
- 3 levels deep
- Section numbering
- Clickable links

✅ **Content Pages**
- All markdown files from `docs/manifest.yml`
- Section numbering
- Headers with logo and project info (starting from page 2)
- Page numbers in footer (N / M format)

✅ **Diagrams**
- Embedded SVG/PNG images
- Centered captions below each diagram
- Professional figure styling

✅ **PDF Features**
- Bookmarks for navigation (3 levels)
- A4 page size
- Professional margins (20mm top/bottom, 15mm left/right)
- Custom styling for headings, code blocks, tables

---

## Requirements

Before generating the PDF, ensure you have:

1. **Manifest File**: `docs/manifest.yml` with:
   - `title` field
   - `inputs` array listing markdown files

2. **Project Information**: `docs/project_information.md` with YAML front matter:
   ```yaml
   ---
   projectId: "YOUR-PROJECT-ID"
   projectName: "Your Project Name"
   author: "Author Name"
   periodWritten: "Month Year"
   changes: "Version history"
   ---
   ```

3. **Company Logo**: `templates/logo.png` (or .jpg)

4. **Input Files**: All markdown files listed in manifest must exist

---

## Output Location

Generated PDF: `docs/build/pdf/Full_Doc.pdf`

To open the generated PDF:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "SO: Open Generated PDF"
3. Press Enter

---

## Troubleshooting

### "Manifest file not found"
- Ensure `docs/manifest.yml` exists in your workspace
- Check that you're running from the correct directory

### "Missing input files"
- Verify all files listed in `manifest.yml` exist
- Check file paths are relative to workspace root

### "Company logo not found"
- Add logo file to `templates/logo.png`
- Supported formats: PNG, JPG, JPEG

### "Invalid project information format"
- Ensure `docs/project_information.md` has YAML front matter
- Front matter must be at the start of the file
- Must be delimited by `---` lines

---

## Features

### No Docker Required
Unlike the old implementation, this version:
- ✅ Runs natively with Node.js
- ✅ No Docker Desktop needed
- ✅ Faster execution
- ✅ Works on any platform with Node.js

### Diagram Support
To include diagrams in your PDF:
1. Add diagrams to `docs/03_architecture/diagrams/out/`
2. Reference them in markdown:
   ```markdown
   ![Diagram Caption](03_architecture/diagrams/out/diagram.svg)
   ```
3. The caption will appear centered below the diagram

### Custom Styling
Default CSS is created automatically at `templates/pdf-styles.css`
You can customize:
- Colors
- Fonts
- Spacing
- Table styles
- Code block appearance

---

## Advanced Usage

### Custom Template
Create `templates/document_template.html` to customize the document structure.

### Custom CSS
Edit `templates/pdf-styles.css` to change styling.

### Multiple Documents
Update `docs/manifest.yml` to include different markdown files:
```yaml
title: "My Document"
inputs:
  - docs/chapter1.md
  - docs/chapter2.md
  - docs/chapter3.md
```

---

## Support

For issues or questions:
1. Check error messages in the terminal output
2. Verify all requirements are met
3. Review the troubleshooting section above

---

**Last Updated:** February 7, 2026  
**Version:** 1.0 (npm-based, no Docker)
