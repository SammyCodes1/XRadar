# XRadar frontend

Next.js App Router dashboard with Tailwind, viem, and wagmi. Custom chains: X Layer mainnet (`196`) and testnet (`1952`).

The marketing landing lives at `/`. The scanner dashboard is at `/scan` and reads `RiskRegistry` on-chain (`getAllScannedTokens` + `getLatestScore`) and can trigger an on-demand `scanAndPublish` run through `POST /api/scan` (the route execs the services orchestrator with `--skip-detection`).

```powershell
cd ..
npm install
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000). Connect MetaMask or OKX Wallet. Set `NEXT_PUBLIC_RISK_REGISTRY_TESTNET` (defaults to the deployed testnet registry) and keep `ORACLE_WALLET_PRIVATE_KEY` in the repo-root `.env` so `/api/scan` can publish.

Full setup and deploy notes are in the repo-root README.
