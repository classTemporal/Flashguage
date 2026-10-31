import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingPage } from "@/components/ui/loading";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";

interface UserProfileData {
  name?: string;
  email?: string;
}

const fetcher = async (url: string): Promise<UserProfileData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load user profile");
  }
  return res.json();
};

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const {
    data: apiSettings,
    error: apiError,
    isLoading,
    mutate,
  } = useSWR<UserProfileData>("/api/settings", fetcher);

  // Profile Form state
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (apiSettings) {
      if (apiSettings.name !== undefined) {
        setName(apiSettings.name);
      } else if (session?.user?.name) {
        setName(session.user.name);
      }
    } else if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [apiSettings, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }

      const updated = await res.json();
      await mutate(updated, false);
      if (updateSession) {
        await updateSession();
      }
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update profile. Please try again.",
        "error"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update password");
      }

      showToast("Password updated successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setPasswordError(msg);
      showToast(msg, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <LoadingPage message="Loading profile..." />;
  }

  const currentUserEmail = apiSettings?.email || session?.user?.email || "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header title="Profile" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <div className="mb-2">
          <BackButton href="/dashboard" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              User Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your personal information, email, and password security.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-sm font-medium text-primary hover:underline"
            >
              App Settings →
            </Link>
          </div>
        </div>

        {apiError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            Failed to load profile details. Refresh the page to retry.
          </div>
        )}

        {/* Profile Info Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">👤</span>
            <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Your identity across the application and on flashcard stats.
          </p>

          <form onSubmit={handleUpdateProfile} className="border-t border-border pt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email Address
                </label>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                  {currentUserEmail}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your email address is your primary login credential.
                </p>
              </div>

              <div>
                <Input
                  label="Display Name"
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  hint="Visible on your profile and study statistics."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={savingProfile}
                className="w-full sm:w-auto"
              >
                {savingProfile ? "Saving Profile..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Change Password Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">🔒</span>
            <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Ensure your account is using a secure, unique password.
          </p>

          <form onSubmit={handleChangePassword} className="border-t border-border pt-4 space-y-4">
            {passwordError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {passwordError}
              </div>
            )}

            <div>
              <Input
                label="Current Password"
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <Input
                label="New Password"
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                hint="Must be at least 6 characters."
              />
            </div>

            <div>
              <Input
                label="Confirm New Password"
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={changingPassword}
                className="w-full sm:w-auto"
              >
                {changingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </form>
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
