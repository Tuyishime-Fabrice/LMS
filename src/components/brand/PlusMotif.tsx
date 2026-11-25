import { useId } from "react";
import { cn } from "@/lib/utils";
import type { CourseLevel } from "./courseLevel";

/**
 * The nested DATA+ plus, the Academy's one decorative motif.
 * Hand-built from the three brand sources in assets-src/brand (traced, not embedded):
 *   trail    three nested rounded plus outlines growing to the right, two trails on the left
 *   centred  three concentric chamfered plus outlines
 *   stepped  three stepped right-half plus shapes, bright to dark, the outer one cut on the right
 * Where it may appear is listed in docs/product/DESIGN_SYSTEM.md ("Plus motif"); ask before adding a place.
 * Layers are listed inner first. On dark backgrounds the outer layer turns mint, because the
 * dark outline would disappear there. Animations run once (loop only for loading) and are off
 * under prefers-reduced-motion.
 */
export type PlusMotifVariant = "trail" | "centred" | "stepped";

type Layer = { d: string; width: number };
type Geometry = { viewBox: string; aspect: number; layers: Layer[]; trails?: string[] };

type Pt = [number, number];

/** A polyline with rounded corners (radius r), as an SVG path. */
function rounded(points: Pt[], r: number, closed = false): string {
  const pts = closed ? [...points, points[0], points[1]] : points;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const k = Math.min(r, inLen / 2, outLen / 2);
    const ax = cx - ((cx - px) / inLen) * k;
    const ay = cy - ((cy - py) / inLen) * k;
    const bx = cx + ((nx - cx) / outLen) * k;
    const by = cy + ((ny - cy) / outLen) * k;
    d += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx} ${cy} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  if (closed) return `${d} Z`;
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** A chamfered plus centred on (50, 50): half-extent R, arm half-width a, chamfer c. */
function chamferedPlus(R: number, a: number, c: number): string {
  const p: Pt[] = [
    [50 - a + c, 50 - R], [50 + a - c, 50 - R], [50 + a, 50 - R + c], [50 + a, 50 - a],
    [50 + R - c, 50 - a], [50 + R, 50 - a + c], [50 + R, 50 + a - c], [50 + R - c, 50 + a],
    [50 + a, 50 + a], [50 + a, 50 + R - c], [50 + a - c, 50 + R], [50 - a + c, 50 + R],
    [50 - a, 50 + R - c], [50 - a, 50 + a], [50 - R + c, 50 + a], [50 - R, 50 + a - c],
    [50 - R, 50 - a + c], [50 - R + c, 50 - a], [50 - a, 50 - a], [50 - a, 50 - R + c],
  ];
  return `M${p.map(([x, y]) => `${x} ${y}`).join(" L")} Z`;
}

/** Right half of a plus: top bar, vertical, right arm, vertical, bottom bar. Coordinates are stroke centres. */
function halfPlus(o: { left: number; top: number; v: number; armTop: number; right: number; armBottom: number; bottom: number; joinTop?: number; joinBottom?: number; leftBottom?: number }, r: number): string {
  const pts: Pt[] = [];
  if (o.joinTop !== undefined) pts.push([o.left, o.joinTop]);
  pts.push([o.left, o.top], [o.v, o.top], [o.v, o.armTop], [o.right, o.armTop], [o.right, o.armBottom], [o.v, o.armBottom], [o.v, o.bottom], [o.leftBottom ?? o.left, o.bottom]);
  if (o.joinBottom !== undefined) pts.push([o.left, o.joinBottom]);
  return rounded(pts, r);
}

const GEOMETRY: Record<PlusMotifVariant, Geometry> = {
  centred: {
    viewBox: "0 0 100 100",
    aspect: 1,
    layers: [
      { d: chamferedPlus(27, 9, 4), width: 2.6 },
      { d: chamferedPlus(38.5, 14, 5.5), width: 3 },
      { d: chamferedPlus(48, 21.5, 8), width: 4 },
    ],
  },
  trail: {
    viewBox: "540 0 845 896",
    aspect: 845 / 896,
    layers: [
      { d: halfPlus({ left: 727, joinTop: 407, top: 312, v: 915, armTop: 442, right: 1032, armBottom: 551, bottom: 657, joinBottom: 565 }, 22), width: 28 },
      { d: halfPlus({ left: 802, joinTop: 312, top: 197, v: 1032, armTop: 395, right: 1191, armBottom: 597, bottom: 752, joinBottom: 657 }, 28), width: 36 },
      { d: halfPlus({ left: 909, joinTop: 197, top: 30, v: 1183, armTop: 318, right: 1350, armBottom: 658, bottom: 863, joinBottom: 752 }, 36), width: 48 },
    ],
    trails: ["M727 407 L560 407", "M727 565 L560 565"],
  },
  stepped: {
    viewBox: "0 0 820 933",
    aspect: 820 / 933,
    layers: [
      { d: halfPlus({ left: 110, top: 294, v: 271, armTop: 461, right: 427, armBottom: 647, bottom: 799, leftBottom: 80 }, 30), width: 32 },
      { d: halfPlus({ left: 225, top: 165, v: 426, armTop: 420, right: 657, armBottom: 652, bottom: 908, leftBottom: 190 }, 44), width: 46 },
      { d: halfPlus({ left: 335, top: 31, v: 603, armTop: 315, right: 796, armBottom: 745, bottom: 960 }, 60), width: 62 },
    ],
  },
};

/** Layer colours, inner first. The brightest green lives only here. */
const LIGHT = ["hsl(var(--brand-500))", "hsl(var(--brand-700))", "hsl(var(--brand-800))"];
const DARK = ["hsl(var(--brand-500))", "hsl(var(--brand-700))", "hsl(var(--mint) / 0.6)"];

export type PlusMotifProps = {
  variant: PlusMotifVariant;
  /** Width in px (or any CSS length). Height follows the motif's proportions. */
  size?: number | string;
  tone?: "light" | "dark";
  /** "once": layers draw in, inner first, 120 ms apart, 900 ms each. "loop": loading indicator. */
  animate?: false | "once" | "loop";
  /** How many layers are lit, inner first (0 to 3). Unlit layers are drawn faintly. */
  layersLit?: 0 | 1 | 2 | 3;
  /** Delay before the "once" draw starts, in ms (for example, until the intro has left). */
  delay?: number;
  className?: string;
  /** Accessible name. Omit for decoration (the motif is then hidden from assistive technology). */
  label?: string;
};

export function PlusMotif({ variant, size = 120, tone = "light", animate = false, layersLit = 3, delay = 0, className, label }: PlusMotifProps) {
  const g = GEOMETRY[variant];
  const gradientId = useId().replace(/:/g, "");
  const colours = tone === "dark" ? DARK : LIGHT;
  const unlit = tone === "dark" ? "hsl(var(--mint) / 0.18)" : "hsl(var(--border))";
  const width = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      viewBox={g.viewBox}
      style={{ width, aspectRatio: String(g.aspect) }}
      className={cn("block shrink-0 overflow-hidden", animate === "loop" && "plus-loop", animate === "once" && "plus-draw", className)}
      fill="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {g.trails && (
        <defs>
          <linearGradient id={gradientId} x1="560" x2="727" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={colours[0]} stopOpacity="0" />
            <stop offset="1" stopColor={colours[0]} />
          </linearGradient>
        </defs>
      )}
      {g.trails && layersLit > 0 &&
        g.trails.map((d) => <path key={d} d={d} stroke={`url(#${gradientId})`} strokeWidth={g.layers[0].width} className="plus-layer" style={{ animationDelay: `${delay}ms` }} pathLength={1} />)}
      {g.layers.map((layer, i) => (
        <path
          key={i}
          d={layer.d}
          stroke={i < layersLit ? colours[i] : unlit}
          strokeWidth={layer.width}
          strokeLinejoin="round"
          pathLength={1}
          className="plus-layer"
          style={{ animationDelay: `${delay + i * 120}ms` }}
        />
      ))}
    </svg>
  );
}

/** Solid small plus: list marker for "you will be able to" outcomes. */
export function PlusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={cn("h-3 w-3 shrink-0 text-primary", className)} aria-hidden focusable="false">
      <path d="M4.5 0h3v4.5H12v3H7.5V12h-3V7.5H0v-3h4.5z" fill="currentColor" />
    </svg>
  );
}


const LEVEL_LIT: Record<CourseLevel, 1 | 2 | 3> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Course level as lit layers: beginner the inner one, intermediate two, advanced all three. */
export function PlusLevel({ level, label, size = 22, tone = "light", className }: { level: CourseLevel; label: string; size?: number; tone?: "light" | "dark"; className?: string }) {
  return <PlusMotif variant="centred" size={size} tone={tone} layersLit={LEVEL_LIT[level]} label={label} className={className} />;
}

/** Loading indicator: the centred plus drawing in sequence, at most 1.2 s per loop. */
export function PlusLoader({ label, size = 40, className }: { label: string; size?: number; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex flex-col items-center gap-2", className)}>
      <PlusMotif variant="centred" size={size} animate="loop" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
