// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {CanonicalPoolRegistrar, PoolKey, IPermissionedResolver, IUERC20Factory, IPoolManager} from "../src/CanonicalPoolRegistrar.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {RegistryRolesLib as R} from "ens-v2/registry/libraries/RegistryRolesLib.sol";
import {PermissionedResolverLib as P} from "ens-v2/resolver/libraries/PermissionedResolverLib.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {NameCoder} from "@ens/contracts/utils/NameCoder.sol";
import {UniversalResolverV2} from "ens-v2/universalResolver/UniversalResolverV2.sol";

import {CloneProxyBytecode} from "@ensdomains/verifiable-factory/CloneProxyBytecode.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @dev Shared by scripts and tests; calls execute as the caller/broadcast signer.
library Phase1Setup {
    uint256 internal constant REG_ROLES = R.ROLE_REGISTRAR | R.ROLE_REGISTRAR_ADMIN | R.ROLE_SET_PARENT | R.ROLE_SET_PARENT_ADMIN;
    uint256 internal constant RES_ROLES = P.ROLE_SET_TEXT_ADMIN | P.ROLE_SET_DATA_ADMIN;
    /// @dev Kept by the operator after seal until hooks.klamp.eth is registered (stage 2).
    uint256 internal constant KEPT_REG_ROLES = R.ROLE_REGISTRAR | R.ROLE_REGISTRAR_ADMIN;
    /// @dev Local fixtures only: roles the operator holds on the eth/klamp parent names.
    uint256 internal constant PARENT_ROLES = R.ROLE_SET_RESOLVER | R.ROLE_SET_RESOLVER_ADMIN | R.ROLE_SET_SUBREGISTRY | R.ROLE_SET_SUBREGISTRY_ADMIN;
    struct Config {
        VerifiableFactory factory;
        UserRegistry registryImpl;
        PermissionedResolver resolverImpl;
        IPoolManager poolManager;
        IUERC20Factory tokenFactory;
        address[] launchers;
        address operator;
        uint256 salt;
    }
    struct Deployment { UserRegistry registry; PermissionedResolver resolver; CanonicalPoolRegistrar registrar; }

    function deploy(Config memory c) internal returns (Deployment memory) {
        return deploy(c,CanonicalPoolRegistrar(address(0)));
    }
    function deploy(Config memory c, CanonicalPoolRegistrar existing) internal returns (Deployment memory d) {
        require(c.operator != address(0), "zero administrator");
        d.registry = UserRegistry(_proxy(c,address(c.registryImpl),c.salt,abi.encodeCall(UserRegistry.initialize,(c.operator,REG_ROLES))));
        d.resolver = PermissionedResolver(_proxy(c,address(c.resolverImpl),c.salt+1,abi.encodeCall(PermissionedResolver.initialize,(c.operator,RES_ROLES,new bytes[](0)))));
        if(d.registry.getOwner(uint256(keccak256("tokens"))) == address(0))
            d.registry.register("tokens", c.operator, IRegistry(address(0)), address(d.resolver), 0, type(uint64).max);
        else require(d.registry.getResolver("tokens") == address(d.resolver), "existing tokens differ");
        if(address(existing) == address(0)) {
            require(d.resolver.roleCount(0) == RES_ROLES, "supply existing REGISTRAR to resume");
            d.registrar = new CanonicalPoolRegistrar(IPermissionedResolver(address(d.resolver)),NameCoder.encode("tokens.klamp.eth"),c.poolManager,c.tokenFactory,c.launchers);
        } else {
            require(address(existing.resolver()) == address(d.resolver)
                && existing.poolManager() == c.poolManager && address(existing.uerc20Factory()) == address(c.tokenFactory)
                && existing.tokensNode() == NameCoder.namehash(NameCoder.encode("tokens.klamp.eth"),0), "existing registrar differs");
            for(uint256 i; i<c.launchers.length; ++i) require(existing.isLiquidityLauncher(c.launchers[i]),"existing launchers differ");
            d.registrar = existing;
        }
        uint256 poolResource = P.resource(0,P.partHash("pool"));
        if(!d.resolver.hasRoles(poolResource,P.ROLE_SET_TEXT,address(d.registrar))) d.resolver.authorizeTextRoles(hex"00","pool",address(d.registrar),true);
        if(!d.resolver.hasRoles(poolResource,P.ROLE_SET_DATA,address(d.registrar))) d.resolver.authorizeDataRoles(hex"00","pool",address(d.registrar),true);
        // Pinned authorizeTextRoles requires name-admin rather than key-admin.
        if(!d.resolver.hasRootRoles(P.ROLE_SET_TEXT_ADMIN,address(d.registrar))) d.resolver.authorizeNameRoles(hex"00",P.ROLE_SET_TEXT_ADMIN,address(d.registrar),true);
    }
    function _proxy(Config memory c, address impl, uint256 salt, bytes memory init) private returns(address proxy) {
        bytes32 outerSalt=keccak256(abi.encode(c.operator,salt));
        proxy=Create2.computeAddress(outerSalt,keccak256(CloneProxyBytecode.creationCode(c.factory.proxyLogic(),outerSalt)),address(c.factory));
        if(proxy.code.length==0) return c.factory.deployProxy(impl,salt,init);
        require(c.factory.verifyContract(proxy)==impl,"existing proxy implementation differs");
    }

    function seal(Deployment memory d, PermissionedRegistry parent, UniversalResolverV2 universal,
        address operator, uint256 expectedChainId, address probeToken) internal
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
        bytes32 poolId=d.registrar.canonicalPoolOf(probeToken);
        require(keccak256(bytes(abi.decode(result,(string)))) == keccak256(bytes(string.concat("eip155:",Strings.toString(block.chainid),":",Strings.toHexString(uint256(poolId),32)))), "probe mismatch");
        (uint256 dataChain,PoolKey memory key)=abi.decode(d.resolver.data(NameCoder.namehash(name,0),"pool"),(uint256,PoolKey));
        require(dataChain==block.chainid && keccak256(abi.encode(key))==poolId,"probe data mismatch");
        }
        uint256 rootId = parent.getResource(uint256(keccak256("klamp")));
        require(d.registry.roleCount(d.registry.getResource(uint256(keccak256("tokens")))) == 0, "unexpected tokens permissions");
        uint256 regRoles = d.registry.roles(0,operator);
        uint256 resRoles = d.resolver.roles(0,operator);
        uint256 parentRoles = parent.roles(rootId,operator);
        // Count checks reject grants to unexpected accounts before irreversible revocation.
        require(d.registry.roleCount(0) == regRoles && (regRoles == REG_ROLES || regRoles == KEPT_REG_ROLES || regRoles == 0), "unexpected registry roles");
        require(d.resolver.roleCount(0) == resRoles + P.ROLE_SET_TEXT_ADMIN && (resRoles == RES_ROLES || resRoles == 0), "unexpected resolver roles");
        require(parent.roleCount(rootId) == parentRoles, "unexpected parent roles");
        if (resRoles != 0) d.resolver.revokeRootRoles(resRoles,operator);
        // REGISTRAR stays until hooks.klamp.eth is registered in stage 2 (finalizeHooks).
        if (regRoles & ~KEPT_REG_ROLES != 0) d.registry.revokeRootRoles(regRoles & ~KEPT_REG_ROLES,operator);
        if (parentRoles != 0) parent.revokeRoles(rootId,parentRoles,operator);
        require(d.registry.roleCount(0) == (regRoles & KEPT_REG_ROLES) && parent.roleCount(rootId) == 0, "seal incomplete");
        require(d.resolver.roleCount(0) == P.ROLE_SET_TEXT_ADMIN, "resolver seal incomplete");
    }
    /// @notice Stage 2: register hooks.klamp.eth with no roles, then revoke the last registry role.
    function finalizeHooks(Deployment memory d, address operator, IRegistry hooksRegistry, address hooksResolver) internal {
        require(d.registry.roles(0,operator) == KEPT_REG_ROLES && d.registry.roleCount(0) == KEPT_REG_ROLES, "seal first");
        if(d.registry.getOwner(uint256(keccak256("hooks"))) == address(0))
            d.registry.register("hooks", operator, hooksRegistry, hooksResolver, 0, type(uint64).max);
        else require(d.registry.getResolver("hooks") == hooksResolver && d.registry.getSubregistry("hooks") == hooksRegistry, "existing hooks differ");
        d.registry.revokeRootRoles(KEPT_REG_ROLES,operator);
        require(d.registry.roleCount(0) == 0, "hooks finalize incomplete");
    }
    function _hexAddress(address a) private pure returns (bytes memory b) {
        bytes16 digits = "0123456789abcdef"; b = new bytes(42); b[0]="0"; b[1]="x";
        for(uint256 i; i<20; ++i) { uint8 v=uint8(bytes20(a)[i]); b[2+i*2]=digits[v>>4]; b[3+i*2]=digits[v&15]; }
    }
}
