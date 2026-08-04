"use client";

import {
  ImageOff,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  browserProductRepository,
} from "@/lib/marketplace/repository/product-repository";

type ProductCoverImageProps = {
  productId: string;
  alt: string;
  className?: string;
};

type ImageStatus =
  | "loading"
  | "ready"
  | "error";

export function ProductCoverImage({
  productId,
  alt,
  className = "",
}: ProductCoverImageProps) {
  const [status, setStatus] =
    useState<ImageStatus>("loading");

  const [src, setSrc] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCover() {
      setStatus("loading");

      try {
        const storedProduct =
          await browserProductRepository.findById(
            productId,
          );

        const cover =
          storedProduct?.product.coverImage ??
          storedProduct?.product.images.find(
            (image) =>
              image.role === "cover",
          ) ??
          storedProduct?.product.images[0];

        if (!active) {
          return;
        }

        if (!cover?.src) {
          setStatus("error");
          return;
        }

        setSrc(cover.src);
        setStatus("ready");
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    }

    loadCover();

    return () => {
      active = false;
    };
  }, [productId]);

  if (status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400">
        <LoaderCircle
          aria-hidden="true"
          className="h-5 w-5 animate-spin"
        />
      </div>
    );
  }

  if (
    status === "error" ||
    !src
  ) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100 px-4 text-center text-zinc-400">
        <ImageOff
          aria-hidden="true"
          className="h-6 w-6"
        />

        <span className="text-xs">
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() =>
        setStatus("error")
      }
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
