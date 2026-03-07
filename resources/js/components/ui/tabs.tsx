import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-muted p-1 border border-border",
        className
      )}
      {...props}
    />
  )
}


function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "px-3 py-1.5 text-sm font-medium whitespace-nowrap",
        "rounded-lg transition-all",

        "text-muted-foreground hover:text-[#2563eb] hover:bg-[#2563eb]/10",

        "data-[state=active]:bg-[#2563eb]",
        "data-[state=active]:text-white",
        "data-[state=active]:shadow-sm",
        "data-[state=active]:border-[#2563eb] border",

        "focus-visible:ring-2 focus-visible:ring-[#2563eb]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}



function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
