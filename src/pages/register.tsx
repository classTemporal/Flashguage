"use client";

import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/loading";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanConfirmEmail = confirmEmail.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail.includes("@") || cleanEmail.length < 5) {
      setError("Please provide a valid email address");
      return;
    }

    if (cleanEmail !== cleanConfirmEmail) {
      setError("Email addresses do not match");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || "Something went wrong creating your account");
        setLoading(false);
      } else {
        setSuccessMessage("Account created successfully! Signing you in...");

        // Automatically log the user in
        const signResult = await signIn("credentials", {
          email: cleanEmail,
          password,
          redirect: false,
        });

        if (signResult?.ok) {
          window.location.href = "/dashboard";
        } else {
          // Fallback: redirect to login with registered flag and prefilled email
          router.push(`/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
        }
      }
    } catch {
      setError("Something went wrong. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand / Logo header */}
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg p-1"
            aria-label="Flashguage Home"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
              <span className="text-xl">FG</span>
            </div>
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Create your Flashguage Account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Master multiple languages with smart spaced repetition and AI
          </p>
        </div>

        {/* Centered Card */}
        <Card className="border border-border bg-card text-card-foreground shadow-lg rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="touch-manipulation">
            <div className="p-6 sm:p-8 space-y-5">
              {error && (
                <div
                  className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium animate-in fade-in"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400 font-medium animate-in fade-in flex items-center gap-2"
                  role="status"
                >
                  <span className="text-base">🎉</span>
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  disabled={loading}
                />

                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                />

                <Input
                  label="Confirm email address"
                  type="email"
                  name="confirmEmail"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Repeat your email address"
                  disabled={loading}
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                />

                <Input
                  label="Confirm password"
                  type="password"
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  disabled={loading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 font-bold py-3 text-base shadow-xs touch-manipulation"
                >
                  {loading && <Spinner className="h-4 w-4 border-2 border-primary-foreground border-t-transparent" />}
                  <span>{loading ? "Creating account..." : "Create Account"}</span>
                </Button>
              </div>
            </div>

            <CardFooter className="justify-center border-t border-border bg-muted/20 px-6 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
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
