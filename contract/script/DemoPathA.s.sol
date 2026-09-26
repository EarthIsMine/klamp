// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
import {DeltaFeeHook} from "../src/demo/DeltaFeeHook.sol";
import {DemoLaunchpad} from "../src/demo/DemoLaunchpad.sol";

/// Demo 1 setup: deploy a D-type hook (1% delta fee) + path A launchpad, launch one token and declare its canonical pool in the same tx.
contract DemoPathA is Script {
    IPoolManager constant PM = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);

    function run() external {
        string memory j = vm.readFile("./deployments/sepolia.json");
        CanonicalPoolRegistrar registrar = CanonicalPoolRegistrar(vm.parseJsonAddress(j, ".registrar"));
        address me = msg.sender;

        bytes32 h = keccak256(abi.encodePacked(type(DeltaFeeHook).creationCode, abi.encode(PM, me, uint256(100))));
        uint256 salt;
        while (uint160(vm.computeCreate2Address(bytes32(salt), h, CREATE2_FACTORY)) & 0x3FFF != 0x44) salt++;

        vm.startBroadcast();
        DeltaFeeHook hook = new DeltaFeeHook{salt: bytes32(salt)}(PM, me, 100);
        DemoLaunchpad pad = new DemoLaunchpad(PM, registrar, IHooks(address(hook)));
        address token = pad.launch("Klamp Hook Demo", "KHOOK");
        registrar.setTokenText(token, "description", "Klamp demo: D-type hook pool declared canonical by its CREATE2 launchpad in the launch tx.");
        vm.stopBroadcast();

        console.log("DeltaFeeHook", address(hook));
        console.log("DemoLaunchpad", address(pad));
        console.log("KHOOK token", token);
        console.logBytes32(registrar.canonicalPoolOf(token));
        string memory o = "pathA";
        vm.serializeAddress(o, "deltaFeeHook", address(hook));
        vm.serializeAddress(o, "demoLaunchpad", address(pad));
        vm.writeJson(vm.serializeAddress(o, "khookToken", token), "./deployments/demo-pathA.json");
    }
}
