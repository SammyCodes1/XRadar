// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {RiskOraclePlaceholder} from "../src/RiskOraclePlaceholder.sol";

/// @notice Deploys the placeholder oracle. Wire real publication logic later.
contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        RiskOraclePlaceholder oracle = new RiskOraclePlaceholder(deployer);
        vm.stopBroadcast();

        console.log("RiskOraclePlaceholder", address(oracle));
        console.log("owner", deployer);
    }
}
