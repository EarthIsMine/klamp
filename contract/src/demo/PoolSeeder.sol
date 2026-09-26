// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FullMath} from "v4-core/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/libraries/FixedPoint96.sol";

interface IERC20Pull {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

/// @notice 데모용: ETH/토큰 풀을 tickUpper 가격으로 초기화하고, 호출자의 토큰을 [tickLower, tickUpper) 단면 유동성으로 넣는다.
///         "선언되지 않은 풀"을 만들 때 쓴다. 유동성은 이 컨트랙트에 남고 빼는 함수는 없다.
contract PoolSeeder is IUnlockCallback {
    IPoolManager public immutable poolManager;

    error NotPoolManager();

    constructor(IPoolManager poolManager_) {
        poolManager = poolManager_;
    }

    function seed(PoolKey calldata key, int24 tickLower, int24 tickUpper, uint256 amount) external {
        address token = Currency.unwrap(key.currency1);
        IERC20Pull(token).transferFrom(msg.sender, address(this), amount);
        poolManager.initialize(key, TickMath.getSqrtPriceAtTick(tickUpper));
        poolManager.unlock(abi.encode(key, tickLower, tickUpper, amount));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (PoolKey memory key, int24 tickLower, int24 tickUpper, uint256 amount) =
            abi.decode(data, (PoolKey, int24, int24, uint256));
        uint256 liquidity = FullMath.mulDiv(
            amount, FixedPoint96.Q96, TickMath.getSqrtPriceAtTick(tickUpper) - TickMath.getSqrtPriceAtTick(tickLower)
        );
        (BalanceDelta delta,) =
            poolManager.modifyLiquidity(key, ModifyLiquidityParams(tickLower, tickUpper, int256(liquidity), 0), "");
        poolManager.sync(key.currency1);
        IERC20Pull(Currency.unwrap(key.currency1)).transfer(address(poolManager), uint256(uint128(-delta.amount1())));
        poolManager.settle();
        return "";
    }
}
