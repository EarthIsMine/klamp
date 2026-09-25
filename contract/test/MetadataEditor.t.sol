// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture} from "./fixtures/RegistrarFixture.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
contract MetadataEditorTest is RegistrarFixture {
    function testEditorCanOnlyEditOwnDescriptionAndUrl() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        deployer.recordWithEditor(registrar, token, keyFor(token), 0, creator);
        bytes32 node = nodeFor(token);
        vm.startPrank(creator);
        resolver.setText(node, "description", "hello"); resolver.setText(node, "url", "https://example.com");
        vm.expectRevert(); resolver.setText(node, "pool", "forged");
        vm.expectRevert(); resolver.setData(node, "pool", hex"01");
        vm.expectRevert(); resolver.setText(bytes32(uint256(1)), "description", "other");
        vm.expectRevert(); resolver.authorizeTextRoles(hex"00", "pool", creator, true);
        vm.stopPrank();
        assertEq(resolver.text(node, "description"), "hello");
    }
    function testZeroEditorRejected() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        vm.expectRevert(CanonicalPoolRegistrar.InvalidEditor.selector);
        deployer.recordWithEditor(registrar, token, keyFor(token), 0, address(0));
    }
    function testEditorCannotBecomeRegistrationProver() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.NotDeployer.selector);
        registrar.recordByCreate2(token, keyFor(token), 0, 0, creator);
    }
    function testLegacyEditorIsCreate2Executor() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        deployer.record(registrar, token, keyFor(token), 0);
        bytes32 node = nodeFor(token);
        vm.prank(address(deployer)); resolver.setText(node, "description", "executor");
        vm.prank(creator); vm.expectRevert(); resolver.setText(node, "description", "creator");
    }
}
