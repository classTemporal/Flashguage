"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePlugins } from "@/hooks/use-plugins";
import { PluginManager } from "@/components/plugin-manager";
import { getExecutionLog } from "@/lib/plugins";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/loading";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";

export default function PluginsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { plugins, activePlugins, activeIds, togglePlugin } = usePlugins();
  const [log, setLog] = useState<ReturnType<typeof getExecutionLog>>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    setLog(getExecutionLog(50));
  }, [plugins, activePlugins]);

  if (status === "loading") {
    return <LoadingPage message="Loading plugin manager..." />;
  }

  const failedLogs = useMemo(() => log.filter((l) => !l.success), [log]);

  const handleToggle = async (id: string, enabled: boolean) => {
    const success = await togglePlugin(id, enabled);
    if (success) {
      showToast(
        `Plugin ${enabled ? "enabled" : "disabled"} successfully`,
        "info"
      );
    }
    return success;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 md:pb-6">
      <Header title="Plugins & Extensions" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="mb-2">
          <BackButton href="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Plugins & Integrations
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Extend and customize study behaviors, hooks, and external dictionary features.
            </p>
          </div>
        </div>

        {/* Plugin Cards with Toggle Switches */}
        <Card className="p-6">
          <PluginManager
            plugins={plugins}
            activePlugins={activePlugins}
            activeIds={activeIds}
            onToggle={handleToggle}
          />
        </Card>

        {/* Execution Log Viewer */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Plugin Execution Log
              </h2>
              <p className="text-xs text-muted-foreground">
                Live monitoring of hook events and plugin execution lifecycle
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowLog(!showLog)}
            >
              {showLog ? "Hide Logs" : "View Logs"}
            </Button>
          </div>

          {showLog && (
            <div className="space-y-2 pt-2 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground border-b border-border">
                <span>Recent Hook Triggers ({log.length})</span>
                <button
                  type="button"
                  onClick={() => setLog(getExecutionLog(50))}
                  className="hover:text-foreground underline focus-visible:outline-none"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto font-mono text-xs pr-1">
                {log.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                    No plugin hooks executed in this session yet. Try creating or studying flashcards.
                  </div>
                ) : (
                  log.slice().reverse().map((entry, i) => (
                    <div
                      key={i}
                      className={[
                        "flex items-center justify-between gap-3 rounded-md px-3 py-2 border transition-colors",
                        entry.success
                          ? "bg-card border-border text-foreground hover:bg-accent/40"
                          : "bg-destructive/10 border-destructive/30 text-destructive-foreground",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className={[
                            "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                            entry.success ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-destructive/20 text-destructive",
                          ].join(" ")}
                        >
                          {entry.success ? "✓" : "!"}
                        </span>
                        <span className="font-semibold truncate">{entry.pluginId}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-muted-foreground text-[11px] truncate">{entry.hook}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {failedLogs.length > 0 && (
            <p className="mt-3 text-xs text-destructive-foreground font-medium">
              ⚠ {failedLogs.length} failed hook{failedLogs.length > 1 ? "s" : ""} detected in log.
            </p>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};

