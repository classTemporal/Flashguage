import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "./button";

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackButton({ href, label = "Back", className = "" }: BackButtonProps) {
  const router = useRouter();

  const content = (
    <>
      <svg
        className="h-4 w-4 mr-1.5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
        />
      </svg>
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Button
        variant="ghost"
        size="sm"
        as="link"
        href={href}
        className={["-ml-2 text-muted-foreground hover:text-foreground", className].join(" ")}
      >
        {content}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
      className={["-ml-2 text-muted-foreground hover:text-foreground", className].join(" ")}
    >
      {content}
    </Button>
  );
}
