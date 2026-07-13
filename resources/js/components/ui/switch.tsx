import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Layout
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",

        // Border & Shadow (agar selalu terlihat)
        "border border-gray-300 dark:border-gray-600 shadow-sm",

        // Color
        "bg-gray-200 data-[state=checked]:bg-blue-500",

        // Animation
        "transition-all duration-200",

        // Focus
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/30 focus-visible:ring-offset-2",

        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",

        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block h-5 w-5 rounded-full",
          "bg-white border border-gray-200",
          "shadow-md",

          "transition-transform duration-200",

          "data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };