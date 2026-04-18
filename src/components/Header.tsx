"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const inStudio = pathname?.startsWith("/studio") || pathname?.startsWith("/agent");

  return (
    <header className="border-b border-card-border bg-card-bg/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-8 h-8 rounded bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center font-[family-name:var(--font-pixel)] text-[7px] text-accent-purple group-hover:bg-accent-purple/30 transition-colors">
            MB
          </div>
          <span className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan tracking-wider hidden sm:inline">
            MOLTBOOA
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`text-[10px] px-3 py-1.5 rounded font-[family-name:var(--font-pixel)] transition-colors ${
              !inStudio
                ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
                : "text-foreground/50 hover:text-foreground/80"
            }`}
          >
            LAB
          </Link>
          <Link
            href="/studio"
            className={`text-[10px] px-3 py-1.5 rounded font-[family-name:var(--font-pixel)] transition-colors ${
              inStudio
                ? "bg-accent-purple/20 text-accent-purple border border-accent-purple/40"
                : "text-foreground/50 hover:text-foreground/80"
            }`}
          >
            STUDIO
          </Link>
        </nav>

        <nav className="flex items-center gap-3 text-[10px] text-foreground/40">
          <a
            href="https://khora.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-cyan transition-colors hidden md:inline"
          >
            Kh&ocirc;ra
          </a>
          <a
            href="https://www.moltbook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-green transition-colors hidden md:inline"
          >
            Moltbook
          </a>
          <a
            href="https://x.com/osaykancuno"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-purple transition-colors"
          >
            @osaykancuno
          </a>
        </nav>
      </div>
    </header>
  );
}
