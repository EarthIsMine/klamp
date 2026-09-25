// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script} from "forge-std/Script.sol";
import {ProbeLauncher} from "./ProbeLauncher.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
contract ProbePhase1 is Script {
    function run() external {
        require(block.chainid==vm.envUint("CHAIN_ID"),"wrong chain");
        require(block.chainid==31337||block.chainid==11155111,"testnet only");
        address operator=vm.envAddress("OPERATOR");
        CanonicalPoolRegistrar registrar=CanonicalPoolRegistrar(vm.envAddress("REGISTRAR"));
        ProbeLauncher launcher=ProbeLauncher(vm.envOr("PROBE_LAUNCHER",address(0)));
        bytes32 salt=vm.envBytes32("PROBE_SALT");
        vm.startBroadcast(operator);
        if(address(launcher)==address(0)) launcher=new ProbeLauncher(operator,registrar);
        require(launcher.operator()==operator&&launcher.registrar()==registrar,"probe config differs");
        address token=launcher.launch(salt);
        vm.stopBroadcast();
        string memory object="probe";
        vm.serializeAddress(object,"token",token); vm.serializeAddress(object,"create2Launcher",address(launcher));
        vm.serializeBytes32(object,"salt",salt);vm.serializeBytes32(object,"initCodeHash",launcher.initCodeHash());
        string memory json=vm.serializeBytes32(object,"poolId",registrar.canonicalPoolOf(token));
        vm.writeJson(json,"deployments/probe.json");
    }
}
