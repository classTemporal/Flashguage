export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  hooks: {
    onCardCreate?: (ctx: HookContext) => void | Promise<void>;
    onCardReview?: (ctx: HookContext) => void | Promise<void>;
    onDeckCreate?: (ctx: HookContext) => void | Promise<void>;
    onStudyComplete?: (ctx: HookContext) => void | Promise<void>;
  };
}

export interface HookContext {
  card?: {
    id: string;
    front: string;
    back: string;
    tags: string;
    source: string;
    media: string | null;
  };
  deck?: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
  };
  review?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    lastReview: Date | null;
  };
  userId: string;
}

const HOOK_NAMES = [
  "onCardCreate",
  "onCardReview",
  "onDeckCreate",
  "onStudyComplete",
] as const;

type HookName = typeof HOOK_NAMES[number];

const registry = new Map<string, Plugin>();
const executionLog: Array<{ timestamp: Date; pluginId: string; hook: string; success: boolean }> = [];

export function registerPlugin(plugin: Plugin): void {
  if (registry.has(plugin.id)) {
    throw new Error(`Plugin "${plugin.id}" is already registered`);
  }
  registry.set(plugin.id, plugin);
}

export function unregisterPlugin(id: string): boolean {
  return registry.delete(id);
}

export function getActivePlugins(activeIds: string[] = []): Plugin[] {
  const set = new Set(activeIds);
  return Array.from(registry.values()).filter((p) => set.has(p.id));
}

export function getAllPlugins(): Plugin[] {
  return Array.from(registry.values());
}

export async function executeHook(hookName: HookName, ctx: HookContext): Promise<void> {
  for (const [pluginId, plugin] of registry.entries()) {
    const hook = plugin.hooks[hookName];
    if (!hook) continue;
    try {
      await hook(ctx);
      executionLog.push({ timestamp: new Date(), pluginId, hook: hookName, success: true });
    } catch (error) {
      executionLog.push({
        timestamp: new Date(),
        pluginId,
        hook: hookName,
        success: false,
      });
      console.error(`[plugin:${pluginId}] Hook "${hookName}" failed:`, error);
    }
  }
}

export function getExecutionLog(
  limit = 50,
): Array<{ timestamp: Date; pluginId: string; hook: string; success: boolean }> {
  return executionLog.slice(-limit);
}
