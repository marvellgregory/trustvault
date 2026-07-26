# Purpose

This document establishes the engineering standards for TrustVault.

Its purpose is to improve maintainability, readability, performance, accessibility, and long-term scalability across the codebase.

# General Principles

- Write clean, readable code.
- Prefer simplicity over cleverness.
- Avoid duplication (DRY).
- Keep components small and reusable.
- Maintain consistent formatting.
- Prefer solutions that are easy to understand and maintain over short-term shortcuts.

# TypeScript Standards

- Use strict typing.
- Avoid `any`.
- Prefer interfaces for public contracts.
- Use type aliases where appropriate.
- Export reusable types.
- Keep type definitions close to the code that uses them.

# React Standards

- Use functional components only.
- Prefer Server Components by default.
- Use Client Components only when interaction is required.
- Keep components focused on a single responsibility.
- Prefer composition over deeply nested component structures.
- Avoid unnecessary state where simpler props or server-rendered content will do.

# Next.js Standards

- Follow the App Router conventions.
- Use `next/image` for production images.
- Use `next/font` for fonts.
- Optimise metadata using the Metadata API.
- Minimise client-side JavaScript.
- Keep routes and data loading patterns predictable and maintainable.

# File & Folder Naming

Use consistent naming conventions across the repository.

- React components: PascalCase
- Utilities: camelCase
- Folders: lowercase-kebab-case
- Documentation: UPPERCASE_WITH_UNDERSCORES.md

Examples:

- Header.tsx
- formatCurrency.ts
- marketplace-homepage/
- PROJECT_CONTEXT.md

# Imports

- Group imports logically.
- Remove unused imports.
- Prefer absolute imports if configured.
- Keep import lists readable and ordered.

# Styling

- Use Tailwind CSS only.
- Avoid inline styles unless there is a strong justification.
- Build reusable styling patterns rather than repeating utility classes in multiple places.
- Keep styling consistent with the TrustVault design language.

# Accessibility

All user-facing work should be accessible.

- Use semantic HTML.
- Support keyboard accessibility.
- Maintain a proper heading hierarchy.
- Use descriptive alt text.
- Ensure sufficient colour contrast.
- Provide visible focus states.
- Avoid relying on colour alone to communicate meaning.

# Performance

Performance is a core product requirement.

- Optimise images.
- Use lazy loading for non-critical images.
- Use dynamic imports where appropriate.
- Minimise bundle size.
- Avoid unnecessary re-renders.
- Prefer efficient rendering patterns and minimal client-side logic.

# Lighthouse Targets

TrustVault should aim for the following Lighthouse targets:

- Performance: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 100

These targets should guide implementation decisions. However, some third-party integrations may occasionally reduce individual scores and should be evaluated case by case.

# Error Handling

Code should fail gracefully.

- Provide user-friendly error messages.
- Handle loading and empty states clearly.
- Log failures where appropriate.
- Prefer defensive programming and safe fallbacks.
- Avoid silent failures.

# Testing Expectations

Testing should be practical and aligned with the milestone.

Expected validation includes:

- Manual verification.
- Build validation.
- Linting.
- Type checking.

Features should be verified in the browser and checked for responsive behaviour before completion.

# Security

Security requirements apply throughout the project.

- Never expose secrets.
- Use environment variables.
- Validate user input.
- Keep dependencies reviewed and updated.
- Avoid introducing unnecessary third-party code.

# AI Collaboration

AI-generated code must follow these standards.

When using Claude Code or similar tools, generated changes should:

- Follow this document.
- Respect the guidance in CLAUDE.md.
- Remain aligned with the project architecture and roadmap.

# Definition of Done

A task is considered complete only when the following checklist is satisfied:

- [ ] Code is complete
- [ ] Documentation is updated where relevant
- [ ] TypeScript passes
- [ ] ESLint passes
- [ ] Production build succeeds
- [ ] Responsive behaviour is verified
- [ ] Accessibility is reviewed
- [ ] Performance has been considered
- [ ] No unnecessary dependencies have been added
- [ ] The work is ready for Pull Request
