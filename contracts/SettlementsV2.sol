// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/ISettlementsLegacy.sol";
import "./ERC20Mintable.sol";
import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
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

contract SettlementsV2 is
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable
{
    ISettlementsLegacy private legacySettlements;

    uint256 constant ONE = 10**18;
    uint8[] public civMultipliers;
    uint8[] public realmMultipliers;
    uint8[] public moralMultipliers;
    ERC20Mintable[] public resourceTokenAddresses;
    mapping(uint256 => uint256) public tokenIdToLastHarvest;

    string[] public _sizes;
    string[] public _spirits;
    string[] public _ages;
    string[] public _resources;
    string[] public _morales;
    string[] public _governments;
    string[] public _realms;

    function initialize(
        ISettlementsLegacy _legacyAddress,
        ERC20Mintable ironToken_,
        ERC20Mintable goldToken_,
        ERC20Mintable silverToken_,
        ERC20Mintable woodToken_,
        ERC20Mintable woolToken_,
        ERC20Mintable waterToken_,
        ERC20Mintable grassToken_,
        ERC20Mintable grainToken_
    ) public initializer {
        __Ownable_init();
        __ERC721_init("Settlements", "STL");

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

    function setAttributeOptions(
        string[] memory sizes,
        string[] memory spirits,
        string[] memory ages,
        string[] memory resources,
        string[] memory morales,
        string[] memory governments,
        string[] memory realms
    ) public onlyOwner {
        _sizes = sizes;
        _spirits = spirits;
        _ages = ages;
        _resources = resources;
        _morales = morales;
        _governments = governments;
        _realms = realms;
    }

    function setCivMultipliers(uint8[] memory civMultipliers_)
        public
        onlyOwner
    {
        civMultipliers = civMultipliers_;
    }

    function setRealmMultipliers(uint8[] memory realmMultipliers_)
        public
        onlyOwner
    {
        realmMultipliers = realmMultipliers_;
    }

    function setMoralMultipliers(uint8[] memory moralMultipliers_)
        public
        onlyOwner
    {
        moralMultipliers = moralMultipliers_;
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

    function _makeLegacyParts(uint256 tokenId)
        internal
        view
        returns (string[18] memory)
    {
        string[18] memory parts;

        parts[
            0
        ] = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.txt { fill: black; font-family: monospace; font-size: 12px;}</style><rect width="100%" height="100%" fill="white" /><text x="10" y="20" class="txt">';
        parts[1] = _sizes[attrIndex[tokenId].size];
        parts[2] = "40";
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

    function _makeLegacyAttributeParts(string[18] memory parts)
        internal
        pure
        returns (string[18] memory)
    {
        string[18] memory attrParts;
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

    function _makeParts(uint256 tokenId)
        internal
        view
        returns (string[18] memory)
    {
        string[18] memory parts;
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
        parts[14] = '</text><text x="10" y="160" class="txt">';
        parts[15] = string(
            abi.encodePacked(
                "$",
                resourceTokenAddresses[attrIndex[tokenId].resource].symbol(),
                ": "
            )
        );

        (
            ERC20Mintable __,
            uint256 unharvestedTokenAmount
        ) = getUnharvestedTokens(tokenId);

        parts[16] = Strings.toString(unharvestedTokenAmount / 10**18);
        parts[17] = "</text></svg>";
        return parts;
    }

    function _makeAttributeParts(string[18] memory parts, uint256 tokenId)
        internal
        view
        returns (string[18] memory)
    {
        string[18] memory attrParts;
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
        attrParts[14] = '" }, { "trait_type": ';
        attrParts[15] = string(
            abi.encodePacked(
                '"$',
                resourceTokenAddresses[attrIndex[tokenId].resource].symbol(),
                '", "value": '
            )
        );

        (
            ERC20Mintable __,
            uint256 unharvestedTokenAmount
        ) = getUnharvestedTokens(tokenId);

        attrParts[16] = string(
            abi.encodePacked(
                '"',
                Strings.toString(unharvestedTokenAmount / 10**18),
                '"'
            )
        );

        attrParts[17] = " }]";
        return attrParts;
    }

    function _oldTokenURI(uint256 tokenId)
        private
        view
        returns (string memory)
    {
        return _tokenURI(tokenId, true);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return _tokenURI(tokenId, false);
    }

    function _tokenURI(uint256 tokenId, bool useLegacy)
        private
        view
        returns (string memory)
    {
        require(_exists(tokenId), "Settlement does not exist");

        string[18] memory parts;
        string[18] memory attributesParts;
        if (useLegacy) {
            parts = _makeLegacyParts(tokenId);
            attributesParts = _makeLegacyAttributeParts(parts);
        } else {
            parts = _makeParts(tokenId);
            attributesParts = _makeAttributeParts(parts, tokenId);
        }

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
                parts[14],
                parts[15],
                parts[16]
            )
        );
        output = string(abi.encodePacked(output, parts[17]));

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

        atrrOutput = string(
            abi.encodePacked(
                atrrOutput,
                attributesParts[15],
                attributesParts[16],
                attributesParts[17]
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

    function randomise(uint256 tokenId) public {
        require(
            _exists(tokenId) &&
                msg.sender == ownerOf(tokenId) &&
                attrIndex[tokenId].turns < 5,
            "Settlement turns over"
        );

        harvest(tokenId);
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
        uint256 lastHarvest = tokenIdToLastHarvest[tokenId] > 0
            ? tokenIdToLastHarvest[tokenId]
            : block.number - 100;
        uint256 blockDelta = block.number - lastHarvest;

        Attributes memory attributes = attrIndex[tokenId];
        ERC20Mintable tokenAddress = resourceTokenAddresses[
            attributes.resource
        ];

        if (blockDelta == 0 || !_exists(tokenId)) {
            return (tokenAddress, 0);
        }

        uint256 realmMultiplier = realmMultipliers[attributes.turns];
        uint256 civMultiplier = civMultipliers[attributes.size];
        uint256 moralMultiplier = moralMultipliers[attributes.morale];
        uint256 tokensToMint = (civMultiplier *
            blockDelta *
            moralMultiplier *
            ONE *
            realmMultiplier) / 100;

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
        Attributes[] memory tokenAttributes
    ) public {
        for (uint256 i = 0; i < tokenAttributes.length; i++) {
            claim(tokenIds[i], tokenAttributes[i]);
        }
    }

    function claim(uint256 tokenId, Attributes memory attributes) public {
        legacySettlements.transferFrom(msg.sender, address(this), tokenId);
        _safeMint(msg.sender, tokenId);
        attrIndex[tokenId] = attributes;
        bytes32 v2Uri = keccak256(abi.encodePacked(_oldTokenURI(tokenId)));
        bytes32 legacyURI = keccak256(
            abi.encodePacked(legacySettlements.tokenURI(tokenId))
        );

        require(v2Uri == legacyURI, "Attributes don't match legacy contract");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
