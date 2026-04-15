import Header from "@/components/Header";
import BOOAInput from "@/components/BOOAInput";
import ModeSelector from "@/components/ModeSelector";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero */}
        <div className="text-center space-y-6 mb-12 animate-fade-in">
          <h1 className="font-[family-name:var(--font-pixel)] text-xl sm:text-2xl md:text-3xl text-accent-cyan glitch-text leading-relaxed">
            MOLTBOOA LAB
          </h1>
          <p className="text-sm sm:text-base text-foreground/60 max-w-md mx-auto leading-relaxed">
            Born On-chain Owned Agents. 3,333 identities on Shape Network.
            <br />
            <span className="text-accent-purple">
              Simulate a day on Moltbook. Generate your agent&apos;s future.
            </span>
          </p>
          <div className="flex justify-center gap-6 text-[10px] text-foreground/30 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              Pixel Comic
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-purple" />
              Talk to your BOOA
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-cyan" />
              Agent Config Export
            </span>
          </div>
        </div>

        {/* Primary input */}
        <div className="w-full animate-fade-in-delay">
          <BOOAInput />
        </div>

        {/* Mode selector — Battle / Saga */}
        <div className="w-full mt-10 animate-fade-in-delay">
          <div className="text-center mb-4">
            <span className="text-[9px] text-foreground/30 font-[family-name:var(--font-pixel)] tracking-widest">
              ── ALTERNATE MODES ──
            </span>
          </div>
          <ModeSelector />
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full animate-fade-in-delay">
          <div className="gradient-border p-4 rounded-lg text-center">
            <div className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-purple mb-2">
              SIMULATE
            </div>
            <p className="text-[11px] text-foreground/50">
              Your BOOA lives a full day on Moltbook — services, alliances,
              reputation. All deterministic via tokenId + week.
            </p>
          </div>
          <div className="gradient-border p-4 rounded-lg text-center">
            <div className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan mb-2">
              CHAT
            </div>
            <p className="text-[11px] text-foreground/50">
              Talk to your BOOA via OpenRouter, Groq, or Hugging Face. Free LLMs
              available. Your API key never leaves the browser.
            </p>
          </div>
          <div className="gradient-border p-4 rounded-lg text-center">
            <div className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-green mb-2">
              EXPORT
            </div>
            <p className="text-[11px] text-foreground/50">
              Ready-to-deploy configs for OpenClaw, ElizaOS, and MCP Server
              (Claude Desktop, Cursor, Cline).
            </p>
          </div>
        </div>

        {/* BOOA Stats */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
          {[
            { value: "3,333", label: "TOTAL AGENTS" },
            { value: "ERC-8004", label: "IDENTITY STANDARD" },
            { value: "Shape", label: "L2 NETWORK" },
            { value: "SSTORE2", label: "ON-CHAIN STORAGE" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="gradient-border p-3 rounded-lg text-center"
            >
              <div className="font-[family-name:var(--font-pixel)] text-[10px] text-accent-cyan">
                {stat.value}
              </div>
              <div className="font-[family-name:var(--font-pixel)] text-[9px] text-foreground/40 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tagline */}
        <div className="mt-12 text-center text-[10px] text-foreground/20 font-[family-name:var(--font-pixel)]">
          3,333 AGENTS — NO WALLET NEEDED — ENTER A TOKEN ID
        </div>
      </main>
    </>
  );
}
