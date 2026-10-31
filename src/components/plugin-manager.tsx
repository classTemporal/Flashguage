"use client";

import { Plugin } from "@/lib/plugins";
import { Card } from "@/components/ui/card";

interface PluginManagerProps {
  plugins: Plugin[];
  activePlugins: Plugin[];
  activeIds: string[];
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
}

export function PluginManager({ plugins, activePlugins, activeIds, onToggle }: PluginManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Installed Plugins</h2>
          <p className="text-xs text-muted-foreground">Toggle built-in hooks and extensions</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-3 py-1">
          {activePlugins.length} of {plugins.length} active
        </span>
      </div>

      <div className="space-y-3 pt-2">
        {plugins.map((plugin) => {
          const isActive = activeIds.includes(plugin.id);
          return (
            <Card
              key={plugin.id}
              className={[
                "p-4 transition-all duration-200",
                isActive
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-border/80",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-sm truncate">
                      {plugin.name}
                    </h3>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                      v{plugin.version}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {plugin.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plugin.hooks.onCardCreate && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted border border-border/50 rounded px-2 py-0.5">
                        onCardCreate
                      </span>
                    )}
                    {plugin.hooks.onCardReview && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted border border-border/50 rounded px-2 py-0.5">
                        onCardReview
                      </span>
                    )}
                    {plugin.hooks.onDeckCreate && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted border border-border/50 rounded px-2 py-0.5">
                        onDeckCreate
                      </span>
                    )}
                    {plugin.hooks.onStudyComplete && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted border border-border/50 rounded px-2 py-0.5">
                        onStudyComplete
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                  <ToggleSwitch
                    enabled={isActive}
                    name={plugin.name}
                    onChange={async (val) => onToggle(plugin.id, val)}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {isActive ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>By: {plugin.author}</span>
                <span className="font-mono text-[10px]">ID: {plugin.id}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {plugins.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No plugins available.
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  enabled,
  name,
  onChange,
}: {
  enabled: boolean;
  name?: string;
  onChange: (v: boolean) => Promise<boolean>;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={name ? `Toggle ${name}` : "Toggle plugin"}
      onClick={() => onChange(!enabled)}
      className={[
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        enabled ? "bg-primary" : "bg-muted",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
          enabled ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}
