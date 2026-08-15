# XRadar contracts

Foundry project targeting X Layer (mainnet 196, testnet 1952).

```powershell
forge build
forge test
forge script script/DeployRiskRegistry.s.sol:DeployRiskRegistry --rpc-url https://testrpc.xlayer.tech/terigon --broadcast --legacy
```

OpenZeppelin is installed at `lib/openzeppelin-contracts`. See the root README for full deploy steps.
