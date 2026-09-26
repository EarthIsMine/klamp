// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {Phase1Setup, IUniversalResolve} from "./Phase1Setup.sol";
import {IPermissionedRegistry} from "ens-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IPermissionedResolver} from "ens-v2/resolver/interfaces/IPermissionedResolver.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
contract SealPhase1 is Script {
    function run() external {
        address operator = vm.envAddress("OPERATOR");
        Phase1Setup.Deployment memory d = Phase1Setup.Deployment(
            IPermissionedRegistry(vm.envAddress("REGISTRY")), IPermissionedResolver(vm.envAddress("RESOLVER")),
            CanonicalPoolRegistrar(vm.envAddress("REGISTRAR")));
        IPermissionedRegistry parent = IPermissionedRegistry(vm.envAddress("ETH_REGISTRY"));
        IUniversalResolve universal = IUniversalResolve(vm.envAddress("UNIVERSAL_RESOLVER"));
        uint256 chainId = vm.envUint("CHAIN_ID");
        address probe = vm.envAddress("PROBE_TOKEN");
        vm.startBroadcast(operator);
        Phase1Setup.seal(d,parent,universal,operator,chainId,probe);
        vm.stopBroadcast();
    }
}
