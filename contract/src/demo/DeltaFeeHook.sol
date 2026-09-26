// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "v4-core/types/BeforeSwapDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {ModifyLiquidityParams, SwapParams} from "v4-core/types/PoolOperation.sol";

/// @notice Honest demo version of a D-type (delta fee) hook. Takes a fixed percentage of each swap's unspecified-side amount
///         and sends it to feeRecipient. The rate is the same for every caller, so the quote and swap execution fees match.
///         Permission bits: afterSwap(6) + afterSwapReturnDelta(2) → lower 14 bits of the address = 0x44.
/// @dev This hook attaches to the canonical pool. Fee manipulation by the hook itself is handled by phase 2 (fee cap), not phase 1.
contract DeltaFeeHook is IHooks {
    uint160 public constant FLAGS = (1 << 6) | (1 << 2);

    IPoolManager public immutable poolManager;
    address public immutable feeRecipient;
    uint256 public immutable feeBps; // 100 = 1%

    error NotPoolManager();
    error HookNotImplemented();

    constructor(IPoolManager poolManager_, address feeRecipient_, uint256 feeBps_) {
        poolManager = poolManager_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    function afterSwap(address, PoolKey calldata key, SwapParams calldata params, BalanceDelta delta, bytes calldata)
        external
        returns (bytes4, int128)
    {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        // unspecified currency: output side for exact-in, input side for exact-out
        bool specifiedIs0 = (params.amountSpecified < 0) == params.zeroForOne;
        (Currency unspecified, int128 amount) =
            specifiedIs0 ? (key.currency1, delta.amount1()) : (key.currency0, delta.amount0());
        uint256 abs = uint256(uint128(amount < 0 ? -amount : amount));
        uint256 fee = abs * feeBps / 10_000;
        if (fee == 0) return (IHooks.afterSwap.selector, 0);
        poolManager.take(unspecified, feeRecipient, fee);
        return (IHooks.afterSwap.selector, int128(int256(fee)));
    }

    // ---------- unused callbacks (never called because their permission bits are off) ----------

    function beforeInitialize(address, PoolKey calldata, uint160) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function beforeAddLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert HookNotImplemented();
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        revert HookNotImplemented();
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert HookNotImplemented();
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        revert HookNotImplemented();
    }

    function beforeSwap(address, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        pure
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        revert HookNotImplemented();
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotImplemented();
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotImplemented();
    }
}
