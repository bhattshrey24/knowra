import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A navigation link styled as a button. Unlike `<Button render={<Link/>}>`, this
 * renders a real anchor, so it keeps link semantics (role="link", correct for
 * anything that navigates) and emits no Base UI native-button warning. Use it
 * for buttons that are really links; use `Button` for actual actions.
 */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
