"use client";

import { useState, useEffect, useCallback } from "react";
import { Plugin, executeHook, getActivePlugins, getAllPlugins, registerPlugin, unregisterPlugin } from "@/lib/plugins";

const STORAGE_KEY = "english-flashcards:active-plugins";

let registered = new Set<string>();

export function usePlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [activePlugins, setActivePlugins] = useState<Plugin[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        registered = new Set(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }

    const all = getAllPlugins();
    const active = getActivePlugins(Array.from(registered));
    setPlugins(all);
    setActivePlugins(active);
    setActiveIds(Array.from(registered));
  }, []);

  const togglePlugin = useCallback(async (id: string, enabled: boolean): Promise<boolean> => {
    try {
      if (enabled) {
        if (!registered.has(id)) {
          registered.add(id);
        }
      } else {
        registered.delete(id);
      }
      const ids = Array.from(registered);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      const active = getActivePlugins(ids);
      setActiveIds(ids);
      setActivePlugins(active);
      return true;
    } catch (error) {
      console.error("Failed to toggle plugin:", error);
      return false;
    }
  }, []);

  return { plugins, activePlugins, activeIds, togglePlugin, executeHook };
}
