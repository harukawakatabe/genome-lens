import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700 border-slate-200",
        outline: "text-slate-700 border-slate-300 bg-white",
        high: "bg-red-50 text-red-700 border-red-200",
        medium: "bg-orange-50 text-orange-700 border-orange-200",
        low: "bg-green-50 text-green-700 border-green-200",
        unknown: "bg-slate-100 text-slate-600 border-slate-200",
        primary: "bg-primary/10 text-primary border-primary/20",
        info: "bg-blue-50 text-blue-700 border-blue-200",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { badgeVariants };
