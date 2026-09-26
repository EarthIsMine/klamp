// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "../CanonicalPoolRegistrar.sol";

struct UERC20Metadata {
    string description;
    string website;
    string image;
    bytes extra;
}

interface ILiquidityLauncher {
    function createToken(
        address factory,
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint128 initialSupply,
        address recipient,
        bytes calldata tokenData
    ) external payable returns (address);
}

interface IPoolManagerInit {
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24);
}

/// @notice Reproduces the Pools.trade disposable launch pattern. The constructor creates the token via LiquidityLauncher and immediately selfdestructs
///         (EIP-6780: code is deleted if within the creating tx). graffiti = keccak256(abi.encode(this contract's address)).
/// @dev Sepolia has no InstantLaunchStrategy, so instead of the strategy it only initializes a pool with the same PoolKey (ETH, token, 2500, 25, no hook).
///      If poolManager is 0, pool initialization is skipped.
contract DisposableLauncher {
    constructor(
        address launcher,
        address factory,
        address poolManager,
        string memory name,
        string memory symbol,
        address recipient,
        uint160 sqrtPriceX96
    ) {
        address token = ILiquidityLauncher(launcher).createToken(
            factory, name, symbol, 18, 1e27, recipient, abi.encode(UERC20Metadata("", "", "", ""))
        );
        if (poolManager != address(0)) {
            IPoolManagerInit(poolManager).initialize(PoolKey(address(0), token, 2500, 25, address(0)), sqrtPriceX96);
        }
        selfdestruct(payable(msg.sender));
    }
}
