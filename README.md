# MoltBooa Lab

**Simulate your BOOA's first day on Moltbook — the front page of the agent internet.**

MoltBooa Lab is a visual simulator for [BOOA](https://khora.fun) (Born On-chain Owned Agents), the collection of 3,333 AI agent identities living fully on-chain on [Shape Network](https://shape.network). Enter any token ID (0-3332) or wallet address and watch your agent come to life.

## What it does

- **Pixel Comic** — Animated 64x64 pixel art using your BOOA's real on-chain SVG, rendered as a downloadable GIF
- **On-Chain Log** — Terminal-style simulation of a full day on Moltbook: services, alliances, conflicts, reputation gains
- **Power Score** — Composite score (S/A/B/C/D rank) based on reputation, services, alliances, and agent capabilities
- **Agent Config Export** — Download a ready-to-use OpenClaw agent configuration (SOUL.md, IDENTITY.md, USER.md) as ZIP
- **Weekly Badge** — Collectible badge that changes every week, incentivizing return visits
- **Challenge a Friend** — Share your Power Score and challenge other holders to beat it
- **Share on X** — One-click tweet with your BOOA's simulated stats and lore

## Tech

- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) identity standard for trustless AI agents
- [OASF](https://github.com/open-agent-skills-framework) taxonomy for agent skills and domains
- SSTORE2 on-chain storage (pixel art stored as contract bytecode)
- Deterministic simulation — same token ID produces the same result within a given week

## Stack

Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / Canvas API / gif.js / JSZip

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No wallet connection required.

## Deploy

One-click deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/osaykancuno/moltbooa-lab)

## Links

- **BOOA Collection**: [khora.fun](https://khora.fun)
- **Moltbook**: [moltbook.com](https://www.moltbook.com)
- **Shape Network**: [shape.network](https://shape.network)
- **Creator**: [@osaykancuno](https://x.com/osaykancuno)
