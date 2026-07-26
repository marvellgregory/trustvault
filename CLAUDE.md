# CLAUDE.md

# TrustVault Development Guide for Claude Code

This document defines how Claude should work on the TrustVault project.

PROJECT_CONTEXT.md contains the project vision.

ARCHITECTURE.md contains the technical blueprint.

This file defines the development workflow.

---

# Core Rule

Before beginning any task:

1. Read PROJECT_CONTEXT.md
2. Read ARCHITECTURE.md
3. Read this CLAUDE.md
4. Understand the requested milestone
5. Ask questions if requirements are unclear

Never begin coding without understanding the overall project.

---

# Development Philosophy

Build the project incrementally.

One milestone at a time.

Never build multiple major features in one session unless explicitly requested.

Every completed milestone should leave the repository in a working state.

---

# Code Quality

Always produce:

- Production-ready code
- Clean architecture
- Readable code
- Strong typing
- Small reusable components
- Responsive layouts
- Accessible interfaces
- Maintainable structure

Avoid shortcuts.

Avoid temporary fixes unless explicitly requested.

---

# Repository Rules

Respect the existing repository structure.

Do not create unnecessary folders.

Do not rename files without approval.

Do not remove existing functionality.

Do not introduce duplicate code.

Prefer extending existing components.

---

# Git Workflow

Work in small logical milestones.

After each milestone:

- Verify functionality
- Fix lint errors
- Fix TypeScript errors
- Update documentation if needed
- Create a descriptive Git commit

Example commit messages:

feat: create marketplace homepage

feat: add responsive navigation

feat: import product catalogue

feat: create product card component

fix: resolve mobile layout issue

docs: update architecture documentation

Never combine unrelated work into one commit.

---

# Design Rules

Always follow the TrustVault design language.

Design should feel:

- Premium
- Minimal
- Fast
- Modern
- Spacious

Avoid:

- Heavy shadows
- Excessive animations
- Cluttered layouts
- Inconsistent spacing

Use reusable design tokens whenever possible.

---

# Branding Rules

TrustVault is always the primary brand.

Arc is infrastructure.

Follow all branding requirements defined in PROJECT_CONTEXT.md.

Never redesign logos.

Never modify official Arc assets.

---

# Component Rules

Components should:

- Have one responsibility
- Be reusable
- Be composable
- Be accessible
- Be easy to test

Prefer composition over duplication.

Split large components into smaller ones.

---

# Styling

Use Tailwind CSS.

Avoid inline styles.

Use reusable utility classes.

Maintain consistent spacing.

Maintain consistent typography.

Support:

- Desktop
- Tablet
- Mobile

---

# Accessibility

Follow WCAG best practices.

Ensure:

- Keyboard navigation
- Screen reader compatibility
- Proper ARIA labels
- Visible focus states
- Sufficient colour contrast

Accessibility is never optional.

---

# Performance

Optimise every feature.

Prefer:

- Server Components
- Lazy loading
- Dynamic imports
- Optimised WebP images
- Code splitting

Avoid unnecessary dependencies.

---

# Security

Never expose:

- API keys
- Wallet secrets
- Private credentials

Always use environment variables.

Validate all user input.

Never trust client-side data alone.

---

# Documentation

Update documentation whenever major architectural decisions change.

Relevant files include:

- README.md
- PROJECT_CONTEXT.md
- ARCHITECTURE.md

Keep documentation aligned with implementation.

---

# Decision Making

If requirements are unclear:

Stop.

Ask questions.

Never invent:

- APIs
- Smart contracts
- Blockchain behaviour
- Database schemas
- Business rules

Avoid assumptions.

---

# Milestone Workflow

For every milestone:

1. Understand the objective
2. Plan the implementation
3. Build the feature
4. Test functionality
5. Test responsiveness
6. Test accessibility
7. Fix issues
8. Update documentation
9. Commit changes
10. Stop and wait for approval

Never continue automatically to the next milestone.

---

# Definition of Done

A milestone is complete only when:

✓ Feature works correctly

✓ Responsive on all devices

✓ TypeScript passes

✓ ESLint passes

✓ Accessibility verified

✓ Documentation updated

✓ No known breaking issues

✓ Git commit created

---

# Communication Style

Explain major implementation decisions.

Highlight trade-offs.

Recommend best practices.

Ask for clarification whenever needed.

Be concise and technical.

Avoid unnecessary explanations.

---

# Long-Term Goal

Build TrustVault into a scalable, maintainable, production-ready AI-powered commerce platform that can support thousands of products, secure USDC payments, escrow services, and future AI marketplace capabilities.

Every code change should move the project closer to that goal.

End of CLAUDE.md
