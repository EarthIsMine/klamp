// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {PermissionedResolverLib as Roles} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";

contract DependenciesTest is Test {
    function testResolverProxyAbi() public {
        VerifiableFactory factory = new VerifiableFactory();
        PermissionedResolver impl = new PermissionedResolver(address(this));
        PermissionedResolver resolver = PermissionedResolver(factory.deployProxy(
            address(impl), 0, abi.encodeCall(PermissionedResolver.initialize,
            (address(this), Roles.ROLE_SET_TEXT_ADMIN | Roles.ROLE_SET_DATA_ADMIN, new bytes[](0)))
        ));
        resolver.authorizeTextRoles(hex"00", "pool", address(this), true);
        resolver.authorizeDataRoles(hex"00", "pool", address(this), true);
        resolver.setText(bytes32(uint256(1)), "pool", "test");
        resolver.setData(bytes32(uint256(1)), "pool", hex"1234");
        assertEq(resolver.text(bytes32(uint256(1)), "pool"), "test");
        assertEq(resolver.data(bytes32(uint256(1)), "pool"), hex"1234");
    }
}
