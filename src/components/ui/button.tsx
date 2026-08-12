import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary:
    "bg-surface text-slate-900 border border-line hover:bg-surface-muted",
  ghost: "text-slate-700 hover:bg-surface-muted",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  // `min-h-touch` = 44px : taille tactile minimale exigée par le brief (§3bis).
  md: "min-h-touch px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-w-touch items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
