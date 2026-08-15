// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {RiskRegistry} from "../src/RiskRegistry.sol";

/// @title DeployRiskRegistry
/// @notice Deploys {RiskRegistry}, grants {ORACLE_ROLE}, and writes the address
///         to `shared/deployedAddresses.json` keyed by network name.
/// @dev Required env:
///      - PRIVATE_KEY          deployer (receives DEFAULT_ADMIN_ROLE)
///      - ORACLE_WALLET        address that receives ORACLE_ROLE
///      Optional env:
///      - DEPLOY_NETWORK       JSON key: `testnet` or `mainnet`
///      - DEPLOYED_ADDRESSES   output path, default `../shared/deployedAddresses.json`
contract DeployRiskRegistry is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address oracle = vm.envAddress("ORACLE_WALLET");
        string memory network = vm.envOr("DEPLOY_NETWORK", string("testnet"));

        require(oracle != address(0), "ORACLE_WALLET is zero");

        vm.startBroadcast(deployerKey);
        RiskRegistry registry = new RiskRegistry(deployer);
        registry.grantOracleRole(oracle);
        vm.stopBroadcast();

        console.log("network", network);
        console.log("RiskRegistry", address(registry));
        console.log("admin", deployer);
        console.log("oracle", oracle);

        _writeDeployedAddress(network, address(registry));
    }

    function _writeDeployedAddress(string memory network, address deployed) internal {
        string memory path = vm.envOr("DEPLOYED_ADDRESSES", string("../shared/deployedAddresses.json"));

        if (!vm.exists(path)) {
            vm.writeFile(path, "{}");
        }

        string memory obj = "network";
        string memory payload = vm.serializeAddress(obj, "RiskRegistry", deployed);
        payload = vm.serializeUint(obj, "chainId", block.chainid);

        vm.writeJson(payload, path, string.concat(".", network));
        console.log("wrote", path);
    }
}
