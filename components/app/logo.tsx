import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Brand mark: gradient tile with a stylized truck + speed lines.
 * Pure SVG — crisp at any size, no image asset needed.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue via-brand-navy to-brand-ink shadow-[0_4px_14px_rgba(19,56,107,0.45)] ring-1 ring-white/20",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-[58%] w-[58%]"
      >
        {/* speed lines */}
        <path
          d="M1 8.5h4M2.5 12h2.5M1 15.5h4"
          stroke="#f08a24"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* cargo box */}
        <path
          d="M7.5 6.5h8.5a1 1 0 0 1 1 1V16H7.5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z"
          fill="white"
        />
        {/* cab */}
        <path
          d="M17 9.5h2.6a1 1 0 0 1 .78.37l1.9 2.36a1 1 0 0 1 .22.63V15a1 1 0 0 1-1 1h-4.5V9.5Z"
          fill="white"
          fillOpacity="0.85"
        />
        {/* wheels */}
        <circle cx="10" cy="17.4" r="1.7" fill="#0a1f3d" stroke="white" strokeWidth="1" />
        <circle cx="18.6" cy="17.4" r="1.7" fill="#0a1f3d" stroke="white" strokeWidth="1" />
      </svg>
    </span>
  );
}

/**
 * Full logo lockup: mark + app name (+ optional tagline).
 * `tone="light"` for dark backgrounds, `tone="dark"` for light backgrounds.
 */
export function BrandLogo({
  tone = "light",
  withTagline = false,
  markClassName,
  className,
}: {
  tone?: "light" | "dark";
  withTagline?: boolean;
  markClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={markClassName} />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-sm font-bold tracking-tight",
            tone === "light" ? "text-white" : "text-brand-navy",
          )}
        >
          {APP_NAME}
        </span>
        {withTagline ? (
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.18em]",
              tone === "light" ? "text-sky-300/80" : "text-muted-foreground",
            )}
          >
            {APP_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
