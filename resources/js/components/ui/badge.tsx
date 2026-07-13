import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1",
    "rounded-md border",
    "px-2.5 py-1",
    "text-xs font-semibold",
    "whitespace-nowrap",
    "transition-colors",
    "select-none",
    "shadow-sm",
    "[&>svg]:h-3.5 [&>svg]:w-3.5",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-blue-600 bg-blue-600 text-white",

        secondary:
          "border-slate-300 bg-slate-100 text-slate-700",

        success:
          "border-emerald-600 bg-emerald-600 text-white",

        warning:
          "border-amber-500 bg-amber-500 text-white",

        destructive:
          "border-red-600 bg-red-600 text-white",

        outline:
          "border-slate-300 bg-white text-slate-700",

        purple:
          "border-violet-600 bg-violet-600 text-white",

        teal:
          "border-teal-600 bg-teal-600 text-white",

        gray:
          "border-gray-500 bg-gray-500 text-white",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };