import Image, { type ImageProps } from "next/image";
import type { ReactNode } from "react";

/**
 * A real screenshot of the console in a quiet frame with a soft bronze glow.
 * `children` is positioned over the image (used for a floating chart card).
 * Keep the Google and Cesium attribution inside captured 3D views visible.
 */
export function ProductShot({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  children,
  className = "",
}: {
  src: ImageProps["src"];
  alt: string;
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute -inset-6 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(205_127_50/0.22),transparent_65%)]"
        aria-hidden
      />
      <div className="overflow-hidden border border-border bg-surface shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]">
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} className="block h-auto w-full" />
      </div>
      {children}
    </div>
  );
}
