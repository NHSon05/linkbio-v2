import { cn } from "@/lib/utils";

/** The linkbio logo: a chain-link icon on a soft olive and hazel gradient. */
const BRAND_GRADIENT =
  "radial-gradient(circle at 25% 20%, #E6CA9A 0, transparent 60%), radial-gradient(circle at 80% 85%, #B9CB5C 0, transparent 55%), #DCE5AE";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      data-slot="brand-mark"
      style={{ background: BRAND_GRADIENT }}
      className={cn("grid size-[34px] flex-none place-items-center rounded-[11px] text-ink", className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-[18px]"
        aria-hidden
      >
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </svg>
    </span>
  );
}
