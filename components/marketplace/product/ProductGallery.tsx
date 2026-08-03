"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ProductId } from "@/lib/marketplace/product-types";
import {
  browserProductImageRepository,
  createProductImageObjectUrl,
  revokeProductImageObjectUrl,
  type StoredProductImage,
} from "@/lib/marketplace/repository/product-image-repository";

type ProductGalleryProps = {
  productId: ProductId;
  productTitle: string;
};

type GalleryStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

type GalleryImage = {
  image: StoredProductImage;
  objectUrl: string;
};

export function ProductGallery({
  productId,
  productTitle,
}: ProductGalleryProps) {
  const [status, setStatus] =
    useState<GalleryStatus>("loading");

  const [images, setImages] =
    useState<GalleryImage[]>([]);

  const [activeIndex, setActiveIndex] =
    useState(0);

  useEffect(() => {
    let isMounted = true;
    const createdUrls: string[] = [];

    async function loadImages() {
      setStatus("loading");
      setImages([]);
      setActiveIndex(0);

      try {
        const storedImages =
          await browserProductImageRepository.findByProductId(
            productId,
          );

        if (!isMounted) {
          return;
        }

        if (storedImages.length === 0) {
          setStatus("empty");
          return;
        }

        const galleryImages = storedImages.map((image) => {
          const objectUrl =
            createProductImageObjectUrl(image);

          createdUrls.push(objectUrl);

          return {
            image,
            objectUrl,
          };
        });

        setImages(galleryImages);
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    loadImages();

    return () => {
      isMounted = false;

      createdUrls.forEach((url) => {
        revokeProductImageObjectUrl(url);
      });
    };
  }, [productId]);

  const activeImage =
    images[activeIndex] ?? null;

  const hasMultipleImages =
    images.length > 1;

  const activeAlt = useMemo(() => {
    if (!activeImage) {
      return productTitle;
    }

    return activeImage.image.role === "cover"
      ? `${productTitle} cover image`
      : `${productTitle} gallery image ${activeIndex}`;
  }, [
    activeImage,
    activeIndex,
    productTitle,
  ]);

  function showPrevious() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0
        ? images.length - 1
        : currentIndex - 1,
    );
  }

  function showNext() {
    setActiveIndex((currentIndex) =>
      currentIndex === images.length - 1
        ? 0
        : currentIndex + 1,
    );
  }

  if (status === "loading") {
    return (
      <GalleryState
        icon={LoaderCircle}
        label="Loading product images…"
        isLoading
      />
    );
  }

  if (
    status === "empty" ||
    status === "error" ||
    !activeImage
  ) {
    return (
      <GalleryState
        icon={ImageIcon}
        label="Product image unavailable"
      />
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-zinc-200 bg-white">
        <img
          src={activeImage.objectUrl}
          alt={activeAlt}
          className="h-full w-full object-contain p-4 sm:p-6"
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Show previous product image"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-950 shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <ChevronLeft
                aria-hidden="true"
                className="h-5 w-5"
              />
            </button>

            <button
              type="button"
              onClick={showNext}
              aria-label="Show next product image"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-950 shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <ChevronRight
                aria-hidden="true"
                className="h-5 w-5"
              />
            </button>
          </>
        )}
      </div>

      {hasMultipleImages && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((galleryImage, index) => (
            <button
              key={galleryImage.image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={`aspect-square overflow-hidden rounded-2xl border bg-white p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 ${
                index === activeIndex
                  ? "border-zinc-950"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <img
                src={galleryImage.objectUrl}
                alt=""
                className="h-full w-full rounded-xl object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type GalleryStateProps = {
  icon: typeof ImageIcon;
  label: string;
  isLoading?: boolean;
};

function GalleryState({
  icon: Icon,
  label,
  isLoading = false,
}: GalleryStateProps) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-100">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-600 shadow-sm">
          <Icon
            aria-hidden="true"
            className={`h-6 w-6 ${
              isLoading ? "animate-spin" : ""
            }`}
          />
        </span>

        <p className="mt-3 text-sm font-medium text-zinc-500">
          {label}
        </p>
      </div>
    </div>
  );
}
