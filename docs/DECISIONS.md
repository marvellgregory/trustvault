# TrustVault Architecture Decision Log (ADR)

## Purpose

This document records significant architectural, technical, and workflow decisions made during the development of TrustVault.

It explains what decision was made, why it was made, when it was made, and the expected long-term impact.

This document should be updated whenever a structural, architectural, or workflow decision is introduced or changed.

---

## Decision Template

### ADR-XXX

### Date

YYYY-MM-DD

### Status

Accepted / Proposed / Deprecated / Superseded / Rejected

### Decision

A short statement of the decision.

### Reason

Why the decision was made.

### Alternatives Considered

Other options that were evaluated.

### Impact

Expected benefits, trade-offs, and downstream effects.

---

## ADR-001

### Date

2026-07-26

### Status

Accepted

### Decision

Product folders use Product IDs as their canonical names.

Example:

- TV-BBW-000001

instead of:

- Vitamin C Body Wash

### Reason

Product names can change over time, while Product IDs remain stable and unique across the catalogue, application, and future integrations.

### Alternatives Considered

Using product names as folder names.

Rejected because names may change and can include spaces or special characters.

### Impact

Positive:

- Stable folder structure
- Easier imports and automation
- Simpler product lookup
- Better scalability

---

## ADR-002

### Date

2026-07-26

### Status

Accepted

### Decision

Source assets live in source-data/ and production assets live in public/.

### Reason

This keeps original materials separate from deployment-ready assets and prevents production files from being treated as source-of-truth content.

### Alternatives Considered

Keeping everything in a single folder.

Rejected because it makes asset provenance and publishing workflow less clear.

### Impact

Positive:

- Clear separation of source and production assets
- Easier asset review and versioning
- Cleaner publishing pipeline

---

## ADR-003

### Date

2026-07-26

### Status

Accepted

### Decision

Product images are stored and delivered as WebP files where possible.

### Reason

WebP offers better compression and faster loading, which supports stronger performance and better Core Web Vitals.

### Alternatives Considered

Using JPEG or PNG as the default image format.

Rejected because they are typically larger and less efficient for web delivery.

### Impact

Positive:

- Smaller file sizes
- Faster page loading
- Better performance characteristics

---

## ADR-004

### Date

2026-07-26

### Status

Accepted

### Decision

Product image folders use a simple, consistent file naming convention.

Expected structure:

- cover.webp
- 1.webp
- 2.webp
- 3.webp

### Reason

A simple naming scheme is easy to understand, easy to automate, and consistent across products.

### Alternatives Considered

Using descriptive or custom file names per product.

Rejected because it adds friction to automation and import workflows.

### Impact

Positive:

- Consistent asset structure
- Easier scripting and imports
- Less bookkeeping

---

## ADR-005

### Date

2026-07-26

### Status

Accepted

### Decision

Categories use lowercase kebab-case.

Examples:

- home-kitchen
- oral-care
- gift-vault

### Reason

This naming convention works reliably across operating systems, URLs, and tooling.

### Alternatives Considered

Using spaces, mixed casing, or underscores.

Rejected because they are less consistent and less convenient for automation.

### Impact

Positive:

- Cleaner folder names
- Better URL and path compatibility
- Easier automation

---

## ADR-006

### Date

2026-07-26

### Status

Accepted

### Decision

One milestone is developed per Git branch.

### Reason

This keeps pull requests small, easier to review, and better aligned with the roadmap.

### Alternatives Considered

Combining multiple milestones into a single branch.

Rejected because it increases merge complexity and review risk.

### Impact

Positive:

- Cleaner review flow
- Easier rollback and testing
- Better milestone tracking

---

## ADR-007

### Date

2026-07-26

### Status

Accepted

### Decision

AI-assisted development completes one milestone at a time rather than attempting multiple milestones in one pass.

### Reason

This reduces feature creep, keeps work focused, and improves code review quality.

### Alternatives Considered

Bundling several milestones into a single prompt.

Rejected because it creates larger changes and makes validation harder.

### Impact

Positive:

- Better focus
- Easier testing
- Lower review burden

---

## ADR-008

### Date

2026-07-26

### Status

Accepted

### Decision

The Excel workbook is the master product catalogue.

### Reason

It acts as a single source of truth for product data and avoids duplicating product information across multiple files.

### Alternatives Considered

Maintaining product lists in code or separate JSON files as the primary source.

Rejected because it would create drift as the catalogue evolves.

### Impact

Positive:

- Consistent product data
- Easier catalogue updates
- Better long-term maintainability

---

## ADR-009

### Date

2026-07-26

### Status

Accepted

### Decision

Marketplace products are generated from the catalogue rather than being hardcoded.

### Reason

This allows the marketplace to grow without requiring repeated application code changes for every new product.

### Alternatives Considered

Hardcoding product entries into the application.

Rejected because it is brittle and does not scale well.

### Impact

Positive:

- Scalable product onboarding
- Less manual editing
- Better future automation

---

## ADR-010

### Date

2026-07-26

### Status

Accepted

### Decision

Repository documentation lives under docs/.

### Reason

This centralizes project context, architecture, roadmap, workflow, and asset guidance in one place.

### Alternatives Considered

Scattering documentation across the repository.

Rejected because it makes onboarding and maintenance harder.

### Impact

Positive:

- Easier navigation
- Better contributor experience
- Stronger project memory

---

## ADR-011

### Date

2026-07-26

### Status

Accepted

### Decision

Every major directory contains a README.md where appropriate.

### Reason

This makes the repository self-documenting and reduces the need to infer structure from code alone.

### Alternatives Considered

Leaving directories undocumented.

Rejected because it makes the repository harder to understand and maintain.

### Impact

Positive:

- Faster onboarding
- Better context for contributors
- Easier handoffs

---

## ADR-012

### Date

2026-07-26

### Status

Accepted

### Decision

The marketplace will use real products rather than placeholder or demo-only products.

### Reason

Development should mirror production as closely as possible so the product experience remains realistic and valuable.

### Alternatives Considered

Using mock or fictional products throughout development.

Rejected because it weakens validation and creates unnecessary rework later.

### Impact

Positive:

- More realistic product experience
- Better future readiness
- Stronger product validation

---

## ADR-013

### Date

2026-07-26

### Status

Accepted

### Decision

Application development proceeds milestone-by-milestone following ROADMAP.md.

### Reason

This creates predictable progress, makes testing more manageable, and supports safer releases.

### Alternatives Considered

Building large features in an ad hoc way.

Rejected because it increases risk and makes progress harder to track.

### Impact

Positive:

- Predictable execution
- Easier quality control
- Better planning and review

---

## Decision Status

Each decision should use one of the following states:

- Accepted
- Proposed
- Deprecated
- Superseded
- Rejected

## Updating Decisions

Whenever an architectural decision changes:

- Do not overwrite the previous decision.
- Mark the old decision as Superseded if appropriate.
- Add a new decision with a new ADR ID.
- Reference the earlier decision when relevant.

This preserves project history and keeps the reasoning behind major choices visible over time.

---

Maintained as part of the TrustVault architecture documentation.
