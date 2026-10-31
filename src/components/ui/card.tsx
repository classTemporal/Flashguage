import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className = "", as: Component = "div" }: CardProps) {
  return (
    <Component
      className={[
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-colors",
        className,
      ].join(" ")}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return <div className={["p-5 pb-3", className].join(" ")}>{children}</div>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={["p-5 pt-0", className].join(" ")}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div className={["flex items-center justify-between border-t border-border p-5 pt-4", className].join(" ")}>
      {children}
    </div>
  );
}
