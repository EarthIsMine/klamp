// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {KlampSetup} from "./KlampSetup.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
import {DisposableLauncher} from "../src/demo/DisposableLauncher.sol";

/// Demo 3: create a token the Pools.trade way (via a disposable contract), and the creator declares the canonical pool using the nonce.
contract DemoLaunch is Script, KlampSetup {
    string constant NAME = "Klamp Demo";
    string constant SYMBOL = "KDEMO";
    uint160 constant SQRT_PRICE = 77371252455336267181195264; // 2^86; the value itself does not affect the demo

    function run() external {
        string memory j = vm.readFile("./deployments/sepolia.json");
        CanonicalPoolRegistrar registrar = CanonicalPoolRegistrar(vm.parseJsonAddress(j, ".registrar"));
        address me = msg.sender;
        uint64 nonce = vm.getNonce(me);
        address disposable = vm.computeCreateAddress(me, nonce);
        address token = UERC20_FACTORY.getUERC20Address(NAME, SYMBOL, 18, LAUNCHER_V3_2_0, keccak256(abi.encode(disposable)));

        vm.startBroadcast();
        new DisposableLauncher(LAUNCHER_V3_2_0, address(UERC20_FACTORY), address(POOL_MANAGER), NAME, SYMBOL, me, SQRT_PRICE);
        registrar.recordByLiquidityLauncherVia(token, LAUNCHER_V3_2_0, nonce);
        vm.stopBroadcast();

        console.log("creator", me);
        console.log("disposable (self-destructed)", disposable);
        console.log("nonce", nonce);
        console.log("token", token);
        console.logBytes32(registrar.canonicalPoolOf(token));
        vm.writeFile("./deployments/demo-token.txt", string.concat(vm.toString(token), " ", vm.toString(uint256(nonce))));
    }
}
