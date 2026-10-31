import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { useOnlineStatus } from "@/hooks/use-sync";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { initBuiltInPlugins } from "@/lib/plugins/register";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import "@/styles/globals.css";

initBuiltInPlugins();

function OnlineStatusListener({ children }: { children: React.ReactNode }) {
  useOnlineStatus();
  return <>{children}</>;
}

function ServiceWorkerListener({ children }: { children: React.ReactNode }) {
  useServiceWorker();
  return <>{children}</>;
}

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <SWRConfig
        value={{
          dedupingInterval: 0,
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          revalidateIfStale: true,
        }}
      >
        <ErrorBoundary>
          <ToastProvider>
            <ServiceWorkerListener>
              <OnlineStatusListener>
                <Component {...pageProps} />
              </OnlineStatusListener>
            </ServiceWorkerListener>
          </ToastProvider>
        </ErrorBoundary>
      </SWRConfig>
    </SessionProvider>
  );
}
