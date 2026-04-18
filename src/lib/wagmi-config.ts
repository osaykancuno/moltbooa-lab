import { createConfig, http } from "wagmi";
import { shape } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Minimal wagmi config. No RainbowKit, no WalletConnect relay — just the
// injected connector. It talks to window.ethereum directly, so whatever
// wallet extension the user has (MetaMask, Rabby, Leather, Coinbase…)
// pops up immediately. Zero intermediate modal, zero dead SDK init, no
// dependency on external wallet registries.
export const wagmiConfig = createConfig({
  chains: [shape],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [shape.id]: http("https://mainnet.shape.network"),
  },
  ssr: true,
});
