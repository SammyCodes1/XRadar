"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "../lib/wagmi";
import { DashboardProvider } from "./dashboard-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [config] = useState(() => getWagmiConfig());
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DashboardProvider>{children}</DashboardProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
