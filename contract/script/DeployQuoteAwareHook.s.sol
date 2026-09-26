// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {QuoteAwareFeeHook} from "../src/demo/QuoteAwareFeeHook.sol";

/// Demo 1 attack pool, step 1: deploy the quote-aware hook (quotes 0.05% to V4Quoter, charges 10% on real swaps).
/// The address is deterministic (CREATE2 factory + fixed args + the first salt whose address has only the beforeSwap bit),
/// so dex already knows it; anyone can broadcast this and gets the same address. The pool is then opened from dex's
/// New pool tab (PoolSeeder), like any other pool.
///   forge script script/DeployQuoteAwareHook.s.sol --rpc-url sepolia --broadcast --private-key $KLAMP_PK
contract DeployQuoteAwareHook is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant V4_QUOTER = 0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227;
    uint24 constant QUOTE_FEE = 500; // 0.05%
    uint24 constant SWAP_FEE = 100_000; // 10%

    function predict() public pure returns (address hook, bytes32 salt) {
        bytes32 h = keccak256(
            abi.encodePacked(type(QuoteAwareFeeHook).creationCode, abi.encode(POOL_MANAGER, V4_QUOTER, QUOTE_FEE, SWAP_FEE))
        );
        uint256 s;
        while (uint160(hook = vm.computeCreate2Address(bytes32(s), h, CREATE2_FACTORY)) & 0x3FFF != 0x80) s++;
        salt = bytes32(s);
    }

    function run() external {
        (address predicted, bytes32 salt) = predict();
        if (predicted.code.length > 0) {
            console.log("QuoteAwareFeeHook already deployed", predicted);
            return;
        }
        vm.startBroadcast();
        QuoteAwareFeeHook hook = new QuoteAwareFeeHook{salt: salt}(POOL_MANAGER, V4_QUOTER, QUOTE_FEE, SWAP_FEE);
        vm.stopBroadcast();
        require(address(hook) == predicted, "address mismatch");
        console.log("QuoteAwareFeeHook", address(hook));
    }
}
