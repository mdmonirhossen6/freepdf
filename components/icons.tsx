/**
 * Icon barrel: the only door icons come in through.
 *
 * Kept mechanical on purpose, so the rule can be audited in one file:
 *   - One family only: Phosphor. No Lucide, no hand-drawn SVG paths.
 *   - One weight only: `light`. A hairline stroke reads as an engraved rule on
 *     paper and stays precise at 14-16px, where Phosphor's `regular` default
 *     reads as generic UI chrome. This page must not look like that.
 *   - Scale comes from the `h-*` / `w-*` classes at the call site, so an icon
 *     never invents its own size.
 *   - Imported from the SSR entry, so the glyphs are part of the statically
 *     exported HTML rather than appearing after hydration.
 * If a glyph is missing, add the Phosphor icon that fits. Do not draw one.
 */
import type { IconProps } from '@phosphor-icons/react';
import {
  ArrowLeft as PhosphorArrowLeft,
  ArrowUpRight as PhosphorArrowUpRight,
  CaretDown as PhosphorCaretDown,
  Check as PhosphorCheck,
  ClockCounterClockwise as PhosphorClockCounterClockwise,
  Copy as PhosphorCopy,
  Lightbulb as PhosphorLightbulb,
  MagnifyingGlass as PhosphorMagnifyingGlass,
  Moon as PhosphorMoon,
  Sun as PhosphorSun,
  X as PhosphorX,
} from '@phosphor-icons/react/ssr';

export const ArrowLeft = (props: IconProps) => <PhosphorArrowLeft weight="light" {...props} />;
export const ArrowUpRight = (props: IconProps) => <PhosphorArrowUpRight weight="light" {...props} />;
export const CaretDown = (props: IconProps) => <PhosphorCaretDown weight="light" {...props} />;
export const Check = (props: IconProps) => <PhosphorCheck weight="light" {...props} />;
export const ClockCounterClockwise = (props: IconProps) => (
  <PhosphorClockCounterClockwise weight="light" {...props} />
);
export const Copy = (props: IconProps) => <PhosphorCopy weight="light" {...props} />;
export const Lightbulb = (props: IconProps) => <PhosphorLightbulb weight="light" {...props} />;
export const MagnifyingGlass = (props: IconProps) => (
  <PhosphorMagnifyingGlass weight="light" {...props} />
);
export const Moon = (props: IconProps) => <PhosphorMoon weight="light" {...props} />;
export const Sun = (props: IconProps) => <PhosphorSun weight="light" {...props} />;
export const X = (props: IconProps) => <PhosphorX weight="light" {...props} />;

