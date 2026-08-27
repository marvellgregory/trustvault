import Image from "next/image";

import type { AtlasVisualState } from "@/lib/atlas/atlas-visual-state";

type AtlasMascotProps = Readonly<{
  state?: AtlasVisualState;
  size?: "launcher" | "panel";
  decorative?: boolean;
}>;

export function AtlasMascot({
  state = "idle",
  size = "launcher",
  decorative = true,
}: AtlasMascotProps) {
  const dimension = size === "panel" ? 76 : 88;

  return (
    <span
      className="atlas-mascot relative isolate block shrink-0"
      data-state={state}
      data-size={size}
    >
      <span
        aria-hidden="true"
        className="atlas-mascot-glow absolute inset-[15%] -z-10 rounded-full bg-[var(--tv-brand)]/20 blur-xl"
      />
      <Image
        src="/images/branding/mascot/atlas-guardian.webp"
        width={dimension}
        height={dimension}
        sizes={size === "panel" ? "76px" : "88px"}
        alt={decorative ? "" : "Atlas, the TrustVault guardian"}
        className="atlas-mascot-image h-full w-full object-contain object-bottom drop-shadow-[0_14px_18px_rgba(24,24,27,0.22)]"
      />
    </span>
  );
}
