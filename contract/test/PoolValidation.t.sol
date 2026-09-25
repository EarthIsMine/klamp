// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture, FixtureToken} from "./fixtures/RegistrarFixture.sol";
import {CanonicalPoolRegistrar, PoolKey, IPermissionedResolver, IUERC20Factory, IStateView} from "../src/CanonicalPoolRegistrar.sol";
contract PoolValidationTest is RegistrarFixture {
    function assertEmpty(address token) internal view {
        assertEq(registrar.canonicalPoolOf(token), bytes32(0));
        assertEq(resolver.text(nodeFor(token), "pool"), "");
        assertEq(resolver.data(nodeFor(token), "pool"), hex"");
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
    function testRejectUnsortedOrIdenticalCurrencies() public {
        address token = deployer.deploy(0);
        PoolKey memory key = keyFor(token); key.currency0 = token; key.currency1 = address(0);
        vm.expectRevert(CanonicalPoolRegistrar.InvalidCurrencyOrder.selector);
        deployer.record(registrar, token, key, 0);
        key.currency1 = token;
        vm.expectRevert(CanonicalPoolRegistrar.InvalidCurrencyOrder.selector);
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
        resolver.authorizeDataRoles(hex"00", "pool", address(registrar), false);
        vm.expectRevert();
        deployer.record(registrar, token, keyFor(token), 0);
        assertEmpty(token);
    }
    function testRejectWrongManager() public {
        vm.expectRevert(CanonicalPoolRegistrar.InvalidStateView.selector);
        new CanonicalPoolRegistrar(IPermissionedResolver(address(resolver)), tokensName, IUERC20Factory(address(factory)), new address[](0), IStateView(address(stateView)), address(factory));
    }
}
