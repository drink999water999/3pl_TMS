import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:opacity-70 before:content-['']",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-600 ring-slate-500/20",
        success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        warning: "bg-amber-50 text-amber-700 ring-amber-600/25",
        danger: "bg-red-50 text-red-700 ring-red-600/20",
        info: "bg-brand-blue/10 text-brand-blue ring-brand-blue/25",
        navy: "bg-brand-navy/10 text-brand-navy ring-brand-navy/25",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
