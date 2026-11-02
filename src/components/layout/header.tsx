"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, getLanguage } from "@/lib/languages";
import { DailyGoalDialog } from "@/components/study/daily-goal-dialog";

const statsFetcher = (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null));

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
  { href: "/dictionaries", label: "Dictionaries", description: "Search definitions & pronunciations", icon: "📖" },
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
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [currentTrackLang, setCurrentTrackLang] = useState<string>("en");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [deviceTz, setDeviceTz] = useState<string>("");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setDeviceTz(tz);
    } catch {}
  }, []);

  const { data: stats } = useSWR<{
    dailyGoal?: { current: number; goal: number; percentage: number };
  }>(
    isLoggedIn
      ? `/api/stats?lang=${encodeURIComponent(currentTrackLang)}${deviceTz ? `&tz=${encodeURIComponent(deviceTz)}` : ""}`
      : null,
    statsFetcher,
    { revalidateOnFocus: true }
  );

  const isDailyGoalAchieved = Boolean(
    stats?.dailyGoal && stats.dailyGoal.goal > 0 && stats.dailyGoal.current >= stats.dailyGoal.goal
  );

  // Fetch all user decks to detect which language tracks have been initiated with decks
  const { data: userDecks } = useSWR<Array<{ id: string; targetLanguage?: string }>>(
    isLoggedIn ? "/api/decks" : null,
    statsFetcher,
    { revalidateOnFocus: false }
  );

  // Active language tracks: strictly only tracks where the user has created or imported decks
  const { activeTrackList, activeCount } = useMemo(() => {
    const deckCountMap = new Map<string, number>();
    if (Array.isArray(userDecks)) {
      userDecks.forEach((d) => {
        const lang = d.targetLanguage || "en";
        deckCountMap.set(lang, (deckCountMap.get(lang) || 0) + 1);
      });
    }

    const activeList = SUPPORTED_LANGUAGES.filter(
      (l) => (deckCountMap.get(l.code) || 0) > 0
    ).map((l) => ({
      ...l,
      deckCount: deckCountMap.get(l.code) || 0,
    }));

    return {
      activeTrackList: activeList,
      activeCount: activeList.length,
    };
  }, [userDecks]);

  const isCurrentLangActive = activeTrackList.some((t) => t.code === currentTrackLang);

  useEffect(() => {
    const handleOpen = () => setGoalModalOpen(true);
    window.addEventListener("open-daily-goal-modal", handleOpen);
    return () => window.removeEventListener("open-daily-goal-modal", handleOpen);
  }, []);

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
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
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
    setLangDropdownOpen(false);
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

  const handleSelectLanguage = (code: string) => {
    setLangDropdownOpen(false);
    setCurrentTrackLang(code);
    try {
      localStorage.setItem("flashguage_active_lang", code);
      document.cookie = `flashguage_active_lang=${code}; path=/; max-age=31536000`;
      window.dispatchEvent(new Event("storage"));
    } catch {}
    router.push(
      { pathname: router.pathname, query: { ...router.query, lang: code } },
      undefined,
      { shallow: false }
    );
  };

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
  const logoHref = isLoggedIn ? (currentTrackLang ? `/dashboard?lang=${encodeURIComponent(currentTrackLang)}` : "/dashboard") : "/";
  const currentLang = getLanguage(currentTrackLang);

  const desktopNavItems = [
    { href: `/dashboard?lang=${encodeURIComponent(currentTrackLang)}`, baseRoute: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: `/decks?lang=${encodeURIComponent(currentTrackLang)}`, baseRoute: "/decks", label: "Decks", icon: "🗂️" },
    {
      href: isDailyGoalAchieved
        ? `/study/all?lang=${encodeURIComponent(currentTrackLang)}&mode=all`
        : `/study?lang=${encodeURIComponent(currentTrackLang)}`,
      baseRoute: "/study",
      label: isDailyGoalAchieved ? "Practice" : "Study",
      icon: isDailyGoalAchieved ? "🎯" : "🧠",
      onClick: isDailyGoalAchieved
        ? (e: React.MouseEvent) => {
            e.preventDefault();
            setGoalModalOpen(true);
          }
        : undefined,
    },
    { href: `/progress?lang=${encodeURIComponent(currentTrackLang)}`, baseRoute: "/progress", label: "Progress", icon: "📈" },
    { href: `/dictionaries?lang=${encodeURIComponent(currentTrackLang)}`, baseRoute: "/dictionaries", label: "Dictionary", icon: "📖" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md shadow-xs transition-colors">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link
              href={logoHref}
              className="group flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 shrink-0"
              aria-label="Flashguage Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground font-black shadow-sm group-hover:scale-105 transition-transform duration-200">
                <span className="text-xs tracking-wider">FG</span>
              </div>
              <span className="text-base font-bold tracking-tight text-foreground leading-tight">
                {title}
              </span>
            </Link>

            {showNav && isLoggedIn && (
              <nav className="hidden md:flex items-center gap-1 text-xs lg:text-sm font-medium shrink-0" aria-label="Main Navigation">
                {desktopNavItems.map((item) => {
                  const active = isRouteActive(item.baseRoute);
                  const isSecondary = item.baseRoute === "/progress" || item.baseRoute === "/dictionaries";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={item.onClick}
                      className={`items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        isSecondary ? "hidden 2xl:inline-flex" : "inline-flex"
                      } ${
                        active
                          ? "bg-primary/10 text-primary font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="text-xs lg:text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* More Tools Dropdown */}
                <div className="relative" ref={moreDropdownRef}>
                  <Button
                    variant={isMoreActive ? "primary" : "ghost"}
                    size="sm"
                    type="button"
                    onClick={() => setMoreDropdownOpen((prev) => !prev)}
                    className="gap-1 font-semibold text-xs lg:text-sm h-8 px-2.5 rounded-xl"
                    aria-expanded={moreDropdownOpen}
                    aria-label="More navigation items"
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
                  </Button>

                  {moreDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
                        Tools & Integrations
                      </div>
                      <div className="space-y-0.5">
                        {MORE_TOOLS.map((tool) => (
                          <Link
                            key={tool.href}
                            href={`${tool.href}?lang=${encodeURIComponent(currentTrackLang)}`}
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

          {/* Right Controls: Language Switcher (Desktop) + Theme Toggle + User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Switcher: Active Tracks only */}
            {isLoggedIn && (
              <div className="relative" ref={langDropdownRef}>
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setLangDropdownOpen((prev) => !prev)}
                  className="gap-1.5 px-3 text-xs sm:text-sm font-bold shadow-xs shrink-0"
                  aria-expanded={langDropdownOpen}
                  aria-label={`Active track: ${currentLang.name} (${activeCount} active)`}
                >
                  <span className="text-base shrink-0 leading-none">{currentLang.flag}</span>
                  <span className="font-bold">{currentLang.name}</span>
                  <svg
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                      langDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1.5 flex items-center justify-between">
                      <span>Active Tracks ({activeCount || 1})</span>
                      <Link
                        href="/tracks"
                        onClick={() => setLangDropdownOpen(false)}
                        className="text-primary hover:underline font-semibold text-[10px]"
                      >
                        All Tracks →
                      </Link>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {activeTrackList.length > 0 ? (
                        activeTrackList.map((track) => (
                          <button
                            key={track.code}
                            type="button"
                            onClick={() => handleSelectLanguage(track.code)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              currentTrackLang === track.code
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-foreground hover:bg-muted/80"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-base">{track.flag}</span>
                              <span className="truncate">{track.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                  currentTrackLang === track.code
                                    ? "bg-white/20 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {track.deckCount} {track.deckCount === 1 ? "deck" : "decks"}
                              </span>
                              {currentTrackLang === track.code && <span className="text-xs">✓</span>}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-2.5 text-center text-xs text-muted-foreground">
                          No active tracks yet.
                        </div>
                      )}

                      {/* If user is currently on an uninitiated track (0 decks) */}
                      {!isCurrentLangActive && (
                        <div className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                              <span className="text-base">{currentLang.flag}</span>
                              <span className="truncate">{currentLang.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              Inactive (0 decks)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer: Start New Track */}
                    <div className="pt-2 mt-1.5 border-t border-border/60">
                      <Link
                        href="/tracks"
                        onClick={() => setLangDropdownOpen(false)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors border border-primary/20 bg-primary/5"
                      >
                        <span>➕</span>
                        <span>Start New Track ({SUPPORTED_LANGUAGES.length - activeCount} available)</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ThemeToggle />

            {isLoggedIn ? (
              <div className="relative" ref={userDropdownRef}>
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="gap-1.5 px-2 shadow-xs shrink-0"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Open user menu"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-white font-bold text-xs uppercase shadow-xs shrink-0">
                    {session?.user?.name ? session.user.name.charAt(0) : session?.user?.email?.charAt(0) || "U"}
                  </div>
                  <svg
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>

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

      {/* Mobile Bottom Quick-Action Bar for instant access to key study & decks (only when logged in on small mobile screens) */}
      {isLoggedIn && !["/", "/login", "/register"].includes(router.pathname) && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-3 py-1.5 shadow-lg safe-area-pb">
          <div className="mx-auto flex max-w-md items-center justify-around">
            {[
              { href: currentTrackLang ? `/dashboard?lang=${encodeURIComponent(currentTrackLang)}` : "/dashboard", baseRoute: "/dashboard", label: "Dashboard", icon: "📊" },
              { href: currentTrackLang ? `/decks?lang=${encodeURIComponent(currentTrackLang)}` : "/decks", baseRoute: "/decks", label: "Decks", icon: "🗂️" },
              {
                href: isDailyGoalAchieved
                  ? `/study/all?lang=${encodeURIComponent(currentTrackLang)}&mode=all`
                  : (currentTrackLang ? `/study?lang=${encodeURIComponent(currentTrackLang)}` : "/study"),
                baseRoute: "/study",
                label: isDailyGoalAchieved ? "Practice" : "Study",
                icon: isDailyGoalAchieved ? "🎯" : "🧠",
                isHero: true,
                onClick: isDailyGoalAchieved
                  ? (e: React.MouseEvent) => {
                      e.preventDefault();
                      setGoalModalOpen(true);
                    }
                  : undefined,
              },
              { href: currentTrackLang ? `/dictionaries?lang=${encodeURIComponent(currentTrackLang)}` : "/dictionaries", baseRoute: "/dictionaries", label: "Search", icon: "📖" },
              { href: "/settings", baseRoute: "/settings", label: "Settings", icon: "⚙️" },
            ].map((btn) => {
              const active = isRouteActive(btn.baseRoute);
              if (btn.isHero) {
                return (
                  <Link
                    key={btn.href}
                    href={btn.href}
                    onClick={btn.onClick}
                    className="flex flex-col items-center justify-center -mt-4 group"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg group-active:scale-95 transition-all ${
                        isDailyGoalAchieved
                          ? "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/40 ring-2 ring-emerald-400/30"
                          : "bg-gradient-to-tr from-primary to-indigo-600 shadow-primary/40"
                      }`}
                    >
                      <span className="text-xl">{btn.icon}</span>
                    </div>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isDailyGoalAchieved
                          ? "font-extrabold text-emerald-600 dark:text-emerald-400"
                          : "font-bold text-foreground"
                      }`}
                    >
                      {btn.label}
                    </span>
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

      {/* Daily Goal Achieved / Scientific Advisory Modal */}
      <DailyGoalDialog
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        activeLanguage={currentTrackLang}
        current={stats?.dailyGoal?.current ?? 20}
        goal={stats?.dailyGoal?.goal ?? 20}
      />
    </>
  );
}
