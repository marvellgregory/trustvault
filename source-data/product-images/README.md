# TrustVault Product Image Source Assets

## Purpose

This folder contains the master product image assets used to build the TrustVault marketplace.

These files are considered the source images for the project.

The production application does not load images directly from this folder.

Instead, approved images are copied into:

public/images/products/

before deployment.

---

# Folder Structure

source-data/

    product-images/
        beauty/
        skincare/
        oral-care/
        perfumes/
        haircare/
        sports/
        books/
        footwear/
        home-kitchen/
        digital/
        fashion/

---

# Image Naming Convention

Each product should have its own folder containing only the following files:

cover.webp
1.webp
2.webp
3.webp

Example:

TV-BBW-000001/

    cover.webp
    1.webp
    2.webp
    3.webp

Do not rename these filenames.

---

# Product Folder Naming

Product folders must use the canonical Product ID from the TrustVault Product Catalogue.

Example:

TV-BBW-000001
TV-SKN-000014
TV-SPR-000005

Never use product names as folder names.

---

# Image Requirements

- WebP format only
- Optimized for web delivery
- High quality
- Transparent backgrounds where applicable
- Consistent lighting and aspect ratio

---

# Source of Truth

Product information is maintained in:

source-data/excel/
TrustVault Product Catalogue.xlsx

The workbook is the authoritative source for:

- Product ID
- SKU
- Product Name
- Category
- Pricing
- Inventory
- Metadata

---

# Workflow

1. Add new products to the catalogue.
2. Export or prepare WebP images.
3. Place images in this folder.
4. Verify filenames.
5. Copy approved assets into:

public/images/products/

6. Commit production assets.

---

# Do Not

- Rename Product IDs.
- Rename image filenames.
- Edit images inside public/images/.
- Store temporary or draft images here.
- Delete source assets after deployment.

---

# Related Directories

source-data/excel/
Master product catalogue.

public/images/products/
Production-ready images used by the application.

public/images/placeholders/
Placeholder assets used when product images are unavailable.

---

Maintained as part of the TrustVault asset pipeline.
