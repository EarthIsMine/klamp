// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {KlampSetup, IUserRegistry, IPermResolver} from "./KlampSetup.sol";

/// Steps 2-5: register klamp.eth, tokens label, deploy registrar and grant roles, revoke our roles.
contract Finish is Script, KlampSetup {
    function run() external {
        string memory j = vm.readFile("./deployments/sepolia.json");
        address me = vm.parseJsonAddress(j, ".deployer");
        require(msg.sender == me, "run with the same deployer account");
        bytes32 secret = vm.parseJsonBytes32(j, ".secret");
        IUserRegistry reg = IUserRegistry(vm.parseJsonAddress(j, ".userRegistry"));
        IPermResolver res = IPermResolver(vm.parseJsonAddress(j, ".resolver"));

        vm.startBroadcast();
        Deployed memory d = _phase2(me, secret, reg, res);
        vm.stopBroadcast();

        string memory o = "finish";
        vm.serializeAddress(o, "deployer", me);
        vm.serializeBytes32(o, "secret", secret);
        vm.serializeAddress(o, "userRegistry", address(reg));
        vm.serializeAddress(o, "resolver", address(res));
        vm.serializeUint(o, "klampTokenId", d.klampTokenId);
        vm.writeJson(vm.serializeAddress(o, "registrar", address(d.registrar)), "./deployments/sepolia.json");
        console.log("CanonicalPoolRegistrar", address(d.registrar));
        console.log("klamp.eth tokenId", d.klampTokenId);
        console.log("owner roles left on klamp.eth", ETH_REGISTRY.roles(d.klampTokenId, me) & KLAMP_OWNER_ROLES);
        console.log("resolver root roles left", res.roles(0, me));
        console.log("registry root roles left", reg.roles(0, me));
    }
}
