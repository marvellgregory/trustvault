# Welcome

Thank you for contributing to TrustVault.

TrustVault is a modern, secure, and performance-focused commerce platform built around trust, accessibility, and long-term maintainability. Contributions should reflect the project’s vision and uphold a high standard of code quality, documentation, and user experience.

# Development Philosophy

TrustVault is developed in small, reviewable milestones.

- One milestone per feature branch.
- One milestone per Claude Code prompt.
- Keep changes focused and easy to review.
- Leave the repository in a working state after each milestone.

# Getting Started

## Clone the repository

```bash
git clone <repository-url>
cd trustvault
```

## Install dependencies

```bash
npm install
```

## Start the development server

```bash
npm run dev
```

## Run lint

```bash
npm run lint
```

## Run build

```bash
npm run build
```

# Branch Naming

Use clear, consistent branch names.

Examples:

- feature/marketplace-homepage
- docs/add-contribution-guide
- fix/mobile-navigation
- refactor/product-card-layout
- chore/update-dependencies

Recommended prefixes:

- feature/
- docs/
- fix/
- refactor/
- chore/

# Commit Messages

Use Conventional Commits.

Examples:

- feat: add marketplace homepage
- fix: resolve mobile navigation issue
- docs: add contribution guide
- refactor: simplify product card layout
- chore: update dependencies

Keep commits descriptive and scoped to the work completed.

# Pull Requests

Before opening a pull request:

- Review your changes carefully.
- Verify documentation is updated when needed.
- Run TypeScript checks.
- Run ESLint.
- Run the production build.
- Confirm the repository is in a clean, reviewable state with git status.

Pull requests should be small, focused, and easy to review.

# Documentation Standards

Documentation is part of the product.

- PROJECT_CONTEXT.md is the project source of truth for goals, principles, and branding.
- Architecture decisions belong in DECISIONS.md.
- Workflow changes belong in DEVELOPMENT_WORKFLOW.md.
- Asset standards belong in ASSET_GUIDE.md.
- Catalogue standards belong in PRODUCT_CATALOG.md.

When making changes that affect structure, workflow, or product conventions, update the relevant documentation.

# Asset Standards

Assets must follow the project’s established structure.

- Source assets belong in source-data/.
- Production assets belong in public/images/.
- Product folders should use Product IDs.
- Product image files should follow the convention:
  - cover.webp
  - 1.webp
  - 2.webp
  - 3.webp
- Product images should use WebP format where possible.
- Category naming should follow lowercase-kebab-case.

# AI Collaboration

Claude Code should be used as a development partner, not as an autonomous replacement for contributor judgment.

When working with Claude Code:

- Read the documentation first.
- Complete one milestone only.
- Do not implement unrelated features.
- Stop after the requested milestone is complete.
- Summarise changes before committing.

# Quality Standards

Contributions should meet the following expectations:

- Accessibility
- Responsive design
- Type safety
- Performance
- Lighthouse optimisation
- Maintainability

Work should be production-ready and consistent with the rest of the project.

# Security

Security is a core requirement.

- Secrets must never be committed.
- Environment variables must not be hardcoded.
- Third-party dependencies should be reviewed before installation.
- Sensitive or private data must never be exposed in code or documentation.

# License

TrustVault is distributed under the MIT License.
