import * as React from "react"
import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const linkVariants = cva("transition-colors", {
  variants: {
    variant: {
      // A link inline with body text — underlines on hover so it reads as a link.
      default: "text-slate-900 hover:text-indigo-600 hover:underline",
      // A chrome-level link (nav items, "back to" links) — communicates
      // interactivity via color shift alone, no underline.
      nav: "text-slate-500 hover:text-slate-900",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export interface LinkProps
  extends RouterLinkProps,
    VariantProps<typeof linkVariants> {}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, ...props }, ref) => (
    <RouterLink className={cn(linkVariants({ variant, className }))} ref={ref} {...props} />
  )
)
Link.displayName = "Link"

export { Link, linkVariants }
