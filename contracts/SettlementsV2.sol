// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./SettlementsLegacy.sol";
import "./ERC20Mintable.sol";
import "base64-sol/base64.sol";
import "hardhat/console.sol";

//
//▄████████    ▄████████     ███         ███      ▄█          ▄████████   ▄▄▄▄███▄▄▄▄      ▄████████ ███▄▄▄▄       ███        ▄████████
//███    ███   ███    ███ ▀█████████▄ ▀█████████▄ ███         ███    ███ ▄██▀▀▀███▀▀▀██▄   ███    ███ ███▀▀▀██▄ ▀█████████▄   ███    ███
//███    █▀    ███    █▀     ▀███▀▀██    ▀███▀▀██ ███         ███    █▀  ███   ███   ███   ███    █▀  ███   ███    ▀███▀▀██   ███    █▀
//███         ▄███▄▄▄         ███   ▀     ███   ▀ ███        ▄███▄▄▄     ███   ███   ███  ▄███▄▄▄     ███   ███     ███   ▀   ███
//▀███████████ ▀▀███▀▀▀         ███         ███     ███       ▀▀███▀▀▀     ███   ███   ███ ▀▀███▀▀▀     ███   ███     ███     ▀███████████
//███   ███    █▄      ███         ███     ███         ███    █▄  ███   ███   ███   ███    █▄  ███   ███     ███              ███
//▄█    ███   ███    ███     ███         ███     ███▌    ▄   ███    ███ ███   ███   ███   ███    ███ ███   ███     ███        ▄█    ███
//▄████████▀    ██████████    ▄████▀      ▄████▀   █████▄▄██   ██████████  ▀█   ███   █▀    ██████████  ▀█   █▀     ▄████▀    ▄████████▀
//▀

// @author zeth
// @notice This contract is heavily inspired by Dom Hofmann's Loot Project with game design from Sid Meirs Civilisation, DND, Settlers of Catan & Age of Empires.

// Settlements allows for the creation of settlements of which users have 5 turns to create their perfect civ.
// Randomise will pseduo randomly assign a settlement a new set of attributes & increase their turn count.
// An allocation of 100 settlements are reserved for owner & future expansion packs

contract SettlementsV2 is ERC721, ERC721Enumerable, ReentrancyGuard, Ownable {
    SettlementsLegacy private legacySettlements;

    uint256 constant ONE = 10**18;
    uint8[] public civMultipliers = [1, 2, 3, 4, 5, 6, 7, 8];
    uint8[] public realmMultipliers = [3, 2, 1, 1, 1, 5];
    ERC20Mintable[] public resourceTokenAddresses;
    mapping(uint256 => uint256) public tokenIdToLastHarvest;

    constructor(
        SettlementsLegacy _legacyAddress,
        ERC20Mintable ironToken_,
        ERC20Mintable goldToken_,
        ERC20Mintable silverToken_,
        ERC20Mintable woodToken_,
        ERC20Mintable woolToken_,
        ERC20Mintable waterToken_,
        ERC20Mintable grassToken_,
        ERC20Mintable grainToken_
    ) ERC721("Settlements", "STL") {
        legacySettlements = _legacyAddress;
        resourceTokenAddresses = [
            ironToken_,
            goldToken_,
            silverToken_,
            woodToken_,
            woolToken_,
            waterToken_,
            grassToken_,
            grainToken_
        ];
    }

    struct Attributes {
        uint8 size;
        uint8 spirit;
        uint8 age;
        uint8 resource;
        uint8 morale;
        uint8 government;
        uint8 turns;
    }

    string[] public _sizes = [
        "Camp",
        "Hamlet",
        "Village",
        "Town",
        "District",
        "Precinct",
        "Capitol",
        "State"
    ];
    string[] public _spirits = ["Earth", "Fire", "Water", "Air", "Astral"];
    string[] public _ages = [
        "Ancient",
        "Classical",
        "Medieval",
        "Renaissance",
        "Industrial",
        "Modern",
        "Information",
        "Future"
    ];
    string[] public _resources = [
        "Iron",
        "Gold",
        "Silver",
        "Wood",
        "Wool",
        "Water",
        "Grass",
        "Grain"
    ];
    string[] public _morales = [
        "Expectant",
        "Enlightened",
        "Dismissive",
        "Unhappy",
        "Happy",
        "Undecided",
        "Warring",
        "Scared",
        "Unruly",
        "Anarchist"
    ];
    string[] public _governments = [
        "Democracy",
        "Communism",
        "Socialism",
        "Oligarchy",
        "Aristocracy",
        "Monarchy",
        "Theocracy",
        "Colonialism",
        "Dictatorship"
    ];
    string[] public _realms = [
        "Genesis",
        "Valhalla",
        "Keskella",
        "Shadow",
        "Plains",
        "Ends"
    ];

    mapping(uint256 => Attributes) public attrIndex;

    function indexFor(string memory input, uint256 length)
        internal
        pure
        returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(input))) % length;
    }

    function _getRandomSeed(uint256 tokenId, string memory seedFor)
        internal
        view
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(
                    seedFor,
                    Strings.toString(tokenId),
                    block.timestamp,
                    block.difficulty
                )
            );
    }

    function generateAttribute(string memory salt, string[] memory items)
        internal
        pure
        returns (uint8)
    {
        return uint8(indexFor(string(salt), items.length));
    }

    function _makeParts(uint256 tokenId)
        internal
        view
        returns (string[15] memory)
    {
        string[15] memory parts;
        parts[
            0
        ] = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.txt { fill: black; font-family: monospace; font-size: 12px;}</style><rect width="100%" height="100%" fill="white" /><text x="10" y="20" class="txt">';
        parts[1] = _sizes[attrIndex[tokenId].size];
        parts[2] = '</text><text x="10" y="40" class="txt">';
        parts[3] = _spirits[attrIndex[tokenId].spirit];
        parts[4] = '</text><text x="10" y="60" class="txt">';
        parts[5] = _ages[attrIndex[tokenId].age];
        parts[6] = '</text><text x="10" y="80" class="txt">';
        parts[7] = _resources[attrIndex[tokenId].resource];
        parts[8] = '</text><text x="10" y="100" class="txt">';
        parts[9] = _morales[attrIndex[tokenId].morale];
        parts[10] = '</text><text x="10" y="120" class="txt">';
        parts[11] = _governments[attrIndex[tokenId].government];
        parts[12] = '</text><text x="10" y="140" class="txt">';
        parts[13] = _realms[attrIndex[tokenId].turns];
        parts[14] = "</text></svg>";
        return parts;
    }

    function _makeAttributeParts(string[15] memory parts)
        internal
        pure
        returns (string[15] memory)
    {
        string[15] memory attrParts;
        attrParts[0] = '[{ "trait_type": "Size", "value": "';
        attrParts[1] = parts[1];
        attrParts[2] = '" }, { "trait_type": "Spirit", "value": "';
        attrParts[3] = parts[3];
        attrParts[4] = '" }, { "trait_type": "Age", "value": "';
        attrParts[5] = parts[5];
        attrParts[6] = '" }, { "trait_type": "Resource", "value": "';
        attrParts[7] = parts[7];
        attrParts[8] = '" }, { "trait_type": "Morale", "value": "';
        attrParts[9] = parts[9];
        attrParts[10] = '" }, { "trait_type": "Government", "value": "';
        attrParts[11] = parts[11];
        attrParts[12] = '" }, { "trait_type": "Realm", "value": "';
        attrParts[13] = parts[13];
        attrParts[14] = '" }]';
        return attrParts;
    }

    function getSettlementSize(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _sizes[attrIndex[tokenId].size];
    }

    function getSettlementSpirit(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _spirits[attrIndex[tokenId].spirit];
    }

    function getSettlementAge(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _ages[attrIndex[tokenId].age];
    }

    function getSettlementResource(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _resources[attrIndex[tokenId].resource];
    }

    function getSettlementMorale(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _morales[attrIndex[tokenId].morale];
    }

    function getSettlementGovernment(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _governments[attrIndex[tokenId].government];
    }

    function getSettlementRealm(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");
        return _realms[attrIndex[tokenId].turns];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");

        string[15] memory parts = _makeParts(tokenId);
        string[15] memory attributesParts = _makeAttributeParts(parts);

        string memory output = string(
            abi.encodePacked(
                parts[0],
                parts[1],
                parts[2],
                parts[3],
                parts[4],
                parts[5],
                parts[6],
                parts[7],
                parts[8]
            )
        );
        output = string(
            abi.encodePacked(
                output,
                parts[9],
                parts[10],
                parts[11],
                parts[12],
                parts[13],
                parts[14]
            )
        );

        string memory atrrOutput = string(
            abi.encodePacked(
                attributesParts[0],
                attributesParts[1],
                attributesParts[2],
                attributesParts[3],
                attributesParts[4],
                attributesParts[5],
                attributesParts[6],
                attributesParts[7],
                attributesParts[8]
            )
        );
        atrrOutput = string(
            abi.encodePacked(
                atrrOutput,
                attributesParts[9],
                attributesParts[10],
                attributesParts[11],
                attributesParts[12],
                attributesParts[13],
                attributesParts[14]
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Settlement #',
                        Strings.toString(tokenId),
                        '", "description": "Settlements are a turn based civilisation simulator stored entirely on chain, go forth and conquer.", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '"',
                        ',"attributes":',
                        atrrOutput,
                        "}"
                    )
                )
            )
        );
        output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return output;
    }

    function randomiseAttributes(uint256 tokenId, uint8 turn) internal {
        attrIndex[tokenId].size = generateAttribute(
            _getRandomSeed(tokenId, "size"),
            _sizes
        );
        attrIndex[tokenId].spirit = generateAttribute(
            _getRandomSeed(tokenId, "spirit"),
            _spirits
        );
        attrIndex[tokenId].age = generateAttribute(
            _getRandomSeed(tokenId, "age"),
            _ages
        );
        attrIndex[tokenId].resource = generateAttribute(
            _getRandomSeed(tokenId, "resource"),
            _resources
        );
        attrIndex[tokenId].morale = generateAttribute(
            _getRandomSeed(tokenId, "morale"),
            _morales
        );
        attrIndex[tokenId].government = generateAttribute(
            _getRandomSeed(tokenId, "government"),
            _governments
        );
        attrIndex[tokenId].turns = turn;
    }

    function randomise(uint256 tokenId) public nonReentrant {
        require(
            _exists(tokenId) &&
                msg.sender == ownerOf(tokenId) &&
                attrIndex[tokenId].turns < 5,
            "Settlement turns over"
        );
        randomiseAttributes(
            tokenId,
            uint8(SafeMath.add(attrIndex[tokenId].turns, 1))
        );
    }

    function getUnharvestedTokens(uint256 tokenId)
        public
        view
        returns (ERC20Mintable, uint256)
    {
        uint256 blockDelta = block.number - tokenIdToLastHarvest[tokenId];

        Attributes memory attributes = attrIndex[tokenId];
        ERC20Mintable tokenAddress = resourceTokenAddresses[
            attributes.resource
        ];

        if (blockDelta == 0 || !_exists(tokenId)) {
            return (tokenAddress, 0);
        }

        uint256 realmMultiplier = realmMultipliers[attributes.turns];
        uint256 civMultiplier = civMultipliers[attributes.size];
        uint256 tokensToMint = civMultiplier *
            blockDelta *
            ONE *
            realmMultiplier;

        return (tokenAddress, tokensToMint);
    }

    function harvest(uint256 tokenId) public {
        (
            ERC20Mintable tokenAddress,
            uint256 tokensToMint
        ) = getUnharvestedTokens(tokenId);

        tokenAddress.mint(ownerOf(tokenId), tokensToMint);

        tokenIdToLastHarvest[tokenId] = block.number;
    }

    function multiClaim(
        uint256[] calldata tokenIds,
        uint8[] calldata sizes,
        uint8[] calldata spirits,
        uint8[] calldata ages,
        uint8[] calldata resources,
        uint8[] calldata morales,
        uint8[] calldata governments,
        uint8[] calldata turns
    ) public nonReentrant {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            claim(
                tokenIds[i],
                sizes[i],
                spirits[i],
                ages[i],
                resources[i],
                morales[i],
                governments[i],
                turns[i]
            );
        }
    }

    function claim(
        uint256 tokenId,
        uint8 size,
        uint8 spirit,
        uint8 age,
        uint8 resource,
        uint8 morale,
        uint8 government,
        uint8 turns
    ) public nonReentrant {
        legacySettlements.transferFrom(msg.sender, address(this), tokenId);
        _safeMint(msg.sender, tokenId);
        attrIndex[tokenId] = Attributes(
            size,
            spirit,
            age,
            resource,
            morale,
            government,
            turns
        );
        bytes32 v2Uri = keccak256(abi.encodePacked(tokenURI(tokenId)));
        bytes32 legacyURI = keccak256(
            abi.encodePacked(legacySettlements.tokenURI(tokenId))
        );

        require(v2Uri == legacyURI, "Attributes don't match legacy contract");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
