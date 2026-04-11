"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-card-border bg-card-bg/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center font-[family-name:var(--font-pixel)] text-[7px] text-accent-purple group-hover:bg-accent-purple/30 transition-colors">
            MB
          </div>
          <span className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan tracking-wider">
            MOLTBOOA LAB
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-xs text-foreground/50">
          <a
            href="https://khora.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-cyan transition-colors"
          >
            Kh&ocirc;ra
          </a>
          <a
            href="https://www.moltbook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-green transition-colors"
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
