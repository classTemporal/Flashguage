"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OfflineBannerProps {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  onSync: () => void;
}

export function OfflineBanner({ pendingCount, isOnline, isSyncing, onSync }: OfflineBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  if (!isOnline) {
    return (
      <aside aria-label="Offline notice" className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 transition-colors">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
            <span>You&apos;re offline. Changes will be saved locally and synced when you reconnect.</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-amber-800 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
            aria-label="Dismiss offline banner"
          >
            <span className="text-base leading-none">×</span>
          </button>
        </div>
      </aside>
    );
  }

  if (pendingCount > 0) {
    return (
      <aside aria-label="Sync notice" className="border-b border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200 transition-colors">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            <span>
              {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending sync.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSync} disabled={isSyncing} size="sm" variant="primary">
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-md p-1 text-indigo-800 hover:bg-indigo-200/50 dark:text-indigo-200 dark:hover:bg-indigo-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              aria-label="Dismiss sync banner"
            >
              <span className="text-base leading-none">×</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}
