// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal ERC-20 used to confirm the detection scanner on testnet.
contract ScanProbeToken is ERC20 {
    constructor() ERC20("XRadar Probe", "XRPROBE") {
        _mint(msg.sender, 1_000_000 ether);
    }
}
