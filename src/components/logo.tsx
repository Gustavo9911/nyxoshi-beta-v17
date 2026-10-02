import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function MoonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-6", className)}>
      <defs>
        <linearGradient id="nyx-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="1" stopColor="color-mix(in srgb, currentColor 55%, #8b5cf6)" />
        </linearGradient>
      </defs>
      <path
        d="M25.8 19.1A10.8 10.8 0 0 1 12.9 6.2a10.7 10.7 0 1 0 12.9 12.9Z"
        fill="url(#nyx-gradient)"
      />
      <path d="m21.4 7.1 1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1 1-2.3Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 text-fg no-underline", className)}>
      <span className="nyx-logo-mark grid size-10 shrink-0 place-items-center rounded-2xl">
        <MoonMark className="size-7" />
      </span>
      {compact ? <span className="sr-only">Nyxoshi</span> : <span className="nyx-wordmark">Nyxoshi</span>}
    </Link>
  );
}
