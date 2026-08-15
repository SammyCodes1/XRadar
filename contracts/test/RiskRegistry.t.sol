// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {RiskRegistry} from "../src/RiskRegistry.sol";

contract RiskRegistryTest is Test {
    RiskRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal oracle = makeAddr("oracle");
    address internal stranger = makeAddr("stranger");
    address internal tokenA = makeAddr("tokenA");
    address internal tokenB = makeAddr("tokenB");

    function setUp() public {
        registry = new RiskRegistry(admin);
        vm.prank(admin);
        registry.grantOracleRole(oracle);
    }

    function test_constructorGrantsAdminAndRejectsZero() public {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertFalse(registry.hasRole(registry.ORACLE_ROLE(), admin));

        vm.expectRevert(RiskRegistry.ZeroAddress.selector);
        new RiskRegistry(address(0));
    }

    function test_unauthorizedPublishReverts() public {
        bytes memory unauthorized =
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, registry.ORACLE_ROLE());

        vm.expectRevert(unauthorized);
        vm.prank(stranger);
        registry.publishScore(tokenA, 10, "ipfs://report");

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, admin, registry.ORACLE_ROLE()
            )
        );
        vm.prank(admin);
        registry.publishScore(tokenA, 10, "ipfs://report");
    }

    function test_validPublishSucceedsAndEmitsEvent() public {
        uint8 score = 42;
        string memory uri = "ipfs://QmValidReport";
        uint256 ts = 1_700_000_123;
        vm.warp(ts);

        vm.expectEmit(true, false, false, true, address(registry));
        emit RiskRegistry.ScoreUpdated(tokenA, score, uri, ts);

        vm.prank(oracle);
        registry.publishScore(tokenA, score, uri);

        (uint8 storedScore, string memory storedUri, uint256 storedTs) = registry.getLatestScore(tokenA);
        assertEq(storedScore, score);
        assertEq(storedUri, uri);
        assertEq(storedTs, ts);
    }

    function test_scoreOverwriteWorks() public {
        vm.warp(1_000);
        vm.prank(oracle);
        registry.publishScore(tokenA, 15, "ipfs://v1");

        vm.warp(2_000);
        vm.prank(oracle);
        registry.publishScore(tokenA, 88, "ipfs://v2");

        (uint8 score, string memory uri, uint256 ts) = registry.getLatestScore(tokenA);
        assertEq(score, 88);
        assertEq(uri, "ipfs://v2");
        assertEq(ts, 2_000);

        address[] memory scanned = registry.getAllScannedTokens();
        assertEq(scanned.length, 1);
        assertEq(scanned[0], tokenA);
    }

    function test_invalidScoreReverts() public {
        vm.expectRevert(abi.encodeWithSelector(RiskRegistry.InvalidScore.selector, uint8(101)));
        vm.prank(oracle);
        registry.publishScore(tokenA, 101, "ipfs://bad");

        vm.expectRevert(abi.encodeWithSelector(RiskRegistry.InvalidScore.selector, uint8(255)));
        vm.prank(oracle);
        registry.publishScore(tokenA, 255, "ipfs://worse");

        (uint8 score, string memory uri, uint256 ts) = registry.getLatestScore(tokenA);
        assertEq(score, 0);
        assertEq(uri, "");
        assertEq(ts, 0);
    }

    function test_scoreBoundariesZeroAndOneHundredAreValid() public {
        vm.prank(oracle);
        registry.publishScore(tokenA, 0, "ipfs://zero");
        (uint8 score,,) = registry.getLatestScore(tokenA);
        assertEq(score, 0);

        vm.prank(oracle);
        registry.publishScore(tokenA, 100, "ipfs://max");
        (score,,) = registry.getLatestScore(tokenA);
        assertEq(score, 100);
    }

    function test_getAllScannedTokensNoDuplicates() public {
        vm.startPrank(oracle);
        registry.publishScore(tokenA, 10, "ipfs://a1");
        registry.publishScore(tokenB, 20, "ipfs://b1");
        registry.publishScore(tokenA, 30, "ipfs://a2");
        vm.stopPrank();

        address[] memory scanned = registry.getAllScannedTokens();
        assertEq(scanned.length, 2);
        assertEq(scanned[0], tokenA);
        assertEq(scanned[1], tokenB);

        (uint8 scoreA, string memory uriA,) = registry.getLatestScore(tokenA);
        assertEq(scoreA, 30);
        assertEq(uriA, "ipfs://a2");
    }

    function test_publishScoreRevertsOnZeroToken() public {
        vm.expectRevert(RiskRegistry.ZeroAddress.selector);
        vm.prank(oracle);
        registry.publishScore(address(0), 1, "ipfs://zero-token");
    }

    function test_grantAndRevokeOracleRole() public {
        address newOracle = makeAddr("newOracle");

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, registry.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(stranger);
        registry.grantOracleRole(newOracle);

        vm.expectRevert(RiskRegistry.ZeroAddress.selector);
        vm.prank(admin);
        registry.grantOracleRole(address(0));

        vm.prank(admin);
        registry.grantOracleRole(newOracle);
        assertTrue(registry.hasRole(registry.ORACLE_ROLE(), newOracle));

        vm.prank(newOracle);
        registry.publishScore(tokenB, 7, "ipfs://new");

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, registry.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(stranger);
        registry.revokeOracleRole(newOracle);

        vm.prank(admin);
        registry.revokeOracleRole(newOracle);
        assertFalse(registry.hasRole(registry.ORACLE_ROLE(), newOracle));

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, newOracle, registry.ORACLE_ROLE()
            )
        );
        vm.prank(newOracle);
        registry.publishScore(tokenB, 8, "ipfs://revoked");
    }
}
