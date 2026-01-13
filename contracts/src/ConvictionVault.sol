// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConvictionVault
 * @notice Universal staking vault supporting any ERC-20 creator coin
 * @dev One position per (user, token) pair. Duration-based tiers.
 */
contract ConvictionVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Position data for each user per token
    struct Position {
        uint256 amount;
        uint256 lockEnd;
        uint16 lockDays;
    }

    // positions[user][token] = Position
    mapping(address => mapping(address => Position)) public positions;

    // Tier thresholds (in days)
    uint256 public constant TIER_BRONZE = 0;    // staked > 0
    uint256 public constant TIER_SILVER = 7;    // lock >= 7 days
    uint256 public constant TIER_GOLD = 30;     // lock >= 30 days
    uint256 public constant TIER_LEGEND = 90;   // lock >= 90 days

    // Minimum lock duration (1 day)
    uint256 public constant MIN_LOCK_DAYS = 1;
    uint256 public constant MAX_LOCK_DAYS = 365;

    // Events
    event Staked(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 lockEnd
    );
    event StakeIncreased(
        address indexed user,
        address indexed token,
        uint256 addedAmount,
        uint256 newTotal
    );
    event LockExtended(
        address indexed user,
        address indexed token,
        uint256 newLockEnd
    );
    event Withdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Stake tokens with a lock duration
     * @param token The ERC-20 token address to stake
     * @param amount Amount to stake
     * @param lockDays Number of days to lock (1-365)
     */
    function stake(
        address token,
        uint256 amount,
        uint256 lockDays
    ) external nonReentrant {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be > 0");
        require(lockDays >= MIN_LOCK_DAYS, "Lock too short");
        require(lockDays <= MAX_LOCK_DAYS, "Lock too long");
        require(positions[msg.sender][token].amount == 0, "Position exists, use increaseStake");

        uint256 lockEnd = block.timestamp + (lockDays * 1 days);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        positions[msg.sender][token] = Position({
            amount: amount,
            lockEnd: lockEnd,
            lockDays: uint16(lockDays)
        });

        emit Staked(msg.sender, token, amount, lockEnd);
    }

    /**
     * @notice Add more tokens to an existing stake (keeps same lockEnd)
     * @param token The token to add stake to
     * @param amount Additional amount to stake
     */
    function increaseStake(
        address token,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        Position storage pos = positions[msg.sender][token];
        require(pos.amount > 0, "No existing position");
        require(block.timestamp < pos.lockEnd, "Position expired");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        pos.amount += amount;

        emit StakeIncreased(msg.sender, token, amount, pos.amount);
    }

    /**
     * @notice Extend the lock period (can only extend, not reduce)
     * @param token The token position to extend
     * @param newLockDays Days from now for the new lock end
     */
    function extendLock(
        address token,
        uint256 newLockDays
    ) external nonReentrant {
        require(newLockDays >= MIN_LOCK_DAYS, "Lock too short");
        require(newLockDays <= MAX_LOCK_DAYS, "Lock too long");
        
        Position storage pos = positions[msg.sender][token];
        require(pos.amount > 0, "No existing position");
        require(block.timestamp < pos.lockEnd, "Position expired");

        uint256 newLockEnd = block.timestamp + (newLockDays * 1 days);
        require(newLockEnd > pos.lockEnd, "Can only extend lock");

        pos.lockEnd = newLockEnd;
        pos.lockDays = uint16(newLockDays);

        emit LockExtended(msg.sender, token, newLockEnd);
    }

    /**
     * @notice Withdraw tokens after lock period ends
     * @param token The token to withdraw
     */
    function withdraw(address token) external nonReentrant {
        Position storage pos = positions[msg.sender][token];
        require(pos.amount > 0, "No position");
        require(block.timestamp >= pos.lockEnd, "Still locked");

        uint256 amount = pos.amount;
        
        // Clear position
        delete positions[msg.sender][token];

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get position for a user and token
     */
    function getPosition(
        address user,
        address token
    ) external view returns (uint256 amount, uint256 lockEnd) {
        Position memory pos = positions[user][token];
        return (pos.amount, pos.lockEnd);
    }

    /**
     * @notice Get tier based on lock duration chosen
     * @return tier 0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Legend
     */
    function getTier(
        address user,
        address token
    ) external view returns (uint8 tier) {
        Position memory pos = positions[user][token];
        
        if (pos.amount == 0) {
            return 0; // No stake
        }

        uint256 lockDays = pos.lockDays;
        if (lockDays >= TIER_LEGEND) {
            return 4; // Legend
        } else if (lockDays >= TIER_GOLD) {
            return 3; // Gold
        } else if (lockDays >= TIER_SILVER) {
            return 2; // Silver
        } else {
            return 1; // Bronze (staked > 0)
        }
    }

    /**
     * @notice Check if position is locked
     */
    function isLocked(
        address user,
        address token
    ) external view returns (bool) {
        Position memory pos = positions[user][token];
        return pos.amount > 0 && block.timestamp < pos.lockEnd;
    }

    /**
     * @notice Get conviction score for leaderboards (sqrt of amount)
     */
    function getConvictionScore(
        address user,
        address token
    ) external view returns (uint256) {
        Position memory pos = positions[user][token];
        if (pos.amount == 0) return 0;
        return sqrt(pos.amount);
    }

    // ============ Internal Functions ============

    /**
     * @dev Babylonian method for square root
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
