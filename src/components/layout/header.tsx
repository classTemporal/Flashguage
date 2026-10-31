"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
  showNav?: boolean;
}

// Core primary navigation items for desktop top-bar
const PRIMARY_NAV = [
  { href: "/tracks", label: "Tracks", icon: "🌐" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/decks", label: "Decks", icon: "🗂️" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/dictionaries", label: "Dictionaries", icon: "📖" },
  { href: "/community", label: "Community", icon: "🌐" },
];

// Secondary tools menu inside "More" dropdown
const MORE_TOOLS = [
  { href: "/tracks", label: "Learning Tracks", description: "Switch language or start a new track", icon: "🌐" },
  { href: "/progress", label: "Learning Progress", description: "Mastery percentages & review timers", icon: "📈" },
  { href: "/context-picker", label: "Context Picker", description: "Generate cards from highlighted text", icon: "🔍" },
  { href: "/import", label: "Import Cards", description: "CSV, JSON, Anki format", icon: "📥" },
  { href: "/export", label: "Export Cards", description: "Download backup of decks", icon: "📤" },
  { href: "/plugins", label: "Plugins & Extensions", description: "Manage integrations and audio", icon: "🧩" },
];

// All links for mobile navigation drawer
const ALL_MOBILE_NAV = [
  { href: "/tracks", label: "Learning Tracks", icon: "🌐" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/decks", label: "Decks", icon: "🗂️" },
  { href: "/progress", label: "Learning Progress", icon: "📈" },
  { href: "/dictionaries", label: "Dictionaries", icon: "📖" },
  { href: "/community", label: "Community", icon: "🌐" },
  { href: "/context-picker", label: "Context Picker", icon: "🔍" },
  { href: "/import", label: "Import Cards", icon: "📥" },
  { href: "/export", label: "Export Cards", icon: "📤" },
  { href: "/plugins", label: "Plugins", icon: "🧩" },
  { href: "/profile", label: "Profile", icon: "👤" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Header({ title = "Flashguage", showNav = true }: HeaderProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [currentTrackLang, setCurrentTrackLang] = useState<string>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = router.query.lang as string;
      const stored = localStorage.getItem("flashguage_active_lang");
      if (q && q.trim()) setCurrentTrackLang(q.trim());
      else if (stored && stored.trim()) setCurrentTrackLang(stored.trim());
    }
  }, [router.query.lang]);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setMoreDropdownOpen(false);
  }, [router.asPath]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  const isRouteActive = (href: string) => {
    if (href === "/dashboard") {
      return router.pathname === "/dashboard";
    }
    return router.pathname.startsWith(href);
  };

  const isMoreActive = MORE_TOOLS.some((item) => router.pathname.startsWith(item.href));
  const logoHref = isLoggedIn ? "/dashboard" : "/";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md shadow-xs transition-colors">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-6">
            <Link
              href={logoHref}
              className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              aria-label="Flashguage Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground font-black shadow-sm group-hover:scale-105 transition-transform duration-200">
                <span className="text-xs tracking-wider">FG</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground leading-tight">
                  {title}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline -mt-0.5">
                  Multi-Language Spaced Recall
                </span>
              </div>
            </Link>

            {showNav && isLoggedIn && (
              <nav className="hidden lg:flex items-center gap-1.5 text-sm font-medium" aria-label="Main Navigation">
                {PRIMARY_NAV.map((item) => {
                  const active = isRouteActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active
                          ? "bg-primary/10 text-primary font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* More Tools Dropdown */}
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMoreDropdownOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isMoreActive
                        ? "bg-primary/10 text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                    aria-expanded={moreDropdownOpen}
                  >
                    <span>More</span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        moreDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {moreDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
                        Tools & Integrations
                      </div>
                      <div className="space-y-0.5">
                        {MORE_TOOLS.map((tool) => (
                          <Link
                            key={tool.href}
                            href={tool.href}
                            onClick={() => setMoreDropdownOpen(false)}
                            className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/80 text-foreground"
                          >
                            <span className="text-lg mt-0.5">{tool.icon}</span>
                            <div>
                              <p className="text-sm font-semibold leading-none text-foreground">{tool.label}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{tool.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            )}
          </div>

          {/* Right Controls: Theme Toggle + User Menu + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {isLoggedIn ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 rounded-full border border-border bg-background p-1 pr-2.5 text-sm font-medium text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Open user menu"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white font-bold text-xs uppercase shadow-xs">
                    {session?.user?.name ? session.user.name.charAt(0) : session?.user?.email?.charAt(0) || "U"}
                  </div>
                  <span className="text-xs font-semibold text-foreground hidden sm:inline max-w-[130px] truncate">
                    {session?.user?.name || session?.user?.email?.split("@")[0]}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card py-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2.5 border-b border-border/80">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-bold text-foreground truncate mt-0.5">
                        {session?.user?.name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session?.user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted/80 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <span>👤</span> Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted/80 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <span>⚙️</span> Settings & AI
                      </Link>
                      <Link
                        href="/plugins"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted/80 transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <span>🧩</span> Plugins
                      </Link>
                    </div>

                    <div className="border-t border-border/80 pt-1">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button href="/login" as="link" variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button href="/register" as="link" size="sm" className="shadow-xs hidden sm:inline-flex">
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Quick-Action Bar for instant access to key study & decks (only when logged in and on authenticated pages) */}
      {isLoggedIn && !["/", "/login", "/register"].includes(router.pathname) && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-3 py-1.5 shadow-lg safe-area-pb">
          <div className="mx-auto flex max-w-md items-center justify-around">
            {[
              { href: currentTrackLang ? `/dashboard?lang=${encodeURIComponent(currentTrackLang)}` : "/dashboard", baseRoute: "/dashboard", label: "Dashboard", icon: "📊" },
              { href: currentTrackLang ? `/decks?lang=${encodeURIComponent(currentTrackLang)}` : "/decks", baseRoute: "/decks", label: "Decks", icon: "🗂️" },
              { href: currentTrackLang ? `/study?lang=${encodeURIComponent(currentTrackLang)}` : "/study", baseRoute: "/study", label: "Study", icon: "🧠", isHero: true },
              { href: "/dictionaries", baseRoute: "/dictionaries", label: "Search", icon: "📖" },
              { href: "/settings", baseRoute: "/settings", label: "Settings", icon: "⚙️" },
            ].map((btn) => {
              const active = isRouteActive(btn.baseRoute);
              if (btn.isHero) {
                return (
                  <Link
                    key={btn.href}
                    href={btn.href}
                    className="flex flex-col items-center justify-center -mt-4 group"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-primary/40 group-active:scale-95 transition-transform">
                      <span className="text-xl">🧠</span>
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5">Study</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={btn.href}
                  href={btn.href}
                  className={`flex flex-col items-center justify-center p-1 rounded-lg transition-colors min-w-[50px] ${
                    active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">{btn.icon}</span>
                  <span className="text-[10px] mt-1 tracking-tight">{btn.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
