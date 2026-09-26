// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Script, console2} from "forge-std/Script.sol";
import {RegistrationFlow} from "./RegistrationFlow.sol";
import {IETHRegistrarParams} from "./RegistrationFlow.sol";
import {IPermissionedRegistry} from "ens-v2/registry/interfaces/IPermissionedRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract RegisterRoot is Script {
    function run() external {
        require(block.chainid==vm.envUint("CHAIN_ID"),"wrong chain");
        uint256 duration=vm.envUint("REGISTRATION_DURATION"); require(duration<=type(uint64).max,"duration overflow");
        RegistrationFlow.Config memory c=RegistrationFlow.Config(
            IETHRegistrarParams(vm.envAddress("ETH_REGISTRAR")),IPermissionedRegistry(vm.envAddress("ETH_REGISTRY")),
            IPermissionedRegistry(vm.envAddress("REGISTRY")),IERC20(vm.envAddress("PAYMENT_TOKEN")),vm.envAddress("OPERATOR"),
            vm.envBytes32("REGISTRATION_SECRET"),uint64(duration),vm.envUint("MAX_REGISTRATION_PRICE"));
        vm.startBroadcast(c.operator);
        (RegistrationFlow.Step state,uint256 readyAt)=RegistrationFlow.step(c);
        vm.stopBroadcast();
        console2.log("Registration step (0=committed,1=waiting,2=registered,3=already registered)",uint256(state));
        console2.log("Retry at timestamp",readyAt);
    }
}
