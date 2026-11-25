import { cn } from "@/lib/utils";

/**
 * Responsive photo or screenshot from public/images/home: AVIF and WebP at 480, 960 and 1600 px
 * (generated from assets-src/; see docs/product/LANDING_REDESIGN.md). Width and height are set
 * so nothing shifts while loading; below-the-fold images load lazily.
 */
export function Photo({ name, alt, width, height, sizes, priority = false, widths = [480, 960, 1600], className, imgClassName }: {
  name: string;
  alt: string;
  /** Intrinsic proportions, used for the width and height attributes. */
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  widths?: number[];
  className?: string;
  imgClassName?: string;
}) {
  const set = (ext: string) => widths.map((w) => `/images/home/${name}-${w}.${ext} ${w}w`).join(", ");
  const fallback = `/images/home/${name}-${widths[Math.min(1, widths.length - 1)]}.webp`;
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // React 18 does not know fetchPriority yet; pass it as a plain attribute.
        {...{ fetchpriority: priority ? "high" : "auto" }}
        className={cn("block h-full w-full object-cover", imgClassName)}
      />
    </picture>
  );
}
