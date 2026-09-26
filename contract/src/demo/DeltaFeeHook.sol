// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "v4-core/types/BeforeSwapDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {ModifyLiquidityParams, SwapParams} from "v4-core/types/PoolOperation.sol";

/// @notice D형(delta 수수료) 훅의 정직한 데모 버전. 매 스왑의 unspecified 쪽 금액에서 고정 비율을 떼어
///         feeRecipient에게 보낸다. 호출자가 누구든 같은 비율이라 견적과 체결 수수료가 같다.
///         권한 비트: afterSwap(6) + afterSwapReturnDelta(2) → 주소 하위 14비트 = 0x44.
/// @dev 대표 풀에 붙는 훅이다. 이 훅 자체의 수수료 조작은 1단계가 아니라 2단계(수수료 상한)가 다룬다.
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
        // unspecified 통화: exact-in이면 출력 쪽, exact-out이면 입력 쪽
        bool specifiedIs0 = (params.amountSpecified < 0) == params.zeroForOne;
        (Currency unspecified, int128 amount) =
            specifiedIs0 ? (key.currency1, delta.amount1()) : (key.currency0, delta.amount0());
        uint256 abs = uint256(uint128(amount < 0 ? -amount : amount));
        uint256 fee = abs * feeBps / 10_000;
        if (fee == 0) return (IHooks.afterSwap.selector, 0);
        poolManager.take(unspecified, feeRecipient, fee);
        return (IHooks.afterSwap.selector, int128(int256(fee)));
    }

    // ---------- 쓰지 않는 콜백 (권한 비트가 꺼져 있어 호출되지 않는다) ----------

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
