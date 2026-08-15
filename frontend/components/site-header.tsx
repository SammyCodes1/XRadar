"use client";

import { Scan } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { XLayerNetwork } from "@xradar/shared";
import { useDashboard } from "./dashboard-provider";
import { ThemeToggle } from "./theme-toggle";
import { WalletConnect } from "./wallet-connect";

function NetworkBadge({ network }: { network: XLayerNetwork }) {
  const mainnet = network === "mainnet";
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium ring-1 ${
        mainnet
          ? "bg-risk-low/15 text-risk-low ring-risk-low/35"
          : "bg-raised text-ink-muted ring-line"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          mainnet ? "bg-risk-low" : "bg-ink-faint"
        }`}
      />
      {mainnet ? "Mainnet" : "Testnet"}
    </span>
  );
}

function NetworkSwitch({
  network,
  setNetwork,
}: {
  network: XLayerNetwork;
  setNetwork: (network: XLayerNetwork) => void;
}) {
  return (
    <div
      className="flex h-8 rounded-md bg-inset p-0.5 ring-1 ring-line"
      role="group"
      aria-label="Registry network"
    >
      <button
        type="button"
        onClick={() => setNetwork("testnet")}
        className={`rounded px-2.5 text-[11px] transition-colors ${
          network === "testnet"
            ? "bg-raised text-ink"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        <span className="sm:hidden">Test</span>
        <span className="hidden sm:inline">Testnet</span>
      </button>
      <button
        type="button"
        onClick={() => setNetwork("mainnet")}
        className={`rounded px-2.5 text-[11px] transition-colors ${
          network === "mainnet"
            ? "bg-raised text-ink"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        <span className="sm:hidden">Main</span>
        <span className="hidden sm:inline">Mainnet</span>
      </button>
    </div>
  );
}

function Brand({ onScanner }: { onScanner: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="XRadar home">
        <span className="flex size-8 items-center justify-center rounded-md bg-raised ring-1 ring-line">
          <Scan className="size-4 text-accent" weight="bold" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-ink">XRadar</span>
      </Link>
      <nav className="hidden items-center gap-2 text-sm sm:flex" aria-label="Product">
        <span className="text-ink-faint">/</span>
        <Link
          href="/scan"
          className={`transition-colors hover:text-ink ${
            onScanner ? "text-ink" : "text-ink-muted"
          }`}
          aria-current={onScanner ? "page" : undefined}
        >
          Scanner
        </Link>
      </nav>
    </div>
  );
}

export function SiteHeader() {
  const { network, setNetwork } = useDashboard();
  const pathname = usePathname();
  const onScanner = pathname === "/scan" || pathname.startsWith("/token/");

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-void/72 backdrop-blur-md">
      <div className="page-col">
        <div className="flex h-16 items-center justify-between gap-3 sm:hidden">
          <Brand onScanner={onScanner} />
          <div className="flex items-center gap-2">
            <NetworkBadge network={network} />
            <NetworkSwitch network={network} setNetwork={setNetwork} />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex justify-end pb-3 sm:hidden">
          <WalletConnect />
        </div>

        <div className="hidden h-16 items-center justify-between gap-4 sm:flex">
          <Brand onScanner={onScanner} />
          <div className="flex items-center justify-end gap-2">
            <NetworkBadge network={network} />
            <NetworkSwitch network={network} setNetwork={setNetwork} />
            <ThemeToggle />
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}
