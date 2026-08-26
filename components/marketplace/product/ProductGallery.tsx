"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ProductImage,
} from "@/lib/marketplace/product-types";
import {
  browserProductRepository,
} from "@/lib/marketplace/repository/product-repository";

type ProductGalleryProps = {
  productId: string;
  productTitle: string;
};

type GalleryStatus =
  | "loading"
  | "ready"
  | "error";

export function ProductGallery({
  productId,
  productTitle,
}: ProductGalleryProps) {
  const [status, setStatus] =
    useState<GalleryStatus>("loading");

  const [images, setImages] =
    useState<ProductImage[]>([]);

  const [activeIndex, setActiveIndex] =
    useState(0);

  useEffect(() => {
    let active = true;

    async function loadImages() {
      setStatus("loading");

      try {
        const storedProduct =
          await browserProductRepository.findById(
            productId,
          );

        if (!active) {
          return;
        }

        const productImages =
          storedProduct?.product.images ?? [];

        setImages(productImages);
        setActiveIndex(0);

        setStatus(
          productImages.length > 0
            ? "ready"
            : "error",
        );
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    }

    loadImages();

    return () => {
      active = false;
    };
  }, [productId]);

  const activeImage = useMemo(
    () => images[activeIndex],
    [activeIndex, images],
  );

  function showPrevious() {
    setActiveIndex((current) =>
      current <= 0
        ? images.length - 1
        : current - 1,
    );
  }

  function showNext() {
    setActiveIndex((current) =>
      current >= images.length - 1
        ? 0
        : current + 1,
    );
  }

  if (status === "loading") {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[2rem] border border-zinc-200 bg-white text-zinc-400">
        <LoaderCircle
          aria-hidden="true"
          className="h-7 w-7 animate-spin"
        />
      </div>
    );
  }

  if (
    status === "error" ||
    !activeImage
  ) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white text-zinc-400">
        <ImageOff
          aria-hidden="true"
          className="h-8 w-8"
        />

        <p className="text-sm font-medium">
          Product gallery unavailable
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
        {/* Product gallery media may come from the local browser repository. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage.src}
          alt={activeImage.alt || productTitle}
          className="h-full w-full object-contain p-5 sm:p-8"
        />

        {images.length > 1 && (
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

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() =>
                setActiveIndex(index)
              }
              aria-label={`Show ${productTitle} image ${index + 1}`}
              className={`aspect-square overflow-hidden rounded-2xl border bg-white p-2 transition ${
                index === activeIndex
                  ? "border-zinc-950 ring-1 ring-zinc-950"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {/* Product gallery media may come from the local browser repository. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt=""
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
