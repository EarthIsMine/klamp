// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture} from "./fixtures/RegistrarFixture.sol";
import {CanonicalPoolRegistrar, PoolKey} from "../src/CanonicalPoolRegistrar.sol";

contract CanonicalPoolRegistrarTest is RegistrarFixture {
    function testCreate2RecordsTextAndData() public {
        address token = deployer.deploy(bytes32(0));
        PoolKey memory key = keyFor(token);
        initialize(key);
        deployer.record(registrar, token, key, bytes32(0));
        bytes32 id = keccak256(abi.encode(key));
        assertEq(registrar.canonicalPoolOf(token), id);
        assertEq(resolver.text(nodeFor(token), "pool"), string.concat("eip155:", vm.toString(block.chainid), ":", vm.toString(id)));
        assertEq(resolver.data(nodeFor(token), "pool"), abi.encode(block.chainid, key));
    }
    function testRejectNonDeployer() public {
        address token = deployer.deploy(bytes32(0));
        vm.expectRevert(CanonicalPoolRegistrar.NotDeployer.selector);
        registrar.recordByCreate2(token, keyFor(token), bytes32(0), bytes32(0));
    }
    function testRejectOverwrite() public {
        address token = deployer.deploy(bytes32(0));
        initialize(keyFor(token));
        deployer.record(registrar, token, keyFor(token), bytes32(0));
        vm.expectRevert(CanonicalPoolRegistrar.AlreadyRecorded.selector);
        deployer.record(registrar, token, keyFor(token), bytes32(0));
    }
    function testRealLauncherAndFactory() public {
        address token = launchToken();
        assertEq(token, factory.getUERC20Address("Launch", "LCH", 18, address(launcher), keccak256(abi.encode(creator))));
        initialize(keyFor(token));
        vm.prank(creator);
        registrar.recordByLiquidityLauncher(token, keyFor(token), address(launcher));
        assertEq(registrar.canonicalPoolOf(token), keccak256(abi.encode(keyFor(token))));
    }
    function testRejectWrongCreator() public {
        address token = launchToken();
        vm.expectRevert(CanonicalPoolRegistrar.NotDeployer.selector);
        registrar.recordByLiquidityLauncher(token, keyFor(token), address(launcher));
    }
    function testRejectTokenNotInPool() public {
        address token = deployer.deploy(bytes32(0));
        vm.expectRevert(CanonicalPoolRegistrar.TokenNotInPool.selector);
        deployer.record(registrar, token, keyFor(address(1)), bytes32(0));
        assertEq(registrar.canonicalPoolOf(token), bytes32(0));
    }
}
