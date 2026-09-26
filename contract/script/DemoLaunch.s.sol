// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {KlampSetup} from "./KlampSetup.sol";
import {CanonicalPoolRegistrar} from "../src/CanonicalPoolRegistrar.sol";
import {DisposableLauncher} from "../src/demo/DisposableLauncher.sol";

/// 데모 3: Pools.trade 방식(일회용 컨트랙트 경유) 토큰을 만들고, 크리에이터가 nonce로 대표 풀을 선언한다.
contract DemoLaunch is Script, KlampSetup {
    string constant NAME = "Klamp Demo";
    string constant SYMBOL = "KDEMO";
    uint160 constant SQRT_PRICE = 77371252455336267181195264; // 2^86, 값 자체는 데모에 영향 없음

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
