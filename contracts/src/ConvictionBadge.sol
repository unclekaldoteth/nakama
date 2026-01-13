// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IConvictionVault {
    function getPosition(address user, address token) external view returns (uint256 amount, uint256 lockEnd);
    function getTier(address user, address token) external view returns (uint8 tier);
}

/**
 * @title ConvictionBadge
 * @notice Non-transferable ERC-721 (Soulbound Token) for conviction proof
 * @dev One badge per (user, token) pair. Badge reflects current vault position.
 */
contract ConvictionBadge is ERC721, Ownable {
    using Strings for uint256;
    using Strings for address;

    // Reference to the vault contract
    IConvictionVault public immutable vault;

    // Badge metadata
    struct BadgeData {
        address holder;
        address token;
        uint8 tier;
        uint256 validUntil;
        uint256 lastRefresh;
    }

    // tokenId => BadgeData
    mapping(uint256 => BadgeData) public badges;

    // Track if user has badge for token: user => token => tokenId
    mapping(address => mapping(address => uint256)) public userTokenBadge;

    // Token ID counter
    uint256 private _nextTokenId = 1;

    // Tier names for metadata
    string[5] public tierNames = ["None", "Bronze", "Silver", "Gold", "Legend"];
    string[5] public tierColors = ["#666666", "#CD7F32", "#C0C0C0", "#FFD700", "#9333EA"];

    // Events
    event BadgeClaimed(
        address indexed user,
        address indexed token,
        uint256 indexed tokenId,
        uint8 tier
    );
    event BadgeRefreshed(
        uint256 indexed tokenId,
        uint8 oldTier,
        uint8 newTier
    );

    constructor(address _vault) ERC721("Conviction Badge", "CVBADGE") Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault");
        vault = IConvictionVault(_vault);
    }

    /**
     * @notice Claim or refresh badge for a token position
     * @param token The creator token address
     * @return tokenId The badge token ID
     */
    function claimOrRefresh(address token) external returns (uint256 tokenId) {
        (uint256 amount, uint256 lockEnd) = vault.getPosition(msg.sender, token);
        require(amount > 0, "No staked position");

        uint8 currentTier = vault.getTier(msg.sender, token);
        require(currentTier > 0, "No tier earned");

        uint256 existingBadgeId = userTokenBadge[msg.sender][token];

        if (existingBadgeId == 0) {
            // Mint new badge
            tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);

            badges[tokenId] = BadgeData({
                holder: msg.sender,
                token: token,
                tier: currentTier,
                validUntil: lockEnd,
                lastRefresh: block.timestamp
            });

            userTokenBadge[msg.sender][token] = tokenId;

            emit BadgeClaimed(msg.sender, token, tokenId, currentTier);
        } else {
            // Refresh existing badge
            tokenId = existingBadgeId;
            BadgeData storage badge = badges[tokenId];
            uint8 oldTier = badge.tier;

            badge.tier = currentTier;
            badge.validUntil = lockEnd;
            badge.lastRefresh = block.timestamp;

            emit BadgeRefreshed(tokenId, oldTier, currentTier);
        }

        return tokenId;
    }

    /**
     * @notice Get badge data for a user and token
     */
    function getBadge(
        address user,
        address token
    ) external view returns (
        uint256 tokenId,
        uint8 tier,
        uint256 validUntil,
        bool isValid
    ) {
        tokenId = userTokenBadge[user][token];
        if (tokenId == 0) {
            return (0, 0, 0, false);
        }

        BadgeData memory badge = badges[tokenId];
        bool valid = block.timestamp <= badge.validUntil && badge.tier > 0;
        
        return (tokenId, badge.tier, badge.validUntil, valid);
    }

    /**
     * @notice Check if user has valid badge for token at minimum tier
     */
    function hasValidBadge(
        address user,
        address token,
        uint8 minTier
    ) external view returns (bool) {
        uint256 tokenId = userTokenBadge[user][token];
        if (tokenId == 0) return false;

        BadgeData memory badge = badges[tokenId];
        return badge.tier >= minTier && block.timestamp <= badge.validUntil;
    }

    /**
     * @notice Generate on-chain SVG and metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Badge does not exist");

        BadgeData memory badge = badges[tokenId];
        string memory tierName = tierNames[badge.tier];
        string memory tierColor = tierColors[badge.tier];
        bool isValid = block.timestamp <= badge.validUntil;

        // Generate SVG
        string memory svg = _generateSVG(tierName, tierColor, badge.token, isValid);

        // Build metadata JSON
        string memory json = string(
            abi.encodePacked(
                '{"name":"Conviction Badge - ', tierName, '",',
                '"description":"Non-transferable badge proving conviction in creator coin.',
                ' Tier: ', tierName, '",',
                '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                '"attributes":[',
                '{"trait_type":"Tier","value":"', tierName, '"},',
                '{"trait_type":"Token","value":"', Strings.toHexString(uint160(badge.token), 20), '"},',
                '{"trait_type":"Valid Until","display_type":"date","value":', badge.validUntil.toString(), '},',
                '{"trait_type":"Is Valid","value":"', isValid ? "true" : "false", '"}',
                ']}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    /**
     * @dev Generate SVG for badge - split into parts to avoid stack depth issues
     */
    function _generateSVG(
        string memory tierName,
        string memory tierColor,
        address token,
        bool isValid
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                _svgHeader(),
                _svgCircle(tierColor, tierName),
                _svgText(tierName, tierColor, token, isValid),
                '</svg>'
            )
        );
    }

    function _svgHeader() internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#1a1a2e"/><stop offset="100%" style="stop-color:#16213e"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="400" fill="url(#bg)"/>'
        ));
    }

    function _svgCircle(string memory tierColor, string memory tierName) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<circle cx="200" cy="160" r="80" fill="none" stroke="', tierColor, '" stroke-width="4"/>',
            '<text x="200" y="175" font-family="Arial,sans-serif" font-size="48" font-weight="bold" ',
            'fill="', tierColor, '" text-anchor="middle">', _getTierEmoji(tierName), '</text>'
        ));
    }

    function _svgText(string memory tierName, string memory tierColor, address token, bool isValid) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="200" y="280" font-family="Arial,sans-serif" font-size="28" font-weight="bold" ',
            'fill="#ffffff" text-anchor="middle">', tierName, '</text>',
            '<text x="200" y="320" font-family="monospace" font-size="12" ',
            'fill="#888888" text-anchor="middle">', _shortenAddress(token), '</text>',
            '<text x="200" y="370" font-family="Arial,sans-serif" font-size="14" ',
            'fill="', isValid ? '#22c55e' : '#ef4444', '" text-anchor="middle">',
            isValid ? 'VALID' : 'EXPIRED', '</text>'
        ));
    }

    function _getTierEmoji(string memory tierName) internal pure returns (string memory) {
        bytes32 tierHash = keccak256(bytes(tierName));
        if (tierHash == keccak256("Bronze")) return unicode"🥉";
        if (tierHash == keccak256("Silver")) return unicode"🥈";
        if (tierHash == keccak256("Gold")) return unicode"🥇";
        if (tierHash == keccak256("Legend")) return unicode"🏆";
        return unicode"⭕";
    }

    function _shortenAddress(address addr) internal pure returns (string memory) {
        bytes memory addrStr = bytes(Strings.toHexString(uint160(addr), 20));
        bytes memory result = new bytes(13);
        for (uint i = 0; i < 6; i++) result[i] = addrStr[i];
        result[6] = ".";
        result[7] = ".";
        result[8] = ".";
        for (uint i = 0; i < 4; i++) result[9 + i] = addrStr[38 + i];
        return string(result);
    }

    // ============ Soulbound: Block Transfers ============

    /**
     * @dev Override to make tokens non-transferable (soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but block transfers
        if (from != address(0)) {
            revert("Soulbound: non-transferable");
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override approve to prevent approvals
     */
    function approve(address, uint256) public pure override {
        revert("Soulbound: approvals disabled");
    }

    /**
     * @dev Override setApprovalForAll to prevent operator approvals
     */
    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: approvals disabled");
    }
}
