// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RiskOraclePlaceholder} from "../src/RiskOraclePlaceholder.sol";

contract RiskOraclePlaceholderTest is Test {
    RiskOraclePlaceholder internal oracle;
    address internal owner = address(0xA11CE);

    function setUp() public {
        oracle = new RiskOraclePlaceholder(owner);
    }

    function test_ownerIsSet() public view {
        assertEq(oracle.owner(), owner);
    }

    function test_nameAndVersion() public view {
        assertEq(oracle.NAME(), "XRadar Risk Oracle");
        assertEq(oracle.VERSION(), "0.1.0");
    }
}
