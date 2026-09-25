// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {Phase1Setup} from "./Phase1Setup.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
import {UniversalResolverV2} from "ens-v2/universalResolver/UniversalResolverV2.sol";
contract SealPhase1 is Script {
    function run() external {
        address operator = vm.envAddress("OPERATOR");
        Phase1Setup.Deployment memory d = Phase1Setup.Deployment(
            UserRegistry(vm.envAddress("REGISTRY")), PermissionedResolver(vm.envAddress("RESOLVER")),
            CanonicalPoolRegistrar(vm.envAddress("REGISTRAR")));
        PermissionedRegistry parent = PermissionedRegistry(vm.envAddress("ETH_REGISTRY"));
        UniversalResolverV2 universal = UniversalResolverV2(vm.envAddress("UNIVERSAL_RESOLVER"));
        address hooksAdmin = vm.envAddress("HOOKS_ADMIN");
        uint256 chainId = vm.envUint("CHAIN_ID");
        address probe = vm.envAddress("PROBE_TOKEN");
        vm.startBroadcast(operator);
        Phase1Setup.seal(d,parent,universal,operator,hooksAdmin,chainId,probe);
        vm.stopBroadcast();
    }
}
