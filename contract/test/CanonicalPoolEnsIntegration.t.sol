// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {NamespaceFixture} from "./fixtures/NamespaceFixture.sol";
import {PoolKey} from "../src/CanonicalPoolRegistrar.sol";
import {NameCoder} from "@ens/contracts/utils/NameCoder.sol";
import {PermissionedResolverLib as P} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";
contract CanonicalPoolEnsIntegrationTest is NamespaceFixture {
    function assertResolution(address token) internal view {
        bytes memory name = NameCoder.encode(string.concat(vm.toLowercase(vm.toString(token)),".tokens.klamp.eth"));
        bytes32 node = NameCoder.namehash(name,0);
        (bytes memory textResult, address r1) = universal.resolve(name,abi.encodeWithSignature("text(bytes32,string)",node,"pool"));
        (bytes memory dataResult, address r2) = universal.resolve(name,abi.encodeWithSignature("data(bytes32,string)",node,"pool"));
        (uint256 chainId, PoolKey memory key) = abi.decode(abi.decode(dataResult,(bytes)),(uint256,PoolKey));
        assertEq(chainId,block.chainid);
        assertEq(abi.decode(textResult,(string)),string.concat("eip155:",vm.toString(chainId),":",vm.toString(keccak256(abi.encode(key)))));
        assertEq(r1,address(resolver)); assertEq(r2,address(resolver));
        assertEq(deployment.registry.getOwner(uint256(keccak256(bytes(vm.toLowercase(vm.toString(token)))))),address(0));
    }
    function testWildcardTextDataBeforeAndAfterSeal() public { assertResolution(probe); seal(); assertResolution(probe); }
    function testBothRegistrationPathsContinueAfterSeal() public {
        seal();
        address a = deployer.deploy(bytes32(uint256(1))); initialize(keyFor(a));
        deployer.recordWithEditor(registrar,a,keyFor(a),bytes32(uint256(1)),creator);
        address b = launchToken(); initialize(launchKeyFor(b));
        vm.prank(creator); registrar.recordByLiquidityLauncher(b,address(launcher));
        assertResolution(a); assertResolution(b);
    }
    /// @dev A failing resolver write (here: the pool text role is missing) rolls back mapping, records and creator.
    function testResolverWriteFailureRollsBackEverything() public {
        resolver.revokeRoles(uint256(keccak256("pool")),P.ROLE_SET_TEXT,address(registrar));
        address token = deployer.deploy(bytes32(uint256(1))); initialize(keyFor(token));
        vm.expectRevert(); deployer.recordWithEditor(registrar,token,keyFor(token),bytes32(uint256(1)),creator);
        assertEq(registrar.canonicalPoolOf(token),0);
        assertEq(registrar.creatorOf(token),address(0));
        assertEq(textOf(token,"pool"),"");
        assertEq(dataOf(token,"pool"),hex"");
    }
}
