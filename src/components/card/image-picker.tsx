"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  wordContext?: string;
  searchQuery?: string;
  definitionContext?: string;
  initialCandidates?: string[];
}

export function ImagePicker({
  value,
  onChange,
  wordContext,
  searchQuery,
  definitionContext,
  initialCandidates = [],
}: ImagePickerProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imgSizeKb, setImgSizeKb] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<string[]>(initialCandidates);
  const [customSearchText, setCustomSearchText] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchPage, setSearchPage] = useState(0);

  const activeWord = wordContext || searchQuery;

  // Sync initial candidates if updated from parent
  useEffect(() => {
    if (initialCandidates && initialCandidates.length > 0) {
      setCandidates(initialCandidates.slice(0, 3));
    }
  }, [initialCandidates]);

  // Client-side image compression via Canvas
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast("Original image is too large (max 8 MB)", "error");
      return;
    }

    setIsCompressing(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 600;
          let { width, height } = img;

          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            height = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            showToast("Failed to process image", "error");
            setIsCompressing(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          const sizeInKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

          setImgSizeKb(sizeInKb);
          onChange(compressedDataUrl);
          showToast(`Image optimized and loaded (${sizeInKb} KB)`, "success");
          setIsCompressing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Compression error:", err);
      showToast("Error compressing image", "error");
      setIsCompressing(false);
    }
  };

  // Search image with pagination offset support
  const executeSearch = async (overrideQuery?: string, pageNumber?: number) => {
    const query = overrideQuery?.trim() || customSearchText.trim() || activeWord?.trim();
    if (!query) {
      showToast("Please enter a term to search for images", "error");
      return;
    }

    const targetPage = typeof pageNumber === "number" ? pageNumber : searchPage;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/image-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          definition: overrideQuery ? undefined : definitionContext?.trim() || undefined,
          page: targetPage,
        }),
      });
      const data = await res.json();

      const foundCandidates: string[] = Array.isArray(data.candidates) && data.candidates.length > 0
        ? data.candidates.slice(0, 3)
        : data.imageUrl ? [data.imageUrl] : [];

      if (foundCandidates.length > 0) {
        setCandidates(foundCandidates);
        onChange(foundCandidates[0]);
        setImgSizeKb(null);
        showToast(
          targetPage > 0
            ? `Loaded 3 new alternative options! (Set ${targetPage + 1})`
            : `Found ${foundCandidates.length} matching image option(s)!`,
          "success"
        );
        setShowSearchBox(false);
      } else {
        // If we reached the end of results on a higher page, loop back to page 0
        if (targetPage > 0) {
          setSearchPage(0);
          showToast("Looping back to first batch of images", "info");
          executeSearch(overrideQuery, 0);
          return;
        }
        showToast("No images found for this term", "error");
      }
    } catch {
      showToast("Error searching image", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextBatch = () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    executeSearch(undefined, nextPage);
  };

  const handleCustomSearchSubmit = () => {
    setSearchPage(0);
    executeSearch(customSearchText, 0);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>🖼️</span> Illustrative Image
        </label>
        <div className="flex items-center gap-2">
          {imgSizeKb !== null && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Optimized: {imgSizeKb} KB
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowSearchBox((s) => !s)}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            <span>🔍</span>
            <span>{showSearchBox ? "Cancel" : "Custom Search"}</span>
          </button>
        </div>
      </div>

      {/* Custom Search Query Input Bar */}
      {showSearchBox && (
        <div className="flex gap-1.5 animate-in fade-in duration-150">
          <input
            type="text"
            autoFocus
            value={customSearchText}
            onChange={(e) => setCustomSearchText(e.target.value)}
            placeholder={`Search visual e.g. "poker cards", "${activeWord || "subject"}"...`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCustomSearchSubmit();
              }
            }}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
          <button
            type="button"
            onClick={handleCustomSearchSubmit}
            disabled={isSearching || !customSearchText.trim()}
            className="rounded-xl bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      )}

      {/* Main Selected Preview */}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-card group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-44 object-cover"
            onError={() => showToast("Failed to load image preview", "error")}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setImgSizeKb(null);
              }}
              className="rounded-xl bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90 shadow-md"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted shadow-md"
            >
              Upload Other
            </button>
            <button
              type="button"
              onClick={handleNextBatch}
              disabled={isSearching}
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 shadow-md"
            >
              {isSearching ? "Searching..." : "🔄 Next 3 Options"}
            </button>
          </div>
        </div>
      ) : null}

      {/* 3 Candidate Options Selector */}
      {candidates.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px] flex items-center gap-1">
              <span>🎯</span> Choose best image ({candidates.length} options):
            </span>
            <button
              type="button"
              onClick={handleNextBatch}
              disabled={isSearching}
              className="text-primary hover:underline text-[11px] font-bold flex items-center gap-1"
            >
              <span>{isSearching ? "Searching..." : "🔄 More Images"}</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {candidates.map((cand, idx) => {
              const isSelected = value === cand;
              return (
                <button
                  key={`${cand}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(cand);
                    setImgSizeKb(null);
                  }}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 shadow-sm"
                      : "border-border/80 hover:border-primary/60 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img
                    src={cand}
                    alt={`Option ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow">
                      ✓
                    </div>
                  )}
                  <div className={`absolute bottom-0 inset-x-0 text-[10px] font-bold text-center py-0.5 transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"
                  }`}>
                    Option {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons if no image or to add alternatives */}
      {!value && candidates.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => executeSearch()}
            disabled={isSearching}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary py-2.5 px-3 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <span>✨</span>
            <span>{isSearching ? "Searching..." : "Search 3 Options with AI"}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-muted py-2.5 px-3 text-xs font-bold text-foreground transition-colors disabled:opacity-50"
          >
            <span>📁</span>
            <span>{isCompressing ? "Compressing..." : "Upload from device"}</span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Direct URL input fallback */}
      {!value && (
        <div className="pt-1">
          <input
            type="url"
            placeholder="Or paste an image URL directly..."
            value={value.startsWith("data:") ? "" : value}
            onChange={(e) => {
              onChange(e.target.value);
              setImgSizeKb(null);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}
    </div>
  );
}
