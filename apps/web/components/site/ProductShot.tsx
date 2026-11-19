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

/**
 * A phone screenshot in a dark bezel. The screenshot already includes the
 * status bar and Dynamic Island, so the frame only adds the rounded body.
 */
export function PhoneFrame({ src, alt, className = "" }: { src: ImageProps["src"]; alt: string; className?: string }) {
  return (
    <div
      className={`rounded-[15%/7%] border-[3px] border-[#2a2420] bg-black p-[3px] shadow-[0_28px_70px_-8px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.08)] ${className}`}
    >
      <Image src={src} alt={alt} width={600} height={1305} sizes="(min-width: 768px) 14vw, 26vw" className="block h-auto w-full rounded-[13%/6%]" />
    </div>
  );
}
