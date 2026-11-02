"use client";

import { useState } from "react";

interface CardImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function CardImage({
  src,
  alt,
  className = "",
}: CardImageProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/10 via-primary/10 to-teal-500/10 text-center p-6 ${className}`}
        aria-label={alt}
      >
        <span className="text-4xl mb-2">💡</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual Reference</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden flex items-center justify-center bg-neutral-950/50 ${className}`}>
      {/* Ambient background blur using the same image */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 pointer-events-none select-none"
      />
      {/* Foreground sharp uncropped image */}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className="relative max-h-full max-w-full object-contain z-10 drop-shadow-md select-none transition-transform duration-300"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
