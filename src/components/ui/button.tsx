import { type ButtonHTMLAttributes, type ReactNode, type AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 active:opacity-100 active:brightness-95",
  secondary: "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-100 active:brightness-95",
  ghost: "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8.5 px-3 text-xs sm:text-sm rounded-xl",
  md: "h-10 px-4 py-2 text-sm rounded-xl",
  lg: "h-11 px-6 text-base rounded-xl",
};

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  as?: "button" | "link";
  href?: string;
  [key: string]: unknown;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  as = "button",
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all cursor-pointer select-none touch-manipulation",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  ].join(" ");

  if (as === "link" && href) {
    return (
      <a href={href} className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
