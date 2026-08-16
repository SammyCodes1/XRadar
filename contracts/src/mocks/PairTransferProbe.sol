// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @dev Injected onto a Uniswap V2 pair via eth_call stateOverride.
/// Token balances live in the token contract, so the pair address still
/// "owns" the tokens while this code runs as msg.sender.
contract PairTransferProbe {
    function measure(address token, address to, uint256 amount)
        external
        returns (uint256 sent, uint256 received)
    {
        uint256 before = IERC20Minimal(token).balanceOf(to);
        IERC20Minimal(token).transfer(to, amount);
        received = IERC20Minimal(token).balanceOf(to) - before;
        sent = amount;
    }
}
