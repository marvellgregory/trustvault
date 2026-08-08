// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

import {
    TrustVaultTimedGiftVault
} from "../src/TrustVaultTimedGiftVault.sol";

contract DeployTrustVaultTimedGiftVault is Script {
    address internal constant ARC_TESTNET_USDC =
        0x3600000000000000000000000000000000000000;

    function run()
        external
        returns (
            TrustVaultTimedGiftVault vault
        )
    {
        uint256 deployerPrivateKey =
            vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(
            deployerPrivateKey
        );

        vault =
            new TrustVaultTimedGiftVault(
                ARC_TESTNET_USDC
            );

        vm.stopBroadcast();
    }
}
