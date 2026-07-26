# TrustVault – Master Project Context

> Version: 1.0
> Status: Active Development
> Repository: TrustVault
> Owner: Marvell Gregory

---

# 1. Project Overview

TrustVault is a modern AI-powered commerce platform that combines secure shopping, gifting, escrow payments, bill splitting and future AI commerce into one trusted ecosystem.

TrustVault is built on Arc Network for USDC-powered payments while maintaining TrustVault as the primary customer-facing brand.

Arc is infrastructure.
TrustVault is the product.

---

# 2. Mission

Build the world's most trusted commerce platform where people can safely buy products, send gifts, split expenses, use escrow protection, and eventually purchase AI Agents from one secure dashboard.

---

# Project Goals

TrustVault aims to:

• Build a secure AI-powered commerce platform.

• Simplify global commerce using USDC.

• Provide trusted escrow for online purchases.

• Deliver an intuitive user experience across all devices.

• Support future AI commerce through a provider-agnostic architecture.

• Maintain compliance with Arc branding guidelines.

• Achieve production-grade security and performance.

---

# Design Principles

The TrustVault interface should always feel:

• Premium

• Modern

• Fast

• Minimal

• Clean

• Spacious

• Consistent

Whitespace is preferred over clutter.

Components should be reusable.

Animations should be subtle.

Never sacrifice usability for visual effects.

# 3. Vision

TrustVault is not just another marketplace.

The long-term vision is to become an AI Commerce Platform where users can:

• Buy physical products
• Buy digital products
• Purchase AI Agents
• Use secure escrow
• Send gifts globally
• Split bills
• Manage subscriptions
• Track orders
• Use one wallet for everything

Future versions should continue expanding this ecosystem while maintaining a clean and user-friendly experience.

---

# 4. Core Principles

Every decision should prioritise:

• Trust
• Security
• Simplicity
• Accessibility
• Performance
• Scalability
• Maintainability

If two approaches exist, choose the one that is easier to maintain long-term.

---

# 5. Branding

Primary Brand

TrustVault

Brand Colours

Black
Red
White
Dark Grey

Mascot

Friendly Gorilla

The mascot represents trust, strength, and protection.

Never redesign the mascot unless explicitly requested.

Primary Logo

trustvault-logo-primary.svg

Additional Assets

trustvault-logo-dark.svg
trustvault-logo-light.svg
trustvault-wordmark.svg
trustvault-icon.svg
trustvault-social.png
trustvault-og-image.png
marketplace-og.png
giftvault-og.png
checkout-og.png
trustvault-favicon.png

---

# 6. Arc Integration

TrustVault is built on Arc Network.

Arc is infrastructure only.

TrustVault must always remain the primary brand.

Approved wording:

Our app is built on Arc

Available on Arc

Our app supports Arc

We are live on Arc



Never use:

Arc TrustVault

Arc Marketplace

Arc Payments

Arc Gift Vault

Never incorporate the Arc name into TrustVault

Never pluralize or make progressive e.g., "Arcs” or “Arc’s”.

After the first reference to "Arc Network", use "Arc" throughout the application and documentation unless clarity requires the full name.

Never:

• Modify the Arc logo
• Recreate the Arc logo
• Change Arc colours
• Merge Arc branding into TrustVault branding

Always use the official Arc logo from Circle.

Maintain proper clear space.

Never imply endorsement.

Where appropriate, include attribution:

"Arc is a trademark of Circle Internet Group, Inc. and/or its affiliates."

---

# Definition of Done

A milestone is considered complete only when:

✓ Feature is implemented

✓ TypeScript passes

✓ ESLint passes

✓ Responsive on desktop

✓ Responsive on tablet

✓ Responsive on mobile

✓ Accessibility verified

✓ Images optimized

✓ Documentation updated

✓ Changes committed with descriptive Git messages

---

# Testing Requirements

Every completed feature should include:

Functional testing

Responsive testing

Accessibility testing

Error state testing

Empty state testing

Loading state testing

Edge case testing

---

# Performance Budget

Target First Contentful Paint:
< 1.5 seconds

Target Largest Contentful Paint:
< 2.5 seconds

Target Bundle Size:
Minimise JavaScript

Prefer server components where possible.

Lazy load images.

Optimise WebP assets.

Avoid unnecessary third-party packages.

---

# Documentation Requirements

Every major feature should update:

README

Relevant docs

Component documentation

Architecture notes

Roadmap status

PROJECT_CONTEXT.md if project scope changes.

---

# Development Milestones

Milestone 1
Repository setup
Documentation
Brand assets
Product catalogue

Milestone 2
Marketplace
Categories
Search
Filters
Product pages

Milestone 3
Shopping Cart
Wishlist
Checkout UI

Milestone 4
Wallet Connect
USDC Payments
Arc Testnet Integration

Milestone 5
Escrow Smart Contracts
Transaction History

Milestone 6
Gift Vault
Bill Split

Milestone 7
User Dashboard
Orders
Addresses
Feedback
Settings

Milestone 8
Performance
Accessibility
SEO
Testing

Milestone 9
Production Deployment

Milestone 10
AI Marketplace (Future)

---

# 7. Primary Features (Launch)

Marketplace

Gift Vault

Bill Split

Escrow Checkout

Wallet Connect

USDC Payments

User Dashboard

Wishlist

Feedback

Multi-language

Multi-currency display

Dark Mode

Light Mode

Black & White Reading Mode

Community

Roadmap

---

# 8. Future Features

AI Marketplace

My AI Agents

Agent Store

Subscriptions

Digital Products

Developer Marketplace

Enterprise Workflows

Community-built AI Agents

Agent Reviews

---

# 9. Marketplace

Supports:

Multiple sellers

Categories

Subcategories

Filters

Search

Sorting

Wishlist

Recently Viewed

Related Products

Cross-sell

Upsell

Ratings

Reviews

Stock Management

Responsive Product Gallery

Quick View

Buy Now

Add to Cart

---

# 10. Product Catalogue

Source of Truth

Excel Workbook

Claude generates

products.json

Never manually edit products.json unless necessary.

Every product contains:

SKU

Category

Subcategory

Brand

Product Name

Description

Price

Currency

Weight

Colours

Sizes

Stock

Seller

Specifications

SEO

Images

Related Products

Cross-sell

Upsell

AI Metadata

---

# 11. Product Images

Folder Structure

public/images/products/

category/

subcategory/

SKU/

cover.webp

1.webp

2.webp

3.webp

Rules

Images must remain WebP.

Image names never change.

Products are linked by SKU.

Never rename images after import.

---

# 12. Payments

Primary Currency

USDC

Marketplace prices are stored in USDC.

Display currencies include:

USD

EUR

GBP

INR

AUD

CAD

SGD

JPY

Currency conversion changes display only.

Transactions execute in USDC.

---

# 13. User Accounts

Users can:

Register

Login

Manage Profile

Manage Addresses

Wishlist

Orders

Gift Vault

Bill Split

Feedback

My AI Agents

Settings

Notifications

Security Settings

---

# 14. Feedback

Feedback is built into TrustVault.

Fields

Name

Email

Category

Rating

Message

Categories

General

Bug

Feature Request

Payment Issue

Seller Issue

Admin receives feedback via email.

Current destination:

marvellgregory85@gmail.com

---

# 15. Community

Official Channels

Discord

GitHub

LinkedIn

X

Reddit

Community links appear in:

Footer

Community Page

About Page

---

# 16. Accessibility

Follow WCAG.

Keyboard Navigation

ARIA Labels

Screen Reader Support

Responsive Design

High Contrast

Dark Mode

Light Mode

Black & White Reading Mode

Focus Indicators

---

# 17. Performance Targets

Google Lighthouse

Performance: 100

Accessibility: 100

Best Practices: 100

SEO: 100

Fast loading

Optimised images

Code splitting

Lazy loading

Server Components where appropriate

---

# 18. Security

Secure Authentication

Input Validation

Rate Limiting

Escrow Protection

Environment Variables

No Secrets in Git

Secure API Routes

Validation on both client and server

---

# 19. Technical Stack

Next.js

React

TypeScript

Tailwind CSS

Arc Network

USDC

Wallet Connect

GitHub

Vercel (Deployment)

Future:

PostgreSQL

Prisma

Redis

Cloud Storage

---

# Repository Structure

The project should follow this structure unless otherwise approved.

app/

components/

public/

public/images/

public/images/branding/

public/images/products/

data/

docs/

styles/

types/

utils/

hooks/

lib/

tests/

scripts/

Do not create new top-level folders unless necessary.

Reuse existing folders wherever possible.

# 20. Information Architecture

Home

Marketplace

Gift Vault

Bill Split

AI Agents (Future)

Roadmap

Community

About

Contact

Dashboard

Settings

Checkout

Feedback

---

# 21. Design Philosophy

Modern

Minimal

Premium

Fast

Accessible

Professional

Consistent

Reusable Components

Avoid unnecessary animations.

Every interaction should feel intentional.

---

# 22. Development Rules

Build incrementally.

Complete one milestone at a time.

Never rewrite working features unless requested.

Prefer reusable components.

Write production-ready code.

Avoid duplicate logic.

Use descriptive commit messages.

Keep documentation updated.

---

# 23. Current Status

Brand Identity
Complete

Documentation
Complete

Brand Assets
Complete

Product Images
Complete

Excel Catalogue
Complete

Marketplace Build
Starting

Checkout
Not Started

Gift Vault
Not Started

Escrow
Not Started

Wallet Connect
Not Started

AI Marketplace
Planned

Deployment
Not Started

---

# 24. Definition of Success

A successful TrustVault release should:

• Look premium
• Feel intuitive
• Meet Lighthouse targets
• Be mobile-first
• Follow accessibility best practices
• Scale to thousands of products
• Support secure USDC payments
• Comply with Arc branding guidelines
• Be production-ready

---

# 25. Instructions for Claude

Before making any code changes:

1. Read PROJECT_CONTEXT.md first.
2. Treat this document as the single source of truth.
3. Preserve the TrustVault brand identity.
4. Arc is infrastructure only.
5. Never redesign existing branding without approval.
6. Build one milestone at a time.
7. Stop after completing each requested milestone.
8. Ask for clarification if requirements are unclear.
9. Write clean, reusable, production-ready code.
10. Keep responsive behaviour across desktop, tablet and mobile.
11. Follow WCAG accessibility.
12. Optimise for Lighthouse.
13. Never commit secrets or API keys.
14. Use meaningful Git commit messages.
15. Maintain documentation alongside development.

    ---

# User Experience Principles

Every page should answer three questions immediately:

Where am I?

What can I do here?

What should I do next?

Navigation must remain intuitive.

No page should require more than three clicks to reach any major feature.

Primary actions should always be visually obvious.

Forms should minimise user effort.

Loading states should always be shown.

Meaningful empty states should exist throughout the application.

---


# Blockchain Principles

Only blockchain interactions that require trust should occur on-chain.

Marketplace browsing remains off-chain.

Product data remains off-chain.

Images remain off-chain.

Escrow transactions use smart contracts.

Wallet authentication uses industry standards.

Never expose private keys.

Never store sensitive wallet credentials.

---

# AI Principles

TrustVault is designed to support multiple AI providers.

The application must never depend on a single AI vendor.

Future AI providers should be interchangeable.

AI features should integrate through an abstraction layer.

Purchased AI Agents belong to the user's account.

The platform architecture must remain provider-agnostic.

---

# Deployment Strategy

Development

↓

GitHub

↓

Pull Request

↓

Automated Tests

↓

Preview Deployment

↓

Manual Approval

↓

Production Deployment

Production deployments must only occur after successful testing.

---

# Coding Standards

Use TypeScript.

Avoid the "any" type whenever possible.

Use descriptive variable names.

Prefer functional components.

Keep components small and reusable.

Avoid deeply nested logic.

Use server components when appropriate.

Write self-documenting code.

Add comments only where they improve understanding.

---

# Component Philosophy

Components should be:

Reusable

Composable

Accessible

Small

Easy to test

Avoid components larger than 300 lines whenever practical.

If a component becomes too large, split it into smaller reusable pieces.

---

# Git Workflow

Every feature should be developed in small logical commits.

Example:

feat: add marketplace layout

feat: import product catalogue

feat: add wishlist functionality

fix: resolve mobile navigation

docs: update README

Never combine unrelated changes into one commit.

---



# Future Integrations

The architecture should remain open for future integrations including:

AI Providers

Payment Providers

Analytics

Email Services

Push Notifications

Cloud Storage

Search Engines

No feature should tightly couple the application to one external provider.

---

# Decision Making

If implementation details are unclear:

Do not guess.

Do not invent business logic.

Do not fabricate APIs.

Do not fabricate blockchain interactions.

Do not fabricate Arc functionality.

Ask for clarification whenever assumptions would affect functionality.

---


# Administration

Version 1 should include planning for an admin dashboard.

Potential capabilities include:

Manage Products

Manage Orders

Manage Users

Manage Reviews

Manage Feedback

Manage Gift Vaults

Manage AI Agents

View Analytics

View Payments

This functionality may be released in future milestones.

---

# Non-Goals (Version 1)

The following features are intentionally excluded from Version 1:

• Native mobile applications

• Cryptocurrency trading

• NFT marketplace

• Token issuance

• DAO governance

• Community AI Agents

• Enterprise dashboards

• Multi-vendor admin portal

These features may be considered in future releases.

End of PROJECT_CONTEXT.md
