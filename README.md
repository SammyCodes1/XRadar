# XRadar

Token risk screener for **X Layer** (OKX EVM L2). Paste a name, symbol, or address, or let auto-discovery pick up new DEX listings. Twelve read-only checks publish a score to **RiskRegistry**. Anyone can read that number on-chain. This is a screener, not an audit.

Live: [https://xradar-phi.vercel.app](https://xradar-phi.vercel.app)

```
XRadar/
  contracts/   Foundry + OpenZeppelin (RiskRegistry)
  services/    Detection, risk checks, synthesis, oracle publisher
  frontend/    Next.js scanner, feed, compare, watchlist
  shared/      Shared TypeScript types and deployed addresses
```

## Networks

| Network | Chain ID | RPC | Native | Explorer |
| --- | ---: | --- | --- | --- |
| X Layer Mainnet | `196` (`0xc4`) | `https://rpc.xlayer.tech` | OKB (18) | [oklink.com/x-layer](https://www.oklink.com/x-layer) |
| X Layer Testnet | `1952` (`0x7a0`) | `https://testrpc.xlayer.tech/terigon` | OKB (18) | [oklink.com/x-layer-testnet](https://www.oklink.com/x-layer-testnet) |

| Network | RiskRegistry | Oracle |
| --- | --- | --- |
| Testnet | `0x6A85d6C8609B52d8B5eb0a9FC5F5174a4BaeeCf3` | `0x71642aA8c7Ce88Ed823a1DE91646eDe035Ff6Ea6` |
| Mainnet | `0x4720a706Fb1688559f7966ed50D161B275D8D87b` | `0xEB6654d156a0e098825989050Cac69b959579b25` |

Config lives in `shared/src/networks.ts` and `shared/deployedAddresses.json`.

## What it does

- Twelve checks: source, owner, honeypot, LP lock, pool size, holders, deployer, proxy, trading limits, owner vs deployer, pair tax, buy-then-sell
- Higher score = more risk (low &lt; 34, medium &lt; 67, high ≥ 67)
- Missing data is labeled Unknown, not Fail
- Scores publish with `publishScore` and are read back from RiskRegistry
- Auto-discovery watches Uniswap/QuickSwap factory events
- Compare, watchlist (device list + shareable link), and a report card

## Prerequisites

- Node.js 20+
- npm 10+ (workspaces)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) for contracts
- An X Layer wallet with a little OKB to publish scores

## First-time setup

```powershell
cd C:\Users\USER\XRadar
copy .env.example .env
copy .env.example frontend\.env.local
copy contracts\.env.example contracts\.env

npm install
```

Fill secrets in `.env` and `frontend/.env.local`. Never commit those files.

## Run locally

```powershell
npm run dev:frontend
```

Opens [http://localhost:3000](http://localhost:3000). The scanner POSTs `/api/scan` (in-process `scanAndPublish`). The feed reads RiskRegistry every 30s.

```powershell
npm run dev:services
```

Local functions: [http://localhost:8787](http://localhost:8787)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Process health |
| GET/POST | `/detection` | Discover new listings and publish |
| GET/POST | `/risk-checks` | Health for the check service |
| GET/POST | `/ai-synthesis` | Health for DeepSeek synthesis |
| GET/POST | `/oracle-publisher` | Health for the publisher |

```powershell
cd services
npm run scan:testnet -- --lookback 200
npm run risk:check -- --token 0xe538905cf8410324e03A5A23C1c177a474D59b2b --chain mainnet
npm run pipeline:testnet
npm run pipeline:testnet -- --force 0xYourToken
```

`reportURI` is a `data:application/json,...` URI. After `publishScore`, X alerts fire when `score >= 70` or honeypot is set, if OAuth 1.0a tokens are present (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`).

```powershell
cd services
npm run x:announce -- --token 0xD44Dec3B0617Fb707D4101814a51a6741469cebe --score 81 --flags honeypot --dry-run
```

```powershell
npm run build:contracts
npm run test:contracts
```

## Deploy

Vercel project root is the repo. `vercel.json` runs the Next.js frontend and a **daily** cron at `GET /api/discover` (Hobby cannot run crons more than once a day). Opening `/scan` also triggers discovery.

Required Vercel env:

- `ORACLE_WALLET_PRIVATE_KEY_MAINNET` / `ORACLE_WALLET_PRIVATE_KEY_TESTNET`
- `ORACLE_CONTRACT_ADDRESS_MAINNET` / `ORACLE_CONTRACT_ADDRESS_TESTNET`
- `DEEPSEEK_API_KEY` (optional; falls back to a local summary)
- `EXPLORER_API_KEY` (optional; verification still works when set)
- `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_API_PASSPHRASE`, `OKX_PROJECT_ID` (optional DEX quotes and name search)
- `CRON_SECRET` (optional; locks `/api/discover` to Vercel cron)
- `X_*` OAuth tokens to post high-risk alerts

Contract deploy (testnet):

```powershell
cd contracts
forge script script/DeployRiskRegistry.s.sol:DeployRiskRegistry `
  --rpc-url https://testrpc.xlayer.tech/terigon `
  --broadcast `
  --legacy
```

The script writes `shared/deployedAddresses.json`.

## Workspace scripts

| Script | What it does |
| --- | --- |
| `npm run dev:frontend` | Next.js dev server |
| `npm run dev:services` | Functions on :8787 |
| `npm run build` | Typecheck/build shared + frontend + services |
| `npm run build:contracts` | `forge build` |
| `npm run test:contracts` | `forge test` |
| `npm run test:services` | Node tests for scoring and alerts |

## Intentional limits

- Screener, not an audit
- Holder concentration is an on-chain sample, not a full census
- Watchlist is per device unless you copy the list link
- X alerts stay silent until OAuth tokens are set
