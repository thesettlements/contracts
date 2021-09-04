// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./SettlementsLegacy.sol";
import "./ERC20Mintable.sol";
import "./TokenURI.sol";
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

// @author zeth and out.eth
// @notice This contract is heavily inspired by Dom Hofmann's Loot Project with game design from Sid Meirs Civilisation, DND, Settlers of Catan & Age of Empires.

// Settlements allows for the creation of settlements of which users have 5 turns to create their perfect civ.
// Randomise will pseduo randomly assign a settlement a new set of attributes & increase their turn count.
// An allocation of 100 settlements are reserved for owner & future expansion packs

contract SettlementsV2 is
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable
{
    SettlementsLegacy public legacySettlements;
    TokenURI public tokenURIHelperContract;

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
        SettlementsLegacy _legacyAddress,
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
        __ERC721Enumerable_init();

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

    function setTokenURIHelper(TokenURI tokenURIHelperContract_)
        public
        onlyOwner
    {
        tokenURIHelperContract = tokenURIHelperContract_;
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

    function setMultipliers(
        uint8[] memory civMultipliers_,
        uint8[] memory realmMultipliers_,
        uint8[] memory moralMultipliers_
    ) public onlyOwner {
        civMultipliers = civMultipliers_;
        realmMultipliers = realmMultipliers_;
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

        TokenURI.TokenURIInput memory tokenURIInput;

        tokenURIInput.size = _sizes[attrIndex[tokenId].size];
        tokenURIInput.spirit = _spirits[attrIndex[tokenId].spirit];
        tokenURIInput.age = _ages[attrIndex[tokenId].age];
        tokenURIInput.resource = _resources[attrIndex[tokenId].resource];
        tokenURIInput.morale = _morales[attrIndex[tokenId].morale];
        tokenURIInput.government = _governments[attrIndex[tokenId].government];
        tokenURIInput.realm = _realms[attrIndex[tokenId].turns];

        ERC20Mintable tokenContract = resourceTokenAddresses[0];
        console.log("my contract", address(tokenContract));
        uint256 unharvestedTokenAmount = 0;

        if (useLegacy == false) {
            (tokenContract, unharvestedTokenAmount) = getUnharvestedTokens(
                tokenId
            );
        }

        console.log("my contract", address(tokenContract));

        string memory output = tokenURIHelperContract.tokenURI(
            tokenURIInput,
            unharvestedTokenAmount,
            tokenContract.symbol(),
            useLegacy,
            tokenId
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
        randomiseAttributes(tokenId, attrIndex[tokenId].turns + 1);
    }

    function getUnharvestedTokens(uint256 tokenId)
        public
        view
        returns (ERC20Mintable, uint256)
    {
        uint256 lastHarvest = tokenIdToLastHarvest[tokenId];
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

        tokenIdToLastHarvest[tokenId] = block.number;
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
}
