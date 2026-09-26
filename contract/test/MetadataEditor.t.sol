// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {RegistrarFixture} from "./fixtures/RegistrarFixture.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
import {Phase1Setup} from "../script/Phase1Setup.sol";
/// @dev The Beta resolver has key-scoped roles only, so description/url go through registrar.setTokenText.
contract MetadataEditorTest is RegistrarFixture {
    function testEditorCanOnlyEditOwnDescriptionAndUrl() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        deployer.recordWithEditor(registrar, token, keyFor(token), 0, creator);
        address other = deployer.deploy(bytes32(uint256(1))); initialize(keyFor(other));
        deployer.recordWithEditor(registrar, other, keyFor(other), bytes32(uint256(1)), address(0xD00D));
        vm.startPrank(creator);
        registrar.setTokenText(token, "description", "hello"); registrar.setTokenText(token, "url", "https://example.com");
        vm.expectRevert(CanonicalPoolRegistrar.KeyNotAllowed.selector); registrar.setTokenText(token, "pool", "forged");
        vm.expectRevert(CanonicalPoolRegistrar.NotCreator.selector); registrar.setTokenText(other, "description", "other");
        vm.expectRevert(); resolver.setText(Phase1Setup.tokenName(token), "description", "direct");
        vm.expectRevert(); resolver.setData(Phase1Setup.tokenName(token), "pool", hex"01");
        vm.stopPrank();
        assertEq(textOf(token, "description"), "hello");
        assertEq(textOf(token, "url"), "https://example.com");
    }
    function testZeroCreatorGrantsNoMetadataRights() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        deployer.recordWithEditor(registrar, token, keyFor(token), 0, address(0));
        assertTrue(registrar.canonicalPoolOf(token) != bytes32(0));
        vm.prank(address(deployer)); vm.expectRevert(CanonicalPoolRegistrar.NotCreator.selector); registrar.setTokenText(token, "description", "issuer");
        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.NotCreator.selector); registrar.setTokenText(token, "description", "creator");
    }
    function testEditorCannotBecomeRegistrationProver() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        vm.prank(creator); vm.expectRevert(CanonicalPoolRegistrar.NotIssuer.selector);
        registrar.recordByCreate2(token, keyFor(token), 0, 0, creator);
    }
    function testIssuerContractHasNoMetadataRights() public {
        address token = deployer.deploy(0); initialize(keyFor(token));
        deployer.recordWithEditor(registrar, token, keyFor(token), 0, creator);
        vm.prank(address(deployer)); vm.expectRevert(CanonicalPoolRegistrar.NotCreator.selector); registrar.setTokenText(token, "description", "issuer");
        vm.prank(creator); registrar.setTokenText(token, "description", "creator");
        assertEq(textOf(token, "description"), "creator");
    }
}
