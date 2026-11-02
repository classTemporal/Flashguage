"use client";

import { useEffect, useCallback, useState } from "react";
import { db } from "@/lib/db";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

  return isOnline;
}

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useOnlineStatus();

  const refreshCount = useCallback(async () => {
    try {
      const count = await db.syncQueue.count();
      setPendingCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshCount();

    const handler = () => {
      void refreshCount();
    };

    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [refreshCount]);

  const enqueue = useCallback(
    async (action: "create" | "update" | "delete", entity: "card" | "review" | "deck", data: unknown) => {
      const item = {
        id: crypto.randomUUID(),
        action,
        entity,
        data,
        timestamp: Date.now(),
      };

      await db.syncQueue.add(item);
      await refreshCount();
    },
    [refreshCount]
  );

  const sync = useCallback(async () => {
    if (!isOnline || isSyncing) {
      return { synced: 0, failed: 0 };
    }

    try {
      setIsSyncing(true);

      const items = await db.syncQueue.orderBy("timestamp").toArray();
      if (items.length === 0) {
        return { synced: 0, failed: 0 };
      }

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        throw new Error(`Sync failed: ${res.status}`);
      }

      const result = (await res.json()) as { results: Array<{ id: string; success: boolean }> };

      const failed = result.results.filter((r) => !r.success).map((r) => r.id);
      if (failed.length > 0) {
        await db.syncQueue.where("id").anyOf(failed).delete();
      } else {
        await db.syncQueue.clear();
      }

      await refreshCount();

      const synced = items.length - failed.length;
      return { synced, failed: failed.length };
    } catch (error) {
      console.error("Sync error:", error);
      return { synced: 0, failed: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshCount]);

  return { pendingCount, isSyncing, isOnline, sync, enqueue, refreshCount };
}

export const useSync = useSyncQueue;
