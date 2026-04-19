import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { SUPPORTED_CHAINS } from "@/lib/chains";

// Minimal wagmi config. No RainbowKit, no WalletConnect relay — just the
// injected connector. It talks to window.ethereum directly, so whatever
// wallet extension the user has (MetaMask, Rabby, Leather, Coinbase…)
// pops up immediately. Zero intermediate modal, zero dead SDK init, no
// dependency on external wallet registries.
//
// Multi-chain: we register every supported chain so the Agent Terminal can
// propose actions on mainnet, arbitrum, base, etc. Shape keeps its custom
// transport (the Khôra registry + BOOA contract live there); everything
// else uses viem's public defaults — good enough for free-tier usage, and
// holders can fork the repo to plug in Alchemy/Infura URLs via env.
const transports = Object.fromEntries(
  SUPPORTED_CHAINS.map((c) => [
    c.id,
    c.id === 360 ? http("https://mainnet.shape.network") : http(),
  ])
) as Record<(typeof SUPPORTED_CHAINS)[number]["id"], ReturnType<typeof http>>;

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors: [injected({ shimDisconnect: true })],
  transports,
  ssr: true,
});
