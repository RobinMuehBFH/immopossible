import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors",
        "placeholder:text-foreground-muted",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-subtle",
        "aria-invalid:border-danger aria-invalid:focus:ring-danger/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
