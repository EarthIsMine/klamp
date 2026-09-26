// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPermissionedResolver} from "ens-v2/resolver/interfaces/IPermissionedResolver.sol";
import {IPermissionedResolverInitializable} from "ens-v2/resolver/interfaces/IPermissionedResolverInitializable.sol";
import {Grant} from "ens-v2/access-control/interfaces/IEACGrantInitializable.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {NameCoder} from "@ens/contracts/utils/NameCoder.sol";
import {Phase1Setup} from "../script/Phase1Setup.sol";
import {EnsDeploy} from "../script/EnsDeploy.sol";

/// @dev Pins the Sepolia ENSv2 Beta resolver ABI: name-based setters, key-scoped setter roles, reads via resolve().
contract DependenciesTest is Test {
    function testResolverProxyAbi() public {
        Grant[] memory grants = new Grant[](1); grants[0] = Grant(address(this), Phase1Setup.RES_ROLES);
        IPermissionedResolver resolver = IPermissionedResolver(new VerifiableFactory().deployProxy(
            EnsDeploy.resolverImpl(), 0, abi.encodeCall(IPermissionedResolverInitializable.initialize, (grants, new bytes[](0)))));
        address writer = address(0xA11CE);
        resolver.grantSetterRoles(Phase1Setup.textSetter("pool"), writer);
        resolver.grantSetterRoles(Phase1Setup.dataSetter("pool"), writer);
        bytes memory name = NameCoder.encode("x.tokens.klamp.eth");
        vm.startPrank(writer);
        resolver.setText(name, "pool", "test");
        resolver.setData(name, "pool", hex"1234");
        vm.expectRevert(); resolver.setText(name, "description", "not granted");
        vm.stopPrank();
        assertEq(Phase1Setup.readText(resolver, name, "pool"), "test");
        assertEq(Phase1Setup.readData(resolver, name, "pool"), hex"1234");
    }
}
