# XRadar

AI-powered token risk screener for **X Layer** (OKX EVM L2).

This repository is a working monorepo scaffold. Detection heuristics, AI reports, and on-chain oracle publication are not implemented yet.

```
XRadar/
  contracts/   Foundry + OpenZeppelin
  services/    Node.js functions (local HTTP + serverless-shaped handlers)
  frontend/    Next.js App Router (TypeScript, Tailwind, viem, wagmi)
  shared/      Shared TypeScript types
```

## Networks

| Network | Chain ID | RPC | Native | Explorer |
| --- | ---: | --- | --- | --- |
| X Layer Mainnet | `196` (`0xc4`) | `https://rpc.xlayer.tech` | OKB (18) | [okx.com/web3/explorer/xlayer](https://www.okx.com/web3/explorer/xlayer) |
| X Layer Testnet | `1952` (`0x7a0`) | `https://testrpc.xlayer.tech/terigon` | OKB (18) | [okx.com/web3/explorer/xlayer-test](https://www.okx.com/web3/explorer/xlayer-test) |

Testnet chain ID was verified live with `eth_chainId` against `https://testrpc.xlayer.tech/terigon` (result `0x7a0` = **1952**). Mainnet `eth_chainId` against `https://rpc.xlayer.tech` is `0xc4` = **196**. Canonical config lives in `shared/src/networks.ts` and `shared/deployedAddresses.json`.

| Network | RiskRegistry | Oracle |
| --- | --- | --- |
| Testnet | `0x6A85d6C8609B52d8B5eb0a9FC5F5174a4BaeeCf3` | `0x71642aA8c7Ce88Ed823a1DE91646eDe035Ff6Ea6` |
| Mainnet | `0x4720a706Fb1688559f7966ed50D161B275D8D87b` | `0xEB6654d156a0e098825989050Cac69b959579b25` |

## Prerequisites

- Node.js 20+
- npm 10+ (this repo uses npm workspaces)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- Git
- An X Layer wallet with a little OKB (testnet faucet linked above)

## First-time setup

```powershell
cd C:\Users\USER\XRadar
copy .env.example .env
copy .env.example frontend\.env.local
copy contracts\.env.example contracts\.env

npm install
```

Fill in secrets in `.env` and `frontend/.env.local`. Never commit those files.

## Run locally

### Shared types

```powershell
npm run build:shared
# or: npm run typecheck -w shared
```

Frontend and services import `@xradar/shared` directly from TypeScript source via the workspace package.

### Frontend (Next.js)

```powershell
npm run dev:frontend
```

Opens at [http://localhost:3000](http://localhost:3000). The dashboard header connects MetaMask or OKX Wallet, the search bar POSTs `/api/scan` (runs `scanAndPublish` for one address), and the feed reads `RiskRegistry` on-chain every 30s.

### Services (detection, risk checks, AI synthesis, oracle publisher)

```powershell
npm run dev:services
```

Local server: [http://localhost:8787](http://localhost:8787)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Process health |
| GET/POST | `/detection` | Token discovery / scan enqueue |
| GET/POST | `/risk-checks` | Contract / liquidity / holder flags |
| GET/POST | `/ai-synthesis` | DeepSeek report synthesis |
| GET/POST | `/oracle-publisher` | Publish score on-chain |

GET returns a health payload. POST `/detection` is still a stub. The token scanner is a standalone module you run locally:

```powershell
cd services
npm run scan:testnet -- --lookback 200
# optional: --from 38300000 --to 38300100 --reset --no-persist
```

Cursor state lives in `services/.data/detection-<network>.json` (file KV). Move that to Vercel KV / Redis / Postgres before wiring Vercel Cron — the serverless filesystem is ephemeral.

Read-only risk checks:

```powershell
cd services
npm run risk:check -- --token 0xe538905cf8410324e03A5A23C1c177a474D59b2b --chain mainnet
```

Full detect → check → synthesize → publish:

```powershell
cd services
npm run pipeline:testnet
npm run pipeline:testnet -- --force 0xYourToken
```

`reportURI` is a `data:application/json,...` URI of the RiskReport (move to IPFS later). After a successful `publishScore`, the orchestrator may post to the project X account when `score >= 70` or the honeypot flag is set. Dedup is one tweet per token (`services/.data/x-alerts-<network>.json`). Posting needs OAuth 1.0a user tokens (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`). A bearer token cannot create posts.

```powershell
cd services
npm run x:announce -- --token 0xD44Dec3B0617Fb707D4101814a51a6741469cebe --score 81 --flags honeypot --dry-run
```

Vercel Cron hits `/api/cron/scan-and-publish`. Hobby plans only allow a daily cron; `*/2 * * * *` needs Pro. Set `ORACLE_WALLET_PRIVATE_KEY` and `ORACLE_CONTRACT_ADDRESS` on the Vercel project for the cron to publish.

```powershell
curl http://localhost:8787/health
curl http://localhost:8787/detection
```

### Contracts (Foundry)

```powershell
cd contracts
forge build
forge test
```

From the repo root:

```powershell
npm run build:contracts
npm run test:contracts
```

Anvil (optional local EVM):

```powershell
anvil
```

## Deploy

### Smart contracts (X Layer testnet first)

```powershell
cd contracts
# PRIVATE_KEY and ORACLE_WALLET must be set in contracts/.env
forge script script/DeployRiskRegistry.s.sol:DeployRiskRegistry `
  --rpc-url https://testrpc.xlayer.tech/terigon `
  --broadcast `
  --legacy

# Verify on OKLink (Etherscan-compatible plugin for XLAYER_TESTNET)
forge verify-contract <DEPLOYED_ADDRESS> src/RiskRegistry.sol:RiskRegistry `
  --verifier oklink `
  --verifier-url https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET `
  --constructor-args (cast abi-encode "constructor(address)" <ADMIN_ADDRESS>) `
  --watch
```

The script writes `shared/deployedAddresses.json` keyed by network name.

Mainnet (only after testnet verification):

```powershell
forge script script/Deploy.s.sol:DeployScript `
  --rpc-url xlayer `
  --broadcast `
  --verify
```

After deploy, put the contract address in the root `.env` as `ORACLE_CONTRACT_ADDRESS`.

### Frontend (Vercel)

```powershell
cd frontend
npx vercel
```

Set the `NEXT_PUBLIC_*` variables from `.env.example` in the Vercel project. Point `NEXT_PUBLIC_SERVICES_URL` at the deployed functions.

Or use the Vercel dashboard: import this repo and set the **Root Directory** to `frontend`.

### Services (Vercel serverless or any Node host)

The handlers under `services/src/functions/` are framework-agnostic. For a long-running process:

```powershell
cd services
npm start
```

Deploy the same process to Railway, Render, Fly.io, or a VPS. For Vercel, add four functions that re-export the handlers (not wired yet — scaffold only) or run the HTTP server as a single Node service.

Required production secrets:

- `XLAYER_MAINNET_RPC_URL` / `XLAYER_TESTNET_RPC_URL`
- `ORACLE_WALLET_PRIVATE_KEY`
- `DEEPSEEK_API_KEY` (DeepSeek, default model `deepseek-v4-pro`)
- `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` (user-context; required to post)
- `FRONTEND_URL` (public dashboard origin used in alert links)
- `EXPLORER_API_KEY`
- `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_API_PASSPHRASE`, `OKX_PROJECT_ID` (optional; OKX Wallet DEX quotes)

## Workspace scripts

| Script | What it does |
| --- | --- |
| `npm run dev:frontend` | Next.js dev server |
| `npm run dev:services` | Functions on :8787 |
| `npm run build` | Typecheck/build shared + frontend + services |
| `npm run build:contracts` | `forge build` |
| `npm run test:contracts` | `forge test` |

## What is intentionally missing

- Token detection / mempool watchers
- Risk heuristics and explorer/X API calls
- DeepSeek prompt + report generation
- On-chain score publication
- Production auth, rate limits, and monitoring

Those land after this scaffold is confirmed to build and run.
