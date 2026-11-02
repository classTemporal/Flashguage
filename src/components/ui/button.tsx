import { type ButtonHTMLAttributes, type ReactNode, type AnchorHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-sm shadow-primary/20",
  secondary: "border border-border bg-card hover:bg-muted text-foreground active:bg-muted/80 shadow-xs",
  outline: "border border-border bg-transparent hover:bg-muted text-foreground active:bg-muted/80",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95 shadow-xs",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-xl",
  md: "h-10 px-4 py-2 text-sm rounded-xl",
  lg: "h-11 px-6 py-2.5 text-base rounded-xl",
  icon: "h-10 w-10 p-0 rounded-xl shrink-0",
  "icon-sm": "h-8 w-8 p-0 rounded-xl shrink-0",
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
