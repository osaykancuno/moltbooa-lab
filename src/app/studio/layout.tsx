import type { ReactNode } from "react";
import StudioProviders from "@/components/studio/Providers";

export const metadata = {
  title: "MoltBooa Studio — activate your BOOA",
  description:
    "Connect your wallet, register your BOOA on ERC-8004, deploy an endpoint, and go live.",
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioProviders>{children}</StudioProviders>;
}
