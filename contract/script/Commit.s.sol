// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {KlampSetup, IUserRegistry, IPermResolver} from "./KlampSetup.sol";

/// Step 1: deploy registry and resolver, prepare the registration fee, commit klamp.eth. Run Finish.s.sol 60s later.
contract Commit is Script, KlampSetup {
    function run() external {
        address me = msg.sender;
        require(ETH_REGISTRAR.isAvailable(LABEL), "klamp.eth not available");
        bytes32 secret = keccak256(abi.encode(me, block.timestamp, block.prevrandao));
        uint256 salt = uint256(keccak256(abi.encode("klamp", me, block.timestamp)));

        vm.startBroadcast();
        (IUserRegistry reg, IPermResolver res) = _phase1(me, secret, salt);
        vm.stopBroadcast();

        string memory o = "commit";
        vm.serializeAddress(o, "deployer", me);
        vm.serializeBytes32(o, "secret", secret);
        vm.serializeAddress(o, "userRegistry", address(reg));
        vm.serializeUint(o, "committedAt", block.timestamp);
        string memory json = vm.serializeAddress(o, "resolver", address(res));
        vm.writeJson(json, "./deployments/sepolia.json");
        console.log("UserRegistry", address(reg));
        console.log("PermissionedResolver", address(res));
        console.log("Wait >= 60s, then run Finish.s.sol");
    }
}
