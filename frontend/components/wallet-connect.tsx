"use client";

import { SignOut, Wallet } from "@phosphor-icons/react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { xLayer, xLayerTestnet } from "../lib/chains";
import { shortenAddress } from "../lib/format";
import { useDashboard } from "./dashboard-provider";

function connectorKind(name: string, id: string): "okx" | "metamask" | "other" {
  const hay = `${name} ${id}`.toLowerCase();
  if (hay.includes("okx")) return "okx";
  if (hay.includes("metamask") || hay.includes("meta mask")) return "metamask";
  return "other";
}

export function WalletConnect() {
  const { address, isConnected, status, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { chainId: dashChainId } = useDashboard();

  const okx = connectors.find((c) => connectorKind(c.name, c.id) === "okx");
  const metamask = connectors.find(
    (c) => connectorKind(c.name, c.id) === "metamask",
  );

  const onDashChain = chainId === dashChainId;
  const chainLabel =
    chainId === xLayer.id
      ? "Mainnet"
      : chainId === xLayerTestnet.id
        ? "Testnet"
        : chainId
          ? `Chain ${chainId}`
          : "Unknown";

  if (isConnected && address) {
    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        <span className="font-mono text-xs text-ink-muted sm:text-sm">
          {shortenAddress(address)}
        </span>
        <span
          className={`inline-flex h-8 items-center rounded-md px-2 text-[11px] ring-1 ring-inset ${
            onDashChain
              ? "bg-raised text-ink-muted ring-line"
              : "bg-accent/10 text-accent ring-accent/30"
          }`}
        >
          {chainLabel}
        </span>
        {!onDashChain ? (
          <button
            type="button"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: dashChainId })}
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-2.5 text-xs font-medium text-on-accent transition-transform hover:bg-accent-hot active:scale-[0.98] disabled:opacity-50 sm:min-h-8"
          >
            Switch
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => disconnect()}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-2.5 text-xs text-ink-muted ring-1 ring-line transition-colors hover:bg-raised hover:text-ink sm:min-h-8"
        >
          <SignOut className="size-3.5" weight="regular" />
          Disconnect
        </button>
      </div>
    );
  }

  const connecting = isPending || status === "connecting";

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end">
        <button
          type="button"
          disabled={!metamask || connecting}
          onClick={() => metamask && connect({ connector: metamask })}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-on-accent transition-transform hover:bg-accent-hot active:scale-[0.98] disabled:opacity-50 sm:min-h-8 sm:px-3"
        >
          <Wallet className="size-3.5" weight="bold" />
          <span className="sm:hidden">{connecting ? "..." : "MetaMask"}</span>
          <span className="hidden sm:inline">{connecting ? "Connecting" : "MetaMask"}</span>
        </button>
        <button
          type="button"
          disabled={!okx || connecting}
          onClick={() => okx && connect({ connector: okx })}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink ring-1 ring-line transition-colors hover:bg-raised active:scale-[0.98] disabled:opacity-50 sm:min-h-8 sm:px-3"
        >
          {connecting ? "Connecting" : (
            <>
              <span className="sm:hidden">OKX</span>
              <span className="hidden sm:inline">OKX Wallet</span>
            </>
          )}
        </button>
      </div>
      {error ? (
        <p className="max-w-[16rem] text-right text-[11px] text-risk-high">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
