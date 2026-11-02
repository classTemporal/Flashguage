import React, { useEffect, useState } from "react";
import { fetchSentencePhonetics, PhoneticWord } from "@/lib/phonetics";

interface PhoneticSentenceProps {
  text: string;
  lang?: string;
  isRevealed: boolean;
  words?: PhoneticWord[] | null;
  className?: string;
  wordClassName?: string;
  ipaClassName?: string;
}

export function PhoneticSentence({
  text,
  lang = "en",
  isRevealed,
  words: propWords,
  className = "",
  wordClassName = "",
  ipaClassName = "",
}: PhoneticSentenceProps) {
  const [internalWords, setInternalWords] = useState<PhoneticWord[] | null>(propWords || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (propWords) {
      setInternalWords(propWords);
      return;
    }

    if (isRevealed && text) {
      let cancelled = false;
      setIsLoading(true);

      fetchSentencePhonetics(text, lang)
        .then((result) => {
          if (!cancelled && result && result.length > 0) {
            setInternalWords(result);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [isRevealed, text, lang, propWords]);

  // If not revealed yet, display the regular natural sentence text
  if (!isRevealed) {
    return <p className={className}>{text}</p>;
  }

  // If revealed and we have phonetic words, render interlinear layout
  if (internalWords && internalWords.length > 0) {
    return (
      <div className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-2 animate-in fade-in duration-200 ${className}`}>
        {internalWords.map((item, idx) => (
          <span key={idx} className="inline-flex flex-col items-center leading-tight">
            <span className={wordClassName || "text-foreground font-medium"}>
              {item.word}
            </span>
            {item.ipa ? (
              <span className={ipaClassName || "text-[11px] font-mono text-primary/85 font-semibold select-none pt-0.5 tracking-tight"}>
                /{item.ipa}/
              </span>
            ) : (
              <span className="text-[11px] font-mono text-transparent select-none pt-0.5">&nbsp;</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  // If loading phonetics, display natural text with a gentle loading indicator
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="font-medium">{text}</p>
      {isLoading && (
        <p className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1 font-mono">
          <span>✨</span>
          <span>Generating pronunciation guide...</span>
        </p>
      )}
    </div>
  );
}
