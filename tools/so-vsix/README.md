 The file should be a markdown file.
# SO Workspace Extension

A VS Code extension that provides chat participants for managing SO (Software Operations) workspace documentation and build processes.

## Features

- **Chat Participant**: Integrates with VS Code's chat interface to assist with workspace management
- **Requirements Inventory Management**: Generate, evaluate, patch, and recheck requirements inventories
- **Objectives Management**: Create and manage project objectives
- **Diagram Evaluation**: Evaluate and patch C4 diagrams (Context and Container levels)
- **Solution Outline Generation**: Create and review solution outlines
- **Workspace Automation**: Render diagrams and build PDF documentation using Docker

## What it supports

- **BRD preprocessing**: Convert BRD Word (.docx) into canonical Markdown for downstream steps
- **Requirements Inventory**: Generate, evaluate, patch, and recheck a structured inventory derived from the BRD
- **Objectives**: Generate and validate Solution Outline Objectives (the blueprint for diagrams and the Solution Outline)
- **Diagrams (C4)**: Evaluate/patch/recheck C4 Context (L1) and C4 Container (L2) diagrams against Objectives + Inventory
- **Solution Outline**: Generate the Solution Outline from Objectives + Diagrams, evaluate it, patch it, and run final review against the Requirements Inventory
- **Build tasks**: Render diagrams and export a consolidated PDF (Docker-based)

## Workspace convention

This extension expects prompts/templates to live inside the workspace (versioned with the project), typically under:

- `agent/prompts/`
- `templates/` (for template files)

## Commands

Commands are available via Command Palette (Ctrl+Shift+P). Search for `SO:`.

### BRD
- `SO: Convert BRD (Word → Markdown)`

### Requirements Inventory
- `SO: Requirements Inventory Generate (Open Chat)`
- `SO: Requirements Inventory Evaluate (Open Chat)`
- `SO: Requirements Inventory Patch (Open Chat)`
- `SO: Requirements Inventory Recheck (Open Chat)`

### Objectives
- `SO: Objectives Generate (Open Chat)`
- `SO: Objectives Evaluate (Open Chat)`
- `SO: Objectives Patch (Open Chat)`
- `SO: Objectives Recheck (Open Chat)`

### Diagrams
- `SO: Diagram Evaluate (Select Diagram)`
- `SO: Diagram Patch (Select Diagram)`
- `SO: Diagram Recheck (Select Diagram)`

### Solution Outline
- `SO: Solution Outline Generate (Open Chat)`
- `SO: Solution Outline Evaluate (Objectives + Diagrams)`
- `SO: Solution Outline Patch (Open Chat)`
- `SO: Solution Outline Final Review (Requirements Inventory)`

### Workspace Tools
- `SO: Render Diagrams (Docker)`
- `SO: Build PDF (Docker)`
- `SO: Export PDF (Docker)`
- `SO: Clean Build Outputs`
- `SO: Open Generated PDF`

## Usage

1. Open VS Code
2. Access the Command Palette (Ctrl+Shift+P)
3. Search for "SO:" commands to use the extension features
4. For chat-based interactions, use the "so" chat participant in VS Code's chat interface

## Requirements

- VS Code 1.90.0 or higher
- Docker (for diagram rendering and PDF building)
- **Pandoc** (required for Word → Markdown conversion)

## Prerequisites

### Pandoc (required for Word → Markdown)

The workflow expects BRDs to be provided as Word (.docx). Pandoc is used to convert `.docx` to canonical Markdown.

Verify installation:
