// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {CanonicalPoolRegistrar, IPermissionedResolver, IUERC20Factory, IStateView} from "../src/CanonicalPoolRegistrar.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {RegistryRolesLib as R} from "ens-v2/registry/libraries/RegistryRolesLib.sol";
import {PermissionedResolverLib as P} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {NameCoder} from "@ens/contracts/utils/NameCoder.sol";
import {UniversalResolverV2} from "ens-v2/universalResolver/UniversalResolverV2.sol";

/// @dev Shared by scripts and tests; calls execute as the caller/broadcast signer.
library Phase1Setup {
    uint256 internal constant REG_ROLES = R.ROLE_REGISTRAR | R.ROLE_REGISTRAR_ADMIN | R.ROLE_SET_PARENT | R.ROLE_SET_PARENT_ADMIN;
    uint256 internal constant RES_ROLES = P.ROLE_SET_TEXT_ADMIN | P.ROLE_SET_DATA_ADMIN;
    uint256 internal constant HOOK_ROLES = R.ROLE_SET_RESOLVER | R.ROLE_SET_RESOLVER_ADMIN | R.ROLE_SET_SUBREGISTRY | R.ROLE_SET_SUBREGISTRY_ADMIN;
    struct Config {
        VerifiableFactory factory;
        UserRegistry registryImpl;
        PermissionedResolver resolverImpl;
        IStateView stateView;
        address poolManager;
        IUERC20Factory tokenFactory;
        address[] launchers;
        address operator;
        address hooksAdmin;
        uint256 salt;
    }
    struct Deployment { UserRegistry registry; PermissionedResolver resolver; CanonicalPoolRegistrar registrar; }

    function deploy(Config memory c) internal returns (Deployment memory d) {
        require(c.operator != address(0) && c.hooksAdmin != address(0), "zero administrator");
        d.registry = UserRegistry(c.factory.deployProxy(address(c.registryImpl), c.salt,
            abi.encodeCall(UserRegistry.initialize, (c.operator, REG_ROLES))));
        d.resolver = PermissionedResolver(c.factory.deployProxy(address(c.resolverImpl), c.salt + 1,
            abi.encodeCall(PermissionedResolver.initialize, (c.operator, RES_ROLES, new bytes[](0)))));
        d.registry.register("tokens", c.operator, IRegistry(address(0)), address(d.resolver), 0, type(uint64).max);
        d.registry.register("hooks", c.hooksAdmin, IRegistry(address(0)), address(0), HOOK_ROLES, type(uint64).max);
        d.registrar = new CanonicalPoolRegistrar(IPermissionedResolver(address(d.resolver)), NameCoder.encode("tokens.klamp.eth"), c.tokenFactory, c.launchers, c.stateView, c.poolManager);
        d.resolver.authorizeTextRoles(hex"00", "pool", address(d.registrar), true);
        d.resolver.authorizeDataRoles(hex"00", "pool", address(d.registrar), true);
        // This pinned resolver checks name-admin, not key-admin, when delegating.
        d.resolver.authorizeNameRoles(hex"00", P.ROLE_SET_TEXT_ADMIN, address(d.registrar), true);
    }

    function seal(Deployment memory d, PermissionedRegistry parent, UniversalResolverV2 universal,
        address operator, address hooksAdmin, uint256 expectedChainId, address probeToken) internal
    {
        require(block.chainid == expectedChainId, "wrong chain");
        require(parent.getSubregistry("klamp") == IRegistry(address(d.registry)), "wrong parent link");
        {
        (IRegistry p, string memory label) = d.registry.getParent();
        require(address(p) == address(parent) && keccak256(bytes(label)) == keccak256("klamp"), "wrong registry parent");
        }
        require(d.registry.getResolver("tokens") == address(d.resolver), "wrong resolver");
        require(address(d.registrar.resolver()) == address(d.resolver), "wrong registrar");
        {
        bytes memory name = abi.encodePacked(uint8(42), _hexAddress(probeToken), NameCoder.encode("tokens.klamp.eth"));
        (bytes memory result, address resolved) = universal.resolve(name, abi.encodeWithSignature("text(bytes32,string)", NameCoder.namehash(name,0), "pool"));
        require(resolved == address(d.resolver) && d.registrar.canonicalPoolOf(probeToken) != 0, "probe missing");
        require(keccak256(bytes(abi.decode(result,(string)))) == keccak256(bytes(d.resolver.text(NameCoder.namehash(name,0),"pool"))), "probe mismatch");
        }
        uint256 rootId = parent.getResource(uint256(keccak256("klamp")));
        {
        uint256 tokensId = d.registry.getResource(uint256(keccak256("tokens")));
        uint256 hooksId = d.registry.getResource(uint256(keccak256("hooks")));
        require(d.registry.roleCount(tokensId) == 0, "unexpected tokens permissions");
        require(d.registry.roleCount(hooksId) == HOOK_ROLES && d.registry.roles(hooksId,hooksAdmin) == HOOK_ROLES, "unexpected hooks permissions");
        }
        uint256 regRoles = d.registry.roles(0,operator);
        uint256 resRoles = d.resolver.roles(0,operator);
        uint256 parentRoles = parent.roles(rootId,operator);
        // Count checks reject grants to unexpected accounts before irreversible revocation.
        require(d.registry.roleCount(0) == regRoles && (regRoles == REG_ROLES || regRoles == 0), "unexpected registry roles");
        require(d.resolver.roleCount(0) == resRoles + P.ROLE_SET_TEXT_ADMIN && (resRoles == RES_ROLES || resRoles == 0), "unexpected resolver roles");
        require(parent.roleCount(rootId) == parentRoles, "unexpected parent roles");
        if (resRoles != 0) d.resolver.revokeRootRoles(resRoles,operator);
        if (regRoles != 0) d.registry.revokeRootRoles(regRoles,operator);
        if (parentRoles != 0) parent.revokeRoles(rootId,parentRoles,operator);
        require(d.registry.roleCount(0) == 0 && parent.roleCount(rootId) == 0, "seal incomplete");
        require(d.resolver.roleCount(0) == P.ROLE_SET_TEXT_ADMIN, "resolver seal incomplete");
    }
    function _hexAddress(address a) private pure returns (bytes memory b) {
        bytes16 digits = "0123456789abcdef"; b = new bytes(42); b[0]="0"; b[1]="x";
        for(uint256 i; i<20; ++i) { uint8 v=uint8(bytes20(a)[i]); b[2+i*2]=digits[v>>4]; b[3+i*2]=digits[v&15]; }
    }
}
