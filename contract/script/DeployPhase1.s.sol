// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {Phase1Setup} from "./Phase1Setup.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {VerifiableFactory} from "@ensdomains/verifiable-factory/VerifiableFactory.sol";
import {IUERC20Factory, IStateView} from "../src/CanonicalPoolRegistrar.sol";
contract DeployPhase1 is Script {
    function run() external returns (Phase1Setup.Deployment memory d) {
        require(block.chainid == vm.envUint("CHAIN_ID"), "wrong chain");
        Phase1Setup.Config memory c;
        c.factory = VerifiableFactory(vm.envAddress("VERIFIABLE_FACTORY"));
        c.registryImpl = UserRegistry(vm.envAddress("USER_REGISTRY_IMPL"));
        c.resolverImpl = PermissionedResolver(vm.envAddress("RESOLVER_IMPL"));
        c.stateView = IStateView(vm.envAddress("STATE_VIEW"));
        c.poolManager = vm.envAddress("POOL_MANAGER");
        c.tokenFactory = IUERC20Factory(vm.envAddress("TOKEN_FACTORY"));
        c.launchers = vm.envAddress("LAUNCHERS", ",");
        c.operator = vm.envAddress("OPERATOR");
        c.hooksAdmin = vm.envAddress("HOOKS_ADMIN");
        c.salt = vm.envUint("DEPLOYMENT_SALT");
        require(address(c.factory).code.length > 0 && address(c.registryImpl).code.length > 0 && address(c.resolverImpl).code.length > 0, "missing protocol code");
        vm.startBroadcast(c.operator);
        d = Phase1Setup.deploy(c);
        vm.stopBroadcast();
    }
}
