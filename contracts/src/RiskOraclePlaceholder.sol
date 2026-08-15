// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RiskOraclePlaceholder
/// @notice Scaffold-only Ownable contract. Risk publication logic is not implemented yet.
contract RiskOraclePlaceholder is Ownable {
    string public constant NAME = "XRadar Risk Oracle";
    string public constant VERSION = "0.1.0";

    constructor(address initialOwner) Ownable(initialOwner) {}
}
