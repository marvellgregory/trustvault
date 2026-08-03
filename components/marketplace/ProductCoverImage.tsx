"use client";

/* eslint-disable @next/next/no-img-element */

import { ImageIcon, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { ProductId } from "@/lib/marketplace/product-types";
import {
  browserProductImageRepository,
  createProductImageObjectUrl,
  revokeProductImageObjectUrl,
} from "@/lib/marketplace/repository/product-image-repository";

type ProductCoverImageProps = {
  productId: ProductId;
  alt: string;
  className?: string;
};

type ImageStatus =
  | "loading"
  | "ready"
  | "missing"
  | "error";

export function ProductCoverImage({
  productId,
  alt,
  className = "",
}: ProductCoverImageProps) {
  const [status, setStatus] =
    useState<ImageStatus>("loading");

  const [imageUrl, setImageUrl] =
    useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    async function loadCoverImage() {
      setStatus("loading");
      setImageUrl(null);

      try {
        const image =
          await browserProductImageRepository.findCoverByProductId(
            productId,
          );

        if (!isMounted) {
          return;
        }

        if (!image) {
          setStatus("missing");
          return;
        }

        objectUrl = createProductImageObjectUrl(image);

        setImageUrl(objectUrl);
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    loadCoverImage();

    return () => {
      isMounted = false;

      if (objectUrl) {
        revokeProductImageObjectUrl(objectUrl);
      }
    };
  }, [productId]);

  if (status === "ready" && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-zinc-100 ${className}`}
    >
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-600 shadow-sm">
          {status === "loading" ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-6 w-6 animate-spin"
            />
          ) : (
            <ImageIcon
              aria-hidden="true"
              className="h-6 w-6"
            />
          )}
        </span>

        <p className="mt-3 text-xs font-medium text-zinc-500">
          {status === "loading"
            ? "Loading image…"
            : "Image unavailable"}
        </p>
      </div>
    </div>
  );
}
