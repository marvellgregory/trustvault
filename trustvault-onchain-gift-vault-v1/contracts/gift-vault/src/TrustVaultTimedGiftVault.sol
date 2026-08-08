// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TrustVaultTimedGiftVault
/// @notice Holds Arc Testnet USDC until a configured unlock timestamp.
/// @dev The frontend converts the sender's local date/time/timezone into
///      a canonical Unix timestamp before calling createGift().
contract TrustVaultTimedGiftVault {
    error ZeroAddress();
    error ZeroAmount();
    error UnlockMustBeFuture();
    error GiftNotFound();
    error NotRecipient();
    error GiftAlreadyClaimed();
    error GiftStillLocked(uint64 unlockTimestamp);
    error TokenTransferFailed();
    error Reentrancy();

    struct Gift {
        address sender;
        address recipient;
        uint256 amount;
        uint64 unlockTimestamp;
        bool claimed;
    }

    /// @notice Arc USDC ERC-20 interface.
    address public immutable usdc;

    /// @notice Next gift id. Gift ids begin at 1.
    uint256 public nextGiftId = 1;

    mapping(uint256 giftId => Gift gift) private gifts;

    uint256 private _reentrancyStatus = 1;

    event GiftCreated(
        uint256 indexed giftId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint64 unlockTimestamp
    );

    event GiftClaimed(
        uint256 indexed giftId,
        address indexed recipient,
        uint256 amount,
        uint256 claimedAt
    );

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) {
            revert ZeroAddress();
        }

        usdc = usdcAddress;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus != 1) {
            revert Reentrancy();
        }

        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    /// @notice Create a timed USDC gift.
    /// @param recipient Wallet allowed to claim after unlockTimestamp.
    /// @param amount USDC amount in ERC-20 base units (6 decimals on Arc).
    /// @param unlockTimestamp Canonical UTC Unix timestamp.
    /// @return giftId The newly created gift id.
    ///
    /// @dev The sender must first approve this contract to spend at least
    ///      `amount` USDC through the ERC-20 interface.
    function createGift(
        address recipient,
        uint256 amount,
        uint64 unlockTimestamp
    ) external nonReentrant returns (uint256 giftId) {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }

        if (amount == 0) {
            revert ZeroAmount();
        }

        if (unlockTimestamp <= block.timestamp) {
            revert UnlockMustBeFuture();
        }

        giftId = nextGiftId;
        nextGiftId = giftId + 1;

        gifts[giftId] = Gift({
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            unlockTimestamp: unlockTimestamp,
            claimed: false
        });

        _safeTransferFrom(
            usdc,
            msg.sender,
            address(this),
            amount
        );

        emit GiftCreated(
            giftId,
            msg.sender,
            recipient,
            amount,
            unlockTimestamp
        );
    }

    /// @notice Claim an unlocked gift.
    /// @dev Claim becomes valid when block.timestamp >= unlockTimestamp.
    function claim(uint256 giftId) external nonReentrant {
        Gift storage gift = gifts[giftId];

        if (gift.sender == address(0)) {
            revert GiftNotFound();
        }

        if (msg.sender != gift.recipient) {
            revert NotRecipient();
        }

        if (gift.claimed) {
            revert GiftAlreadyClaimed();
        }

        if (block.timestamp < gift.unlockTimestamp) {
            revert GiftStillLocked(gift.unlockTimestamp);
        }

        gift.claimed = true;

        _safeTransfer(
            usdc,
            gift.recipient,
            gift.amount
        );

        emit GiftClaimed(
            giftId,
            gift.recipient,
            gift.amount,
            block.timestamp
        );
    }

    /// @notice Return the complete stored gift state.
    function getGift(
        uint256 giftId
    ) external view returns (Gift memory gift) {
        gift = gifts[giftId];

        if (gift.sender == address(0)) {
            revert GiftNotFound();
        }
    }

    /// @notice Returns true only when the gift exists, is unclaimed,
    ///         and its exact unlock timestamp has been reached.
    function isClaimable(
        uint256 giftId
    ) external view returns (bool) {
        Gift storage gift = gifts[giftId];

        return
            gift.sender != address(0) &&
            !gift.claimed &&
            block.timestamp >= gift.unlockTimestamp;
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) private {
        (bool success, bytes memory data) =
            token.call(
                abi.encodeWithSelector(
                    bytes4(
                        keccak256(
                            "transferFrom(address,address,uint256)"
                        )
                    ),
                    from,
                    to,
                    amount
                )
            );

        if (
            !success ||
            (data.length != 0 &&
                !abi.decode(data, (bool)))
        ) {
            revert TokenTransferFailed();
        }
    }

    function _safeTransfer(
        address token,
        address to,
        uint256 amount
    ) private {
        (bool success, bytes memory data) =
            token.call(
                abi.encodeWithSelector(
                    bytes4(
                        keccak256(
                            "transfer(address,uint256)"
                        )
                    ),
                    to,
                    amount
                )
            );

        if (
            !success ||
            (data.length != 0 &&
                !abi.decode(data, (bool)))
        ) {
            revert TokenTransferFailed();
        }
    }
}
