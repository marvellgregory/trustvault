# TrustVault Product Catalogue Guide

## Purpose

This document defines how the TrustVault product catalogue is maintained and how product assets are linked to the marketplace.

The Excel workbook in source-data/excel/ is the master catalogue for TrustVault.

---

## 1. Master Catalogue

The authoritative product catalogue is:

- source-data/excel/TrustVault Product Catalogue.xlsx

This workbook is the single source of truth for:

- Product IDs
- Product names
- Categories
- SKUs
- Prices
- Metadata
- Inventory-related information where applicable

Do not treat application code or generated files as a replacement for the workbook.

---

## 2. Product ID and SKU Conventions

### Product ID

- Use the Product ID as the stable identifier.
- Preserve existing Product IDs.
- Do not rename Product IDs without a documented migration.

### SKU

- Keep SKU values consistent with the catalogue data.
- Use the SKU as the product reference where required by downstream tooling.
- Avoid introducing a second product identity that could drift from the workbook.

---

## 3. Category Naming Rules

Categories must follow lowercase-kebab-case.

Examples:

- beauty
- skincare
- oral-care
- home-kitchen
- gift-vault

Category folder names in public/images/products/ should match the normalised category naming rules.

---

## 4. Image Mapping Rules

Each product should map to a product image folder under:

- public/images/products/<category>/<product-id>/

### Image expectations

- cover.webp for the main product image
- 1.webp, 2.webp, and 3.webp for supporting images

The image folder should be derived from the Product ID and category values from the catalogue.

Do not create image folders with product names instead of Product IDs.

---

## 5. Adding, Updating, and Removing Products

### Adding a product

1. Add the product to the Excel workbook.
2. Create or confirm the matching category folder.
3. Create or confirm the product folder under the correct category.
4. Add the relevant WebP assets.
5. Validate that the product data and image mapping align.

### Updating a product

1. Update the workbook entry.
2. Update any corresponding asset references.
3. Preserve Product ID stability.
4. Verify the marketplace output and image paths.

### Removing a product

1. Remove or archive the product entry in the workbook.
2. Remove or deprecate its associated assets if a migration is approved.
3. Ensure the marketplace no longer depends on the removed product.
4. Update documentation if the product is no longer part of the supported catalogue.

---

## 6. Future Generation of products.json

A future products.json file should be generated from the Excel workbook rather than hand-maintained.

### Future rule

- The workbook remains the master source.
- Generated data should be derived from that source.
- Avoid duplicate product definitions across code and data files.

This ensures the marketplace can scale without constant manual edits.

---

## 7. Catalogue Validation Requirements

The catalogue should be validated before release.

### Validation checks

- Product IDs are unique.
- Categories follow the naming rules.
- Product image folders match the catalogue data.
- No product references point to missing image folders.
- Product data is consistent with the workbook.
- No duplicate or conflicting product definitions exist.

---

## 8. Catalogue Governance

- Preserve existing Product IDs.
- Do not modify the Excel workbook as part of unrelated work.
- Keep catalogue changes traceable and documented.
- Use the workbook as the source of truth for future marketplace data generation.
