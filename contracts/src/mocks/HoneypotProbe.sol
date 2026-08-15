// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IUniswapV2Router02 {
    function WETH() external view returns (address);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @notice Simulation-only helper injected via eth_call state override.
contract HoneypotProbe {
    receive() external payable {}

    function buyAndSell(address router, address token)
        external
        payable
        returns (uint256 tokensBought, uint256 ethOut)
    {
        address weth = IUniswapV2Router02(router).WETH();
        address[] memory buyPath = new address[](2);
        buyPath[0] = weth;
        buyPath[1] = token;

        IUniswapV2Router02(router).swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: msg.value
        }(0, buyPath, address(this), block.timestamp + 1200);

        tokensBought = IERC20Minimal(token).balanceOf(address(this));
        IERC20Minimal(token).approve(router, type(uint256).max);

        address[] memory sellPath = new address[](2);
        sellPath[0] = token;
        sellPath[1] = weth;

        uint256 before = address(this).balance;
        IUniswapV2Router02(router).swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokensBought,
            0,
            sellPath,
            address(this),
            block.timestamp + 1200
        );
        ethOut = address(this).balance - before;
    }
}
