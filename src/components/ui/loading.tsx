import { type ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent",
        className,
      ].join(" ")}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1" aria-label="Loading">
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={["animate-pulse rounded-md bg-muted", className].join(" ")}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3" aria-hidden="true">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2" aria-hidden="true">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function DeckCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3" aria-hidden="true">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2" aria-hidden="true">
      <div className="flex gap-4 border-b border-border pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-2" aria-hidden="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Spinner />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-card-foreground transition-colors",
        className,
      ].join(" ")}
    >
      {icon && <div className="text-4xl">{icon}</div>}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
