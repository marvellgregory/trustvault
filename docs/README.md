# Documentation Overview

The docs directory contains the core architecture, workflow, standards, decisions, and operational documentation for TrustVault.

It is intended to help new developers, contributors, and AI assistants understand the project clearly and work consistently with the established direction.

## Documentation Index

| Document Name | Purpose | When it should be read |
| --- | --- | --- |
| PROJECT_CONTEXT.md | Defines the product vision, mission, branding rules, and project goals. | Read first when learning what TrustVault is and what it is trying to achieve. |
| ARCHITECTURE.md | Explains the technical architecture, repository structure, and implementation approach. | Read when understanding how the system is built or planning technical changes. |
| CLAUDE.md | Defines the working standards and expectations for AI-assisted development. | Read before asking Claude Code to make changes. |
| ROADMAP.md | Describes the milestone-based delivery plan and current phase of development. | Read when planning work or understanding what is being built next. |
| DECISIONS.md | Records the important architectural and workflow decisions, including the reasoning behind them. | Read when you need to understand why a decision was made and avoid undoing it later. |
| DEVELOPMENT_WORKFLOW.md | Documents the standard development process, branch strategy, quality checks, and collaboration practices. | Read before starting implementation work or preparing a change for review. |
| ASSET_GUIDE.md | Defines asset ownership, branding rules, image conventions, accessibility requirements, and optimisation expectations. | Read when working with images, branding, or public assets. |
| PRODUCT_CATALOG.md | Defines how the product catalogue is structured, maintained, and linked to the marketplace. | Read when updating or validating catalogue data and product mappings. |
| RELEASE_CHECKLIST.md | Provides a release readiness checklist for quality, accessibility, performance, and documentation review. | Read before release, milestone handoff, or final validation. |

## Recommended Reading Order

### New developers

1. PROJECT_CONTEXT.md
2. ARCHITECTURE.md
3. DEVELOPMENT_WORKFLOW.md
4. ROADMAP.md
5. ASSET_GUIDE.md
6. PRODUCT_CATALOG.md

### AI assistants (Claude Code)

1. PROJECT_CONTEXT.md
2. ARCHITECTURE.md
3. CLAUDE.md
4. ROADMAP.md
5. DEVELOPMENT_WORKFLOW.md
6. DECISIONS.md

### Contributors

1. PROJECT_CONTEXT.md
2. ROADMAP.md
3. DEVELOPMENT_WORKFLOW.md
4. ASSET_GUIDE.md
5. PRODUCT_CATALOG.md
6. RELEASE_CHECKLIST.md

## Single Source of Truth

The single source of truth for the project’s overall direction is PROJECT_CONTEXT.md.

This document establishes the product vision, core principles, branding rules, and goals that should guide architectural decisions, implementation work, and documentation updates.

## Adding New Documentation

New documentation should be added to the docs directory when it supports onboarding, architecture understanding, workflow clarity, release readiness, or long-term project maintenance.

Each new document should:

- have a clear purpose
- be linked from this index when relevant
- follow the existing naming and structure conventions
- remain aligned with the project’s current roadmap and decisions
