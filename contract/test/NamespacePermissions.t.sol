// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {NamespaceFixture} from "./fixtures/NamespaceFixture.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {Phase1Setup} from "../script/Phase1Setup.sol";
import {RegistryRolesLib as R} from "ens-v2/registry/libraries/RegistryRolesLib.sol";
import {PermissionedResolverLib as P} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";
contract NamespacePermissionsTest is NamespaceFixture {
    function testResumeAfterSealHasNoWrites() public {
        seal(); vm.recordLogs();
        Phase1Setup.Deployment memory again=Phase1Setup.deploy(setupConfig,registrar);
        assertEq(address(again.registry),address(deployment.registry));
        assertEq(vm.getRecordedLogs().length,0);
    }
    function testSealRejectsOperatorChangesAndRegrant() public {
        seal();
        uint256 tokens = uint256(keccak256("tokens"));
        uint256 klamp = uint256(keccak256("klamp"));
        vm.expectRevert(); deployment.registry.setResolver(tokens,address(1));
        vm.expectRevert(); deployment.registry.setSubregistry(tokens,IRegistry(address(1)));
        vm.expectRevert(); deployment.registry.grantRootRoles(R.ROLE_SET_RESOLVER,address(this));
        vm.expectRevert(); deployment.registry.upgradeToAndCall(address(deployment.registry),hex"");
        vm.expectRevert(); resolver.upgradeToAndCall(address(resolver),hex"");
        vm.expectRevert(); eth.setSubregistry(klamp,IRegistry(address(1)));
        vm.expectRevert(); resolver.setText(nodeFor(probe),"pool","forged");
        vm.expectRevert(); resolver.grantRootRoles(P.ROLE_SET_TEXT,address(this));
        seal(); // idempotent: no remaining roles are revoked twice
    }
    function testHooksAdminIsIsolated() public {
        seal();
        vm.startPrank(hooksAdmin);
        deployment.registry.setResolver(uint256(keccak256("hooks")),address(123));
        deployment.registry.setSubregistry(uint256(keccak256("hooks")),IRegistry(address(456)));
        vm.expectRevert(); deployment.registry.setResolver(uint256(keccak256("tokens")),address(123));
        vm.expectRevert(); deployment.registry.setParent(IRegistry(address(1)),"x");
        vm.expectRevert(); eth.setResolver(uint256(keccak256("klamp")),address(123));
        vm.stopPrank();
    }
    function sealWrongChain() external { Phase1Setup.seal(deployment,eth,universal,address(this),hooksAdmin,block.chainid+1,probe); }
    function testWrongChainDoesNotSeal() public {
        vm.expectRevert("wrong chain");
        this.sealWrongChain();
        assertTrue(deployment.registry.roles(0,address(this)) != 0);
    }
}
