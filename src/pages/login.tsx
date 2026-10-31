"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/loading";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (router.isReady && typeof router.query.email === "string" && router.query.email) {
      setEmail(router.query.email);
    }
  }, [router.isReady, router.query.email]);

  const isRegistered = router.isReady && router.query.registered === "true";

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else if (res?.ok) {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand / Logo header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg p-1"
            aria-label="Flashguage Home"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
              <span className="text-xl">FG</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome to Flashguage
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue your multi-language learning streak
          </p>
        </div>

        {/* Centered Card */}
        <Card className="border border-border bg-card text-card-foreground shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-5 touch-manipulation">
            {isRegistered && (
              <div
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400 font-medium animate-in fade-in flex items-center gap-2"
                role="status"
              >
                <span className="text-base">🎉</span>
                <span>Account created successfully! Please sign in with your credentials.</span>
              </div>
            )}

            {error && (
              <div
                className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium animate-in fade-in"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email-input"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  id="email-input"
                  type="email"
                  name="email"
                  required
                  autoFocus={!router.query.email}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="password-input"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id="password-input"
                  type="password"
                  name="password"
                  required
                  autoFocus={Boolean(router.query.email)}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 font-medium bg-primary text-primary-foreground hover:opacity-90 touch-manipulation"
              >
                {loading && (
                  <Spinner className="h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                )}
                <span>{loading ? "Signing in..." : "Sign In"}</span>
              </Button>
            </div>

            <div className="border-t border-border pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }
  return { props: {} };
};
