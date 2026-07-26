# TrustVault Asset Guide

## Purpose

This document defines how assets are organised, named, and used across TrustVault.

It complements the product catalogue and architecture documentation by setting the standards for images, branding, and production-ready asset handling.

---

## 1. Source Assets vs Production Assets

TrustVault keeps source assets separate from production assets.

- Source assets belong in source-data/
- Production assets belong in public/

### Source assets

Use source-data/ for original, editable, or working files such as:

- source-data/product-images/
- source-data/branding/
- source-data/exports/
- source-data/excel/TrustVault Product Catalogue.xlsx

### Production assets

Use public/ for deployment-ready assets such as:

- public/images/products/
- public/images/branding/
- public/images/ui/

Do not treat public assets as the original source of truth.

---

## 2. TrustVault Branding Rules

TrustVault is the primary brand.

Arc is infrastructure and must not be visually merged into TrustVault branding.

### TrustVault brand standards

- Use the official TrustVault logo set where available.
- Preserve the premium, minimal, modern, and trustworthy tone.
- Do not redesign the mascot or logo system without explicit approval.
- Keep branding consistent across web, product cards, social media, and marketing surfaces.

### TrustVault asset locations

TrustVault branding assets should be placed under:

- public/images/branding/trustvault/logos/
- public/images/branding/trustvault/mascot/
- public/images/branding/trustvault/social/

---

## 3. Official Arc Asset Usage Rules

Arc is an infrastructure partner and must remain visually distinct from TrustVault.

### Rules

- Use only official Arc assets provided by Circle or approved sources.
- Do not recreate, alter, or reinterpret the Arc logo.
- Do not merge Arc branding into TrustVault visuals.
- Do not use Arc branding as a substitute for TrustVault branding.
- Use Arc references only where appropriate and with correct attribution if required.

### Arc asset locations

Approved Arc assets should be placed under:

- public/images/branding/arc/logos/
- public/images/branding/arc/guidelines/

---

## 4. WebP Product Image Requirements

All product images should be optimised and delivered as WebP where possible.

### Requirements

- Prefer WebP for product cards, detail views, and gallery assets.
- Keep files compressed without visible quality loss.
- Use the same naming structure across all products.
- Do not introduce mixed naming conventions for equivalent assets.

### Standard product image file set

Each product folder should contain:

- cover.webp
- 1.webp
- 2.webp
- 3.webp

These files should be stored in the product folder under public/images/products/<category>/<product-id>/.

---

## 5. Product Folder and Filename Conventions

### Folder conventions

- Use the Product ID as the folder name.
- Keep category folders in lowercase-kebab-case.
- Preserve existing product category and Product ID folders under public/images/products/.

### Filename conventions

- Use lowercase filenames.
- Use simple numeric names for gallery images: 1.webp, 2.webp, 3.webp.
- Use cover.webp for the primary product image.
- Do not rename existing product image files unless a documented migration is approved.

---

## 6. next/image Requirements

All product and marketing images should be implemented using the Next.js image component where appropriate.

### Requirements

- Use next/image for responsive image rendering.
- Provide width and height values.
- Use meaningful alt text.
- Avoid layout shift by providing explicit dimensions.
- Use sizes to match the expected display width.
- Prefer lazy loading for below-the-fold images.
- Use priority loading only for above-the-fold hero or featured images.

### Layout shift prevention

- Always provide explicit image dimensions.
- Avoid undefined image size behaviour.
- Reserve space for images before they load.

---

## 7. Alt Text and Accessibility Requirements

Accessibility is mandatory.

### Rules

- Every meaningful image must include descriptive alt text.
- Decorative images should have empty alt attributes.
- Avoid vague wording such as image or photo.
- Describe the content or purpose of the image clearly.
- Ensure images are not the only source of information when important content is conveyed visually.

---

## 8. Image Sizing, Lazy Loading, and Responsive Handling

### Sizing

- Use image sizes that reflect the display context.
- Avoid serving oversized images for small viewports.
- Keep product card images optimised for the card layout.

### Lazy loading

- Apply lazy loading to non-critical images.
- Reserve eager loading for prominent hero or first-screen images.

### Responsive sizes

- Use responsive size hints so the browser can choose the correct image source.
- Align sizes with the layout breakpoints used by the application.

### Layout shift prevention

- Maintain stable image dimensions.
- Use fixed aspect ratios where possible.
- Do not allow images to collapse or reflow unpredictably during load.

---

## 9. Favicon, Social, Banner, Placeholder, Icon, and UI Asset Rules

### Favicon

- Store favicon assets in public/images/branding/ or a dedicated favicon location if introduced later.
- Use a single, consistent icon for browser tab usage.

### Social and banner images

- Keep social and banner assets separate from product images.
- Use them only for sharing, previews, and marketing surfaces.

### Placeholder images

- Placeholder assets belong in public/images/placeholders/.
- Use them for empty states, missing media, or temporary previews.

### Icons and UI assets

- Keep UI assets in public/images/ui/.
- Use them for visual interface elements such as icons, decorations, and small state graphics.

---

## 10. Lighthouse Asset Requirements

Asset choices should support strong Lighthouse scores.

### Targets

- Fast image delivery
- Optimised image sizes
- Minimal layout shift
- Accessible alt text
- Efficient caching and compression

### Review expectations

- Product images should load quickly.
- Hero and primary images should be optimised.
- Avoid oversized or unnecessary media.
- Ensure images contribute positively to Performance, Accessibility, Best Practices, and SEO.
