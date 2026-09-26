// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture, FixtureToken} from "./fixtures/RegistrarFixture.sol";
import {CanonicalPoolRegistrar, PoolKey} from "../src/CanonicalPoolRegistrar.sol";
import {PermissionedResolverLib as P} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey as V4Key} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
contract PoolValidationTest is RegistrarFixture {
    function assertEmpty(address token) internal view {
        assertEq(registrar.canonicalPoolOf(token), bytes32(0));
        assertEq(textOf(token, "pool"), "");
        assertEq(dataOf(token, "pool"), hex"");
    }
    function testRejectPredictedButUndeployedToken() public {
        bytes32 salt = bytes32(uint256(1));
        address token = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff),address(deployer),salt,keccak256(type(FixtureToken).creationCode))))));
        vm.expectRevert(CanonicalPoolRegistrar.TokenNotDeployed.selector);
        deployer.record(registrar, token, keyFor(token), salt);
        assertEmpty(token);
    }
    function testRejectUninitializedPool() public {
        address token = deployer.deploy(0);
        vm.expectRevert(CanonicalPoolRegistrar.PoolNotInitialized.selector);
        deployer.record(registrar, token, keyFor(token), 0);
        assertEmpty(token);
    }
    /// @dev PoolManager rejects unsorted keys at initialize, so their PoolId can never be initialized.
    function testRejectUnsortedOrIdenticalCurrencies() public {
        address token = deployer.deploy(0);
        initialize(keyFor(token));
        PoolKey memory key = keyFor(token); key.currency0 = token; key.currency1 = address(0);
        vm.expectRevert(CanonicalPoolRegistrar.PoolNotInitialized.selector);
        deployer.record(registrar, token, key, 0);
        key.currency1 = token;
        vm.expectRevert(CanonicalPoolRegistrar.PoolNotInitialized.selector);
        deployer.record(registrar, token, key, 0);
        assertEmpty(token);
    }
    function testInitializedWithoutLiquidityIsAllowed() public {
        address token = deployer.deploy(0);
        initialize(keyFor(token));
        deployer.record(registrar, token, keyFor(token), 0);
        assertTrue(registrar.canonicalPoolOf(token) != bytes32(0));
    }
    function testDataWriteFailureRollsBackTextAndMapping() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        resolver.revokeRoles(uint256(keccak256("pool")), P.ROLE_SET_DATA, address(registrar));
        vm.expectRevert();
        deployer.record(registrar, token, keyFor(token), 0);
        assertEmpty(token);
    }
    function testRejectPoolInitializedOnAnotherManager() public {
        address token = deployer.deploy(0);
        PoolManager other = new PoolManager(address(this));
        PoolKey memory key = keyFor(token);
        other.initialize(V4Key(Currency.wrap(key.currency0), Currency.wrap(key.currency1), key.fee, key.tickSpacing, IHooks(key.hooks)), uint160(1 << 96));
        vm.expectRevert(CanonicalPoolRegistrar.PoolNotInitialized.selector);
        deployer.record(registrar, token, key, 0);
        assertEmpty(token);
    }
    function testPoolsSlotReadsInitializedPrice() public {
        address token = deployer.deploy(0);
        PoolKey memory key = keyFor(token);
        initialize(key);
        bytes32 id = keccak256(abi.encode(key));
        uint160 price = uint160(uint256(manager.extsload(keccak256(abi.encodePacked(id, registrar.POOLS_SLOT())))));
        (uint160 viewPrice,,,) = stateView.getSlot0(PoolId.wrap(id));
        assertEq(price, uint160(1 << 96));
        assertEq(price, viewPrice);
    }
}
