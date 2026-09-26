// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Vm} from "forge-std/Vm.sol";
import {IPermissionedRegistry} from "ens-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IETHRegistrar} from "ens-v2/registrar/interfaces/IETHRegistrar.sol";
import {IRentPriceOracle} from "ens-v2/registrar/interfaces/IRentPriceOracle.sol";
import {GatewayProvider} from "@ens/contracts/ccipRead/GatewayProvider.sol";
import {IUniversalResolve} from "./Phase1Setup.sol";

/// @dev Local/test-only deployment of the ENSv2 Beta implementations compiled in EnsArtifacts.sol (solc 0.8.25).
library EnsDeploy {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    /// @dev Beta constructors grant naming roles to this account and reject address(0). Local fixtures only.
    address internal constant NAMER = address(uint160(uint256(keccak256("klamp.local.contract-namer"))));
    function labelStore() internal returns (address) { return vm.deployCode("LabelStore.sol:LabelStore", abi.encode(NAMER)); }
    function permissionedRegistry(address labels, address root, uint256 roles) internal returns (IPermissionedRegistry) {
        return IPermissionedRegistry(vm.deployCode("PermissionedRegistry.sol:PermissionedRegistry", abi.encode(labels, root, roles)));
    }
    function userRegistryImpl(address labels) internal returns (address) { return vm.deployCode("UserRegistry.sol:UserRegistry", abi.encode(labels, NAMER)); }
    function resolverImpl() internal returns (address) { return vm.deployCode("PermissionedResolver.sol:PermissionedResolver", abi.encode(NAMER)); }
    function universalResolver(IPermissionedRegistry root, address owner) internal returns (IUniversalResolve) {
        GatewayProvider gateways = new GatewayProvider(owner, new string[](0));
        return IUniversalResolve(vm.deployCode("UniversalResolverV2.sol:UniversalResolverV2", abi.encode(root, gateways, NAMER)));
    }
    function ethRegistrar(address owner, IPermissionedRegistry eth, address beneficiary, IRentPriceOracle oracle) internal returns (IETHRegistrar) {
        return IETHRegistrar(vm.deployCode("ETHRegistrar.sol:ETHRegistrar", abi.encode(owner, eth, beneficiary, oracle, uint64(100), uint64(60), uint64(3600), uint64(1 days))));
    }
    function mockERC20(string memory symbol, uint8 decimals) internal returns (address) { return vm.deployCode("MockERC20.sol:MockERC20", abi.encode(symbol, decimals)); }
}
