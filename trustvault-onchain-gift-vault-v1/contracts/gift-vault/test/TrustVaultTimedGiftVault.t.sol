// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {
    TrustVaultTimedGiftVault
} from "../src/TrustVaultTimedGiftVault.sol";

import {
    MockUSDC
} from "./MockUSDC.sol";

contract TrustVaultTimedGiftVaultTest is Test {
    TrustVaultTimedGiftVault internal vault;
    MockUSDC internal usdc;

    address internal sender =
        makeAddr("sender");

    address internal recipient =
        makeAddr("recipient");

    address internal stranger =
        makeAddr("stranger");

    uint256 internal constant GIFT_AMOUNT =
        25_000_000; // 25 USDC, 6 decimals.

    function setUp() external {
        usdc = new MockUSDC();

        vault =
            new TrustVaultTimedGiftVault(
                address(usdc)
            );

        usdc.mint(
            sender,
            100_000_000
        );

        vm.prank(sender);
        usdc.approve(
            address(vault),
            type(uint256).max
        );
    }

    function testCreateGiftDepositsUsdc()
        external
    {
        uint64 unlockTimestamp =
            uint64(block.timestamp + 1 days);

        vm.prank(sender);
        uint256 giftId =
            vault.createGift(
                recipient,
                GIFT_AMOUNT,
                unlockTimestamp
            );

        TrustVaultTimedGiftVault.Gift
            memory gift =
                vault.getGift(giftId);

        assertEq(gift.sender, sender);
        assertEq(
            gift.recipient,
            recipient
        );
        assertEq(
            gift.amount,
            GIFT_AMOUNT
        );
        assertEq(
            gift.unlockTimestamp,
            unlockTimestamp
        );
        assertFalse(gift.claimed);

        assertEq(
            usdc.balanceOf(
                address(vault)
            ),
            GIFT_AMOUNT
        );
    }

    function testCannotClaimBeforeUnlock()
        external
    {
        uint64 unlockTimestamp =
            uint64(block.timestamp + 1 hours);

        vm.prank(sender);
        uint256 giftId =
            vault.createGift(
                recipient,
                GIFT_AMOUNT,
                unlockTimestamp
            );

        vm.warp(
            unlockTimestamp - 1
        );

        vm.prank(recipient);

        vm.expectRevert(
            abi.encodeWithSelector(
                TrustVaultTimedGiftVault
                    .GiftStillLocked
                    .selector,
                unlockTimestamp
            )
        );

        vault.claim(giftId);
    }

    function testRecipientCanClaimExactlyAtUnlock()
        external
    {
        uint64 unlockTimestamp =
            uint64(block.timestamp + 1 hours);

        vm.prank(sender);
        uint256 giftId =
            vault.createGift(
                recipient,
                GIFT_AMOUNT,
                unlockTimestamp
            );

        vm.warp(unlockTimestamp);

        assertTrue(
            vault.isClaimable(giftId)
        );

        vm.prank(recipient);
        vault.claim(giftId);

        assertEq(
            usdc.balanceOf(recipient),
            GIFT_AMOUNT
        );

        assertEq(
            usdc.balanceOf(
                address(vault)
            ),
            0
        );

        TrustVaultTimedGiftVault.Gift
            memory gift =
                vault.getGift(giftId);

        assertTrue(gift.claimed);
    }

    function testNonRecipientCannotClaim()
        external
    {
        uint64 unlockTimestamp =
            uint64(block.timestamp + 1 hours);

        vm.prank(sender);
        uint256 giftId =
            vault.createGift(
                recipient,
                GIFT_AMOUNT,
                unlockTimestamp
            );

        vm.warp(unlockTimestamp);

        vm.prank(stranger);
        vm.expectRevert(
            TrustVaultTimedGiftVault
                .NotRecipient
                .selector
        );

        vault.claim(giftId);
    }

    function testCannotClaimTwice()
        external
    {
        uint64 unlockTimestamp =
            uint64(block.timestamp + 1 hours);

        vm.prank(sender);
        uint256 giftId =
            vault.createGift(
                recipient,
                GIFT_AMOUNT,
                unlockTimestamp
            );

        vm.warp(unlockTimestamp);

        vm.prank(recipient);
        vault.claim(giftId);

        vm.prank(recipient);
        vm.expectRevert(
            TrustVaultTimedGiftVault
                .GiftAlreadyClaimed
                .selector
        );

        vault.claim(giftId);
    }

    function testRejectsPastUnlockTime()
        external
    {
        vm.prank(sender);
        vm.expectRevert(
            TrustVaultTimedGiftVault
                .UnlockMustBeFuture
                .selector
        );

        vault.createGift(
            recipient,
            GIFT_AMOUNT,
            uint64(block.timestamp)
        );
    }

    function testRejectsZeroRecipient()
        external
    {
        vm.prank(sender);
        vm.expectRevert(
            TrustVaultTimedGiftVault
                .ZeroAddress
                .selector
        );

        vault.createGift(
            address(0),
            GIFT_AMOUNT,
            uint64(block.timestamp + 1 days)
        );
    }

    function testRejectsZeroAmount()
        external
    {
        vm.prank(sender);
        vm.expectRevert(
            TrustVaultTimedGiftVault
                .ZeroAmount
                .selector
        );

        vault.createGift(
            recipient,
            0,
            uint64(block.timestamp + 1 days)
        );
    }
}
